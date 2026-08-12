import Fuse from 'fuse.js'

const GH_PAGES_FALLBACK = 'https://mikelninh.github.io/gitlaw/'
const PUBLIC_BASE = import.meta.env.BASE_URL || '/'

interface LawIndexEntry {
  id: string
  title: string
  abbreviation: string
  file: string
}

interface BgbBlock {
  law: string
  section: string
  sectionNumber: string
  text: string
}

export interface MietrechtSource {
  law: string
  section: string
  excerpt: string
  reason: string
  officialUrl: string
}

export interface MietrechtResearchResult {
  answer: string
  sources: MietrechtSource[]
  limitations: string[]
  retrievalSignal: 'strong' | 'mixed' | 'weak'
  durationMs: number
}

interface TopicHint {
  id: string
  label: string
  terms: string[]
  sections: string[]
}

const topicHints: TopicHint[] = [
  {
    id: 'rent-increase',
    label: 'Mieterhöhung',
    terms: ['mieterhöhung', 'mieterhoehung', 'miete erhöhen', 'miete erhoehen', 'mieterhoehen', 'mietspiegel', 'vergleichsmiete'],
    sections: ['558', '558a', '558b', '558c', '558d'],
  },
  {
    id: 'own-use',
    label: 'Eigenbedarf und Kündigungsschutz',
    terms: ['eigenbedarf', 'eigenbedarfskündigung', 'eigenbedarfskuendigung'],
    sections: ['573', '573c', '574', '574a', '574b'],
  },
  {
    id: 'deposit',
    label: 'Mietkaution',
    terms: ['kaution', 'mietkaution', 'kaution zurück', 'kaution zurueck'],
    sections: ['551'],
  },
  {
    id: 'defect',
    label: 'Mangel und Mietminderung',
    terms: ['mietminderung', 'mangel', 'schimmel', 'heizung', 'warmwasser', 'wasserschaden', 'miete kürzen', 'miete kuerzen'],
    sections: ['535', '536', '536a', '536b', '536c'],
  },
  {
    id: 'service-charge',
    label: 'Betriebs- und Nebenkosten',
    terms: ['nebenkosten', 'betriebskosten', 'nebenkostenabrechnung', 'betriebskostenabrechnung'],
    sections: ['556', '556a', '556b', '556c'],
  },
  {
    id: 'termination',
    label: 'Kündigung des Mietverhältnisses',
    terms: ['kündigung', 'kuendigung', 'kündigen', 'kuendigen', 'rauswerfen', 'rausschmeißen', 'rausschmeissen'],
    sections: ['568', '569', '573', '573c', '574'],
  },
  {
    id: 'modernisation',
    label: 'Modernisierung',
    terms: ['modernisierung', 'modernisieren', 'sanierung', 'energetisch'],
    sections: ['555b', '555c', '559', '559a', '559b'],
  },
  {
    id: 'sublet',
    label: 'Untervermietung',
    terms: ['untervermietung', 'untervermieten', 'untermieter', 'wg zimmer', 'wg-zimmer'],
    sections: ['540', '553'],
  },
  {
    id: 'rent-brake',
    label: 'Mietpreisbremse',
    terms: ['mietpreisbremse', 'zu hohe miete', 'anfangsmiete'],
    sections: ['556d', '556e', '556f', '556g'],
  },
  {
    id: 'payment',
    label: 'Mietzahlung',
    terms: ['miete zahlen', 'mietrückstand', 'mietrueckstand', 'zahlungsverzug'],
    sections: ['556b', '543', '569'],
  },
]

function publicPath(path: string) {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isOnGhPages = host.includes('mikelninh.github.io')
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (!isOnGhPages && !isLocal && (path.startsWith('laws/') || path === 'law-index.json')) {
      return `${GH_PAGES_FALLBACK}${path}`
    }
  }
  return `${PUBLIC_BASE}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

function normalize(text: string) {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseBlock(raw: string): BgbBlock | null {
  const clean = raw.startsWith('### ') ? raw : `### ${raw}`
  const firstLine = clean.split('\n')[0]?.replace(/^###\s*/, '').trim() || ''
  const sectionMatch = firstLine.match(/§\s*(\d+[a-z]?)/i)
  if (!sectionMatch) return null
  const number = sectionMatch[1].toLowerCase()
  const numeric = Number.parseInt(number, 10)
  // BGB Book 2, Title 5: tenancy/lease provisions. We deliberately keep the
  // pilot narrow instead of pretending to research every field of law.
  if (!Number.isFinite(numeric) || numeric < 535 || numeric > 580) return null
  return {
    law: 'BGB',
    section: firstLine,
    sectionNumber: number,
    text: cleanMarkdown(clean),
  }
}

let cachedBgbBlocks: BgbBlock[] | null = null

async function loadBgbBlocks(): Promise<BgbBlock[]> {
  if (cachedBgbBlocks) return cachedBgbBlocks

  let filename = 'bgb.md'
  try {
    const indexResp = await fetch(publicPath('law-index.json'))
    if (indexResp.ok) {
      const index = await indexResp.json() as LawIndexEntry[]
      const bgb = index.find(item => item.id === 'bgb' || item.abbreviation === 'BGB')
      if (bgb?.file) filename = bgb.file
    }
  } catch {
    // bgb.md is the canonical fallback filename in the repository.
  }

  const response = await fetch(publicPath(`laws/${filename}`))
  if (!response.ok) throw new Error(`BGB corpus unavailable (${response.status})`)
  const markdown = await response.text()
  if (!markdown.trim()) throw new Error('BGB corpus is empty')

  cachedBgbBlocks = markdown
    .split(/\n###\s+/g)
    .map((block, index) => index === 0 ? block : `### ${block}`)
    .map(parseBlock)
    .filter((block): block is BgbBlock => Boolean(block))

  if (cachedBgbBlocks.length === 0) throw new Error('No Mietrecht sections found in BGB corpus')
  return cachedBgbBlocks
}

function matchedTopics(question: string) {
  const q = normalize(question)
  return topicHints.filter(topic => topic.terms.some(term => q.includes(normalize(term))))
}

function officialUrl(sectionNumber: string) {
  return `https://www.gesetze-im-internet.de/bgb/__${sectionNumber}.html`
}

function buildLimitations(question: string, topics: TopicHint[]): string[] {
  const q = normalize(question)
  const limits = [
    'Die Antwort nutzt hier nur gefundene BGB-Stellen. Vertrag, Schreiben und Beweise wurden nicht geprüft.',
  ]

  if (topics.some(topic => topic.id === 'rent-increase' || topic.id === 'rent-brake') || q.includes('mietspiegel')) {
    limits.push('Bei Miethöhe können örtlicher Mietspiegel, Landesrecht und konkrete Vertragsdaten entscheidend sein.')
  }

  if (['kaution', 'besichtigung', 'betreten', 'haustier', 'schoenheitsreparatur', 'schönheitsreparatur'].some(term => q.includes(normalize(term)))) {
    limits.push('Zu dieser Frage ist Rechtsprechung oft wichtig. Der Pilot durchsucht heute bewusst nur den BGB-Kern und kann deshalb entscheidende Urteile übersehen.')
  }

  if (q.includes('frist') || q.includes('wann') || q.includes('tage') || q.includes('monate')) {
    limits.push('Fristen hängen häufig von Zugang, Vertragsdaten und dem konkreten Schreiben ab; diese Fakten kennt GitLaw hier noch nicht.')
  }

  return limits
}

export async function retrieveMietrechtSources(question: string): Promise<{
  sources: MietrechtSource[]
  retrievalSignal: 'strong' | 'mixed' | 'weak'
  limitations: string[]
}> {
  const blocks = await loadBgbBlocks()
  const topics = matchedTopics(question)
  const preferredNumbers = new Set(topics.flatMap(topic => topic.sections).map(section => section.toLowerCase()))

  const preferred = blocks.filter(block => preferredNumbers.has(block.sectionNumber))
  const fuse = new Fuse(blocks, {
    keys: [
      { name: 'section', weight: 0.35 },
      { name: 'text', weight: 0.65 },
    ],
    includeScore: true,
    threshold: 0.55,
    ignoreLocation: true,
    minMatchCharLength: 3,
  })

  const fuzzy = fuse.search(question).slice(0, 8).map(result => result.item)
  const combined = [...preferred, ...fuzzy]
    .filter((item, index, all) => all.findIndex(candidate => candidate.sectionNumber === item.sectionNumber) === index)
    .slice(0, 5)

  const sources = combined.map(block => {
    const directTopic = topics.find(topic => topic.sections.some(section => section.toLowerCase() === block.sectionNumber))
    return {
      law: block.law,
      section: block.section,
      excerpt: block.text.slice(0, 760),
      reason: directTopic
        ? `Direkter Themen-Treffer: ${directTopic.label}`
        : 'Textähnlichkeit zwischen deiner Frage und dieser BGB-Stelle',
      officialUrl: officialUrl(block.sectionNumber),
    }
  })

  const retrievalSignal: 'strong' | 'mixed' | 'weak' =
    topics.length > 0 && sources.length >= 2 ? 'strong' : sources.length >= 2 ? 'mixed' : 'weak'

  return {
    sources,
    retrievalSignal,
    limitations: buildLimitations(question, topics),
  }
}

export async function askMietrechtResearchQuestion(question: string): Promise<MietrechtResearchResult> {
  const started = performance.now()
  const retrieval = await retrieveMietrechtSources(question)

  if (retrieval.sources.length === 0) {
    return {
      answer: 'GitLaw hat im begrenzten Mietrechtskorpus keine belastbare Quelle gefunden. Das ist ein Stop-Signal, kein Anlass zum Raten.',
      sources: [],
      limitations: retrieval.limitations,
      retrievalSignal: 'weak',
      durationMs: Math.round(performance.now() - started),
    }
  }

  const context = retrieval.sources
    .map((source, index) => `[Quelle ${index + 1}: ${source.law} — ${source.section}]\n${source.excerpt}`)
    .join('\n\n---\n\n')

  const apiUrl = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
  const response = await fetch(`${apiUrl}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context,
      sources: retrieval.sources.map(source => ({ law: source.law, section: source.section })),
      limitations: retrieval.limitations,
      mode: 'grounded-research',
      scope: 'mietrecht',
      history: [],
    }),
  })

  if (!response.ok) {
    throw new Error(`Grounded answer unavailable (${response.status})`)
  }

  const data = await response.json()
  return {
    answer: data.answer || 'Keine belastbare Antwort erzeugt.',
    sources: retrieval.sources,
    limitations: retrieval.limitations,
    retrievalSignal: retrieval.retrievalSignal,
    durationMs: Math.round(performance.now() - started),
  }
}
