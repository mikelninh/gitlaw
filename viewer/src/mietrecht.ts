import Fuse from 'fuse.js'

const GH_PAGES_BASE = 'https://mikelninh.github.io/gitlaw/'
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

interface ExplanationFile {
  explanations?: Record<string, string>
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

// Order matters: specific intents come before broad fallbacks.
// Section order is also intentional: the most useful statutory anchor comes first.
const topicHints: TopicHint[] = [
  {
    id: 'rent-increase',
    label: 'Mieterhöhung',
    terms: [
      'mieterhöhung', 'mieterhoehung', 'mieterhöhungsverlangen', 'mieterhoehungsverlangen',
      'miete erhöhen', 'miete erhoehen', 'erhöhen', 'erhoehen', 'erhöht', 'erhoeht',
      'kappungsgrenze', 'mietspiegel', 'vergleichsmiete', '20 %', '20 prozent',
    ],
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
    terms: ['kaution', 'mietkaution', 'mietsicherheit', 'kaution zurück', 'kaution zurueck'],
    sections: ['551'],
  },
  {
    id: 'defect-notice',
    label: 'Mängelanzeige',
    terms: [
      'mängelanzeige', 'maengelanzeige', 'mangel melden', 'schimmel melden',
      'wasserschaden entdeckt', 'vermieter sofort informieren', 'vermieter informieren',
    ],
    sections: ['536c', '536', '536a'],
  },
  {
    id: 'defect',
    label: 'Mangel und Mietminderung',
    terms: [
      'mietminderung', 'miete mindern', 'mangel', 'schimmel', 'heizung', 'warmwasser',
      'wasserschaden', 'miete kürzen', 'miete kuerzen',
    ],
    sections: ['536', '536c', '536a', '535', '536b'],
  },
  {
    id: 'service-charge',
    label: 'Betriebs- und Nebenkosten',
    terms: ['nebenkosten', 'betriebskosten', 'nebenkostenabrechnung', 'betriebskostenabrechnung'],
    sections: ['556', '556a', '556b', '556c'],
  },
  {
    id: 'sublet',
    label: 'Untervermietung',
    terms: ['untervermietung', 'untervermieten', 'untermieter', 'wg zimmer', 'wg-zimmer'],
    sections: ['553', '540'],
  },
  {
    id: 'rent-arrears',
    label: 'Mietrückstand und fristlose Kündigung',
    terms: [
      'mietrückstand', 'mietrueckstand', 'mietschulden', 'zahlungsverzug',
      'zwei monatsmieten', 'miete im rückstand', 'miete im rueckstand',
    ],
    sections: ['543', '569', '556b'],
  },
  {
    id: 'rent-payment',
    label: 'Fälligkeit der Miete',
    terms: [
      'miete zahlen', 'monatsmiete', 'miete fällig', 'miete faellig',
      'wann muss ich meine miete', 'mietzahlung',
    ],
    sections: ['556b'],
  },
  {
    id: 'modernisation-rent',
    label: 'Mieterhöhung nach Modernisierung',
    terms: [
      'modernisierung mieterhöhung', 'modernisierung mieterhoehung',
      'mieterhöhung nach modernisierung', 'mieterhoehung nach modernisierung',
      'modernisierungsumlage', 'nach einer modernisierung soll meine miete steigen',
    ],
    sections: ['559', '559b', '559a', '555b'],
  },
  {
    id: 'modernisation-notice',
    label: 'Modernisierungsankündigung',
    terms: [
      'modernisierung angekündigt', 'modernisierung angekuendigt',
      'modernisierungsankündigung', 'modernisierungsankuendigung',
      'ankündigung der modernisierung', 'ankuendigung der modernisierung',
    ],
    sections: ['555c', '555b'],
  },
  {
    id: 'modernisation',
    label: 'Modernisierung',
    terms: ['modernisierung', 'modernisieren', 'sanierung', 'energetisch'],
    sections: ['555b', '555c', '559', '559a', '559b'],
  },
  {
    id: 'rent-brake',
    label: 'Mietpreisbremse',
    terms: ['mietpreisbremse', 'zu hohe miete', 'miete zu teuer', 'zu teuer', 'anfangsmiete', 'mietbeginn', 'euro für', 'euro fuer', 'nettokaltmiete', 'quadratmeter'],
    sections: ['556d', '556e', '556f', '556g'],
  },
  {
    id: 'tenant-termination',
    label: 'Kündigung durch den Mieter',
    terms: [
      'als mieter kündigen', 'als mieter kuendigen', 'ich will als mieter kündigen',
      'ich will als mieter kuendigen', 'kündigungsfrist mieter', 'kuendigungsfrist mieter',
    ],
    sections: ['573c', '568'],
  },
  {
    id: 'termination',
    label: 'Kündigung des Mietverhältnisses',
    terms: [
      'kündigung', 'kuendigung', 'kündigen', 'kuendigen', 'gekündigt', 'gekuendigt',
      'rauswerfen', 'rausschmeißen', 'rausschmeissen',
    ],
    sections: ['568', '569', '573', '573c', '574'],
  },
]

function normalize(text: string) {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function termMatches(question: string, term: string) {
  const q = ` ${normalize(question)} `
  const needle = ` ${normalize(term)} `
  return q.includes(needle)
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalPublicUrl(path: string) {
  const clean = path.replace(/^\/+/, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'mikelninh.github.io' || host.endsWith('.vercel.app')) {
      return `${GH_PAGES_BASE}${clean}`
    }
  }
  return `${PUBLIC_BASE}${clean}`.replace(/([^:]\/)\/+/g, '$1')
}

async function fetchPublic(path: string) {
  const primary = canonicalPublicUrl(path)
  const fallback = `${GH_PAGES_BASE}${path.replace(/^\/+/, '')}`
  const urls = primary === fallback ? [primary] : [primary, fallback]
  let lastStatus = 0

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      lastStatus = response.status
      if (response.ok) return response
    } catch {
      // Try the canonical GitHub Pages copy next.
    }
  }

  throw new Error(`Public corpus unavailable (${lastStatus || 'network'})`)
}

function parseBlock(raw: string): BgbBlock | null {
  const clean = raw.startsWith('### ') ? raw : `### ${raw}`
  const firstLine = clean.split('\n')[0]?.replace(/^###\s*/, '').trim() || ''
  const sectionMatch = firstLine.match(/§\s*(\d+[a-z]?)/i)
  if (!sectionMatch) return null
  const number = sectionMatch[1].toLowerCase()
  const numeric = Number.parseInt(number, 10)
  if (!Number.isFinite(numeric) || numeric < 535 || numeric > 580) return null
  return { law: 'BGB', section: firstLine, sectionNumber: number, text: cleanMarkdown(clean) }
}

let cachedBgbBlocks: BgbBlock[] | null = null
let cachedExplanations: Record<string, string> | null = null

async function loadBgbBlocks(): Promise<BgbBlock[]> {
  if (cachedBgbBlocks) return cachedBgbBlocks

  let filename = 'bgb.md'
  try {
    const indexResp = await fetchPublic('law-index.json')
    const index = await indexResp.json() as LawIndexEntry[]
    const bgb = index.find(item => item.id === 'bgb' || item.abbreviation === 'BGB')
    if (bgb?.file) filename = bgb.file
  } catch {
    // bgb.md is the canonical fallback filename.
  }

  const response = await fetchPublic(`laws/${filename}`)
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

async function loadExplanations(): Promise<Record<string, string>> {
  if (cachedExplanations) return cachedExplanations
  try {
    const response = await fetchPublic('explanations/bgb.json')
    const data = await response.json() as ExplanationFile
    cachedExplanations = data.explanations || {}
  } catch {
    cachedExplanations = {}
  }
  return cachedExplanations
}

function matchedTopics(question: string) {
  return topicHints.filter(topic => topic.terms.some(term => termMatches(question, term)))
}

function officialUrl(sectionNumber: string) {
  return `https://www.gesetze-im-internet.de/bgb/__${sectionNumber}.html`
}

function buildLimitations(question: string, topics: TopicHint[]): string[] {
  const q = normalize(question)
  const limits = ['Die Recherche nutzt hier nur gefundene BGB-Stellen. Vertrag, Schreiben und Beweise wurden nicht geprüft.']

  if (topics.some(topic => topic.id === 'rent-increase' || topic.id === 'rent-brake') || q.includes('mietspiegel')) {
    limits.push('Bei Miethöhe können örtlicher Mietspiegel, Landesrecht und konkrete Vertragsdaten entscheidend sein.')
  }
  if (['kaution', 'besichtigung', 'betreten', 'haustier', 'schoenheitsreparatur'].some(term => q.includes(normalize(term)))) {
    limits.push('Zu dieser Frage ist Rechtsprechung oft wichtig. Der Pilot durchsucht heute bewusst nur den BGB-Kern und kann deshalb entscheidende Urteile übersehen.')
  }
  if (q.includes('frist') || q.includes('wann') || q.includes('tage') || q.includes('monate')) {
    limits.push('Fristen hängen häufig von Zugang, Vertragsdaten und dem konkreten Schreiben ab; diese Fakten kennt GitLaw hier noch nicht.')
  }
  return limits
}

function orderedPreferredBlocks(blocks: BgbBlock[], topics: TopicHint[]) {
  const bySection = new Map(blocks.map(block => [block.sectionNumber, block]))
  const orderedNumbers = topics
    .flatMap(topic => topic.sections.map(section => section.toLowerCase()))
    .filter((section, index, all) => all.indexOf(section) === index)

  return orderedNumbers
    .map(section => bySection.get(section))
    .filter((block): block is BgbBlock => Boolean(block))
}

export async function retrieveMietrechtSources(question: string): Promise<{
  sources: MietrechtSource[]
  retrievalSignal: 'strong' | 'mixed' | 'weak'
  limitations: string[]
}> {
  const blocks = await loadBgbBlocks()
  const topics = matchedTopics(question)

  // Real-user lesson #1: if we know the legal topic, do not pad the answer with
  // fuzzy-but-irrelevant sections just to display five sources. Precision first.
  let selected: BgbBlock[] = []
  if (topics.length > 0) {
    selected = orderedPreferredBlocks(blocks, topics).slice(0, 5)
  } else {
    const fuse = new Fuse(blocks, {
      keys: [{ name: 'section', weight: 0.35 }, { name: 'text', weight: 0.65 }],
      includeScore: true,
      threshold: 0.38,
      ignoreLocation: true,
      minMatchCharLength: 4,
    })

    // Unknown topic: only keep genuinely close fuzzy results and show at most 3.
    selected = fuse.search(question)
      .filter(result => (result.score ?? 1) <= 0.38)
      .slice(0, 3)
      .map(result => result.item)
  }

  const sources = selected.map(block => {
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

  return {
    sources,
    retrievalSignal: topics.length > 0 && sources.length > 0 ? 'strong' : sources.length > 0 ? 'mixed' : 'weak',
    limitations: buildLimitations(question, topics),
  }
}

function sectionNumber(section: string) {
  return section.match(/§\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase() || ''
}

async function sourceFirstAnswer(sources: MietrechtSource[]) {
  const explanations = await loadExplanations()
  const summaries = sources.slice(0, 3).map(source => {
    const number = sectionNumber(source.section)
    const key = Object.keys(explanations).find(candidate => candidate.toLowerCase().startsWith(`§ ${number} `))
    const explanation = key ? explanations[key] : ''
    const short = (explanation || source.excerpt).replace(/\s+/g, ' ').trim().slice(0, 280)
    return `• ${source.section}: ${short}${short.length >= 280 ? '…' : ''}`
  })

  return [
    'GitLaw hat diese BGB-Stellen als Ausgangspunkt gefunden. Die Kurzfassung unten stammt direkt aus hinterlegten Gesetzeserklärungen oder dem Originaltext:',
    '',
    ...summaries,
    '',
    'Öffne die Quellen unten für den Originaltext. Wenn eine wichtige Norm fehlt, markiere „Fehlt etwas“ — genau daraus bauen wir die nächsten Regressionstests.',
  ].join('\n')
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

  try {
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

    if (response.ok) {
      const data = await response.json()
      return {
        answer: data.answer || await sourceFirstAnswer(retrieval.sources),
        sources: retrieval.sources,
        limitations: retrieval.limitations,
        retrievalSignal: retrieval.retrievalSignal,
        durationMs: Math.round(performance.now() - started),
      }
    }
  } catch {
    // Source-first mode below keeps the research desk useful without model availability.
  }

  return {
    answer: await sourceFirstAnswer(retrieval.sources),
    sources: retrieval.sources,
    limitations: [...retrieval.limitations, 'Quellenmodus: Es wurde keine zusätzliche Modell-Erklärung verwendet; angezeigt werden verifizierte BGB-Quellen und hinterlegte Kurzfassungen.'],
    retrievalSignal: retrieval.retrievalSignal,
    durationMs: Math.round(performance.now() - started),
  }
}
