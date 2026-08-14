import { useState } from 'react'
import { ArrowLeft, ExternalLink, FileSearch, MessageCircle, Scale, Search } from 'lucide-react'
import { askMietrechtResearchQuestion, type MietrechtResearchResult } from './mietrecht'

const examples = [
  'Ist meine Miete in Friedrichshain zu teuer? 2.000 Euro für 50 qm2.',
  'Mein Vermieter will die Miete um 20 % erhöhen. Das Schreiben kam gestern.',
  'Mein Vermieter kündigt wegen Eigenbedarf. Welche Möglichkeiten habe ich?',
  'Meine Kaution ist nach dem Auszug noch nicht zurückgezahlt.',
  'Meine Nebenkostenabrechnung ist viel höher als im Vorjahr.',
  'In meiner Wohnung ist Schimmel. Was sollte ich zuerst tun?',
]

type Rating = 'helpful' | 'partial' | 'missing'

interface PilotRecord {
  id: string
  createdAt: string
  question: string
  rating: Rating
  note: string
  retrievalSignal: MietrechtResearchResult['retrievalSignal']
  durationMs: number
  sources: { law: string; section: string }[]
}

interface DecisionOption {
  title: string
  text: string
  sourceNumbers?: string[]
}

interface DecisionSupport {
  topic: string
  summary: string
  urgency: string
  today: string
  avoid: string
  documents: string[]
  options: DecisionOption[]
  missingFacts: string[]
  note: string
}

function feedbackApiUrl() {
  const apiBase = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
  return `${apiBase}/api/research-feedback`
}

function signalLabel(signal: MietrechtResearchResult['retrievalSignal']) {
  if (signal === 'strong') return 'Thema klar erkannt'
  if (signal === 'mixed') return 'Mögliche Einordnung'
  return 'Noch zu wenig Sicherheit'
}

function normalizeQuestion(text: string) {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function sourceNumber(section: string) {
  return section.match(/§\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase() || ''
}

function sourceRefs(result: MietrechtResearchResult, requested: string[] = []) {
  const wanted = new Set(requested.map(value => value.toLowerCase()))
  return result.sources
    .filter(source => wanted.size === 0 || wanted.has(sourceNumber(source.section)))
    .map(source => source.section.split('—')[0].trim())
    .filter((value, index, all) => all.indexOf(value) === index)
}

function rentPerSquareMetre(question: string) {
  const amountMatch = question.match(/(\d[\d.\s]*(?:,\d{1,2})?)\s*(?:€|euro)/i)
  const areaMatch = question.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m²|qm2?|m2)/i)
  if (!amountMatch || !areaMatch) return null
  const amount = Number(amountMatch[1].replace(/[.\s]/g, '').replace(',', '.'))
  const area = Number(areaMatch[1].replace(',', '.'))
  if (!Number.isFinite(amount) || !Number.isFinite(area) || area <= 0) return null
  return {
    amount,
    area,
    perSquareMetre: amount / area,
  }
}

function buildDecisionSupport(question: string, result: MietrechtResearchResult): DecisionSupport {
  const q = normalizeQuestion(question)

  if (['mietpreisbremse', 'zu hohe miete', 'miete zu teuer', 'zu teuer', 'anfangsmiete', 'euro fuer'].some(term => q.includes(term))) {
    const rentFacts = rentPerSquareMetre(question)
    const calculation = rentFacts
      ? ` Aus den genannten Werten ergeben sich rechnerisch ${rentFacts.perSquareMetre.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €/m² — aber nur dann als relevanter Vergleichswert, wenn ${rentFacts.amount.toLocaleString('de-DE')} € die Nettokaltmiete für ${rentFacts.area.toLocaleString('de-DE')} m² sind.`
      : ''

    return {
      topic: 'Miete möglicherweise zu hoch',
      summary: `Die Miethöhe wirkt prüfenswert. Ein hoher Betrag allein beweist aber noch keinen Verstoß gegen die Mietpreisbremse.${calculation} Entscheidend sind Mietbeginn, Nettokaltmiete, Mietspiegel und mögliche Ausnahmen.`,
      urgency: 'Prüfenswert — noch keine Aussage zur rechtlichen Zulässigkeit',
      today: 'Kläre zuerst, ob der genannte Betrag die Nettokalt- oder Warmmiete ist. Lege dann Mietvertrag, Mietbeginn, Wohnfläche, Lage und Baujahr bereit.',
      avoid: 'Vergleiche die Warmmiete nicht direkt mit dem Mietspiegel und behandle den Quadratmeterpreis allein nicht als Beweis für eine zulässige oder unzulässige Miete.',
      documents: ['Mietvertrag', 'Aufschlüsselung von Kaltmiete und Nebenkosten', 'Wohnfläche und Baujahr', 'Angaben zur Vormiete', 'Mietspiegelmerkmale'],
      options: [
        {
          title: '1. Vergleichswert sauber bestimmen',
          text: 'Der erste belastbare Schritt ist die Nettokaltmiete pro Quadratmeter. Betriebskosten, Möblierung und weitere Zuschläge müssen getrennt betrachtet werden.',
          sourceNumbers: ['556d'],
        },
        {
          title: '2. Mietbeginn und mögliche Ausnahmen prüfen',
          text: 'Für die Mietpreisbremse können insbesondere der Zeitpunkt des Mietbeginns, die Vormiete sowie Neubau oder umfassende Modernisierung entscheidend sein.',
          sourceNumbers: ['556e', '556f'],
        },
        {
          title: '3. Mit Mietspiegeldaten konkret vergleichen',
          text: 'Lage, Baujahr, Größe und Ausstattung bestimmen den relevanten Vergleich. Erst mit diesen Angaben wird aus dem auffälligen Preis ein prüfbarer Fall.',
          sourceNumbers: ['556d'],
        },
      ],
      missingFacts: [
        'Sind die genannten 2.000 Euro Warmmiete oder Nettokaltmiete?',
        'Wann begann das Mietverhältnis?',
        'Wie lautet die genaue Wohnfläche, Lage und das Baujahr?',
        'Ist die Wohnung möbliert, ein Neubau oder umfassend modernisiert?',
        'Ist die Vormiete bekannt?',
      ],
      note: 'GitLaw berechnet erkennbare Werte deterministisch und nutzt RAG für die gesetzlichen Ausgangspunkte. Eine belastbare Mietspiegelprüfung benötigt zusätzliche Wohnungsmerkmale.',
    }
  }

  if (['mieterhoehung', 'miete um 20', 'miete erhoehen', 'kappungsgrenze', 'vergleichsmiete'].some(term => q.includes(term))) {
    return {
      topic: 'Mieterhöhung',
      summary: 'Das klingt nach einem Mieterhöhungsverlangen. Aus „20 %“ allein folgt noch nicht, ob die Erhöhung zulässig ist. Entscheidend sind unter anderem Vergleichsmiete bzw. Kappungsgrenze, der zeitliche Verlauf und die Begründung des Schreibens.',
      urgency: 'Nicht vorschnell zustimmen',
      today: 'Lege das Erhöhungsschreiben, die bisherige und die verlangte Nettokaltmiete sowie das Datum der letzten Erhöhung bereit. Damit lässt sich der Fall konkret prüfen.',
      avoid: 'Stimme der Erhöhung nicht vorschnell zu und behandle die 20 % nicht allein als Beweis dafür, dass sie zulässig oder unzulässig ist.',
      documents: ['Mieterhöhungsschreiben', 'Mietvertrag', 'Letzte Mieterhöhung', 'Aktuelle Nettokaltmiete', 'Mietspiegel oder Begründung des Vermieters'],
      options: [
        {
          title: '1. Nicht nur auf die 20 % schauen',
          text: 'Der sinnvollste erste Schritt ist, die Voraussetzungen der Erhöhung einzuordnen, bevor du zustimmst. GitLaw hat dafür insbesondere die Regeln zur Vergleichsmiete, Kappungsgrenze und Begründung gefunden.',
          sourceNumbers: ['558', '558a'],
        },
        {
          title: '2. Schreiben und Zeitpunkte gegen die Regeln halten',
          text: 'Für eine belastbarere Einschätzung braucht GitLaw das Datum des Schreibens, die bisherige und verlangte Nettokaltmiete sowie den Zeitpunkt der letzten Erhöhung. Die Zustimmung und der zeitliche Ablauf sind gesetzlich geregelt.',
          sourceNumbers: ['558b'],
        },
        {
          title: '3. Bei unklarer Begründung oder hohem Betrag prüfen lassen',
          text: 'Wenn Mietspiegel, Vertragsart oder Zahlen nicht eindeutig sind, ist der nächste sinnvolle Schritt eine konkrete Prüfung des Schreibens — zum Beispiel durch einen Mieterverein oder eine Rechtsberatung.',
        },
      ],
      missingFacts: [
        'Wann kam das Mieterhöhungsverlangen bei dir an?',
        'Wie hoch sind bisherige und verlangte Nettokaltmiete?',
        'Wann wurde die Miete zuletzt erhöht?',
        'Wo liegt die Wohnung und worauf stützt der Vermieter die Erhöhung?',
        'Gibt es eine Staffel- oder Indexmietvereinbarung?',
      ],
      note: 'Mit diesen Angaben kann GitLaw die Optionen enger einordnen; örtlicher Mietspiegel und Landesrecht können zusätzlich entscheidend sein.',
    }
  }

  if (['eigenbedarf', 'eigenbedarfskuendigung'].some(term => q.includes(term))) {
    return {
      topic: 'Eigenbedarfskündigung',
      summary: 'Das klingt nach einer ordentlichen Kündigung wegen Eigenbedarfs. Entscheidend ist nicht nur das Wort „Eigenbedarf“, sondern ob der Kündigungsgrund nachvollziehbar angegeben ist, welche Frist gilt und ob bei dir besondere Härtegründe eine Rolle spielen.',
      urgency: 'Zeitnah prüfen — hier können Fristen zählen',
      today: 'Sichere das vollständige Kündigungsschreiben und notiere, wann es angekommen ist. Prüfe außerdem, zu welchem Datum das Mietverhältnis enden soll.',
      avoid: 'Ignoriere das Schreiben nicht und triff keine endgültige Auszugsentscheidung, bevor Begründung, Frist und mögliche Härtegründe geprüft wurden.',
      documents: ['Kündigungsschreiben', 'Mietvertrag', 'Nachweis des Zugangsdatums', 'Angaben zur Wohndauer', 'Nachweise möglicher Härtegründe'],
      options: [
        {
          title: '1. Begründung der Kündigung einordnen',
          text: 'GitLaw sollte zuerst prüfen, wer die Wohnung benötigen soll und welcher Grund im Kündigungsschreiben genannt wird. Das BGB verlangt ein berechtigtes Interesse und die Angabe der Kündigungsgründe.',
          sourceNumbers: ['573'],
        },
        {
          title: '2. Kündigungsfrist bestimmen',
          text: 'Als Nächstes muss der Zugang der Kündigung und die Dauer des Mietverhältnisses berücksichtigt werden. Daraus lässt sich die relevante Kündigungsfrist einordnen.',
          sourceNumbers: ['573c'],
        },
        {
          title: '3. Härtegründe und Widerspruch als Option prüfen',
          text: 'Wenn der Auszug für dich oder deinen Haushalt eine besondere Härte bedeuten würde, kann ein Widerspruch gegen die Kündigung relevant sein. Das sollte anhand deiner konkreten Situation geprüft werden.',
          sourceNumbers: ['574', '574a', '574b'],
        },
      ],
      missingFacts: [
        'Wann ist die Kündigung bei dir angekommen und zu welchem Datum soll das Mietverhältnis enden?',
        'Wer soll laut Schreiben einziehen und wie wird der Bedarf begründet?',
        'Wie lange wohnst du bereits in der Wohnung?',
        'Gibt es gesundheitliche, familiäre oder andere besondere Härtegründe?',
        'Ist angemessener Ersatzwohnraum realistisch verfügbar?',
      ],
      note: 'Bei Kündigungen können Fristen und Einzelfall-Rechtsprechung entscheidend sein. Wenn eine Frist läuft, sollte die konkrete Kündigung zeitnah geprüft werden.',
    }
  }

  if (['kaution', 'mietkaution', 'mietsicherheit'].some(term => q.includes(term))) {
    return {
      topic: 'Mietkaution',
      summary: 'GitLaw findet § 551 BGB als gesetzlichen Ausgangspunkt für die Mietkaution. Für die entscheidende Frage, wann und in welcher Höhe nach dem Auszug zurückgezahlt werden muss, reicht diese Norm allein aber oft nicht: Übergabe, mögliche Forderungen und Rechtsprechung können entscheidend sein.',
      urgency: 'Einbehalt klären und Unterlagen sichern',
      today: 'Bitte den Vermieter um eine nachvollziehbare Abrechnung oder Begründung und sammle die Unterlagen zur Wohnungsübergabe.',
      avoid: 'Gehe nicht davon aus, dass § 551 allein eine feste Rückzahlungsfrist beantwortet. Übergabe, Gegenansprüche und Rechtsprechung können entscheidend sein.',
      documents: ['Mietvertrag', 'Nachweis der Kautionszahlung', 'Übergabeprotokoll', 'Fotos bei Auszug', 'Schriftverkehr und Betriebskostenabrechnungen'],
      options: [
        {
          title: '1. Klären, was der Vermieter überhaupt zurückhält',
          text: 'Bitte den Vermieter um eine konkrete Abrechnung oder Begründung, wenn noch nicht klar ist, weshalb die Kaution ganz oder teilweise einbehalten wird. So wird aus „Kaution fehlt“ ein prüfbarer Sachverhalt.',
          sourceNumbers: ['551'],
        },
        {
          title: '2. Übergabe und mögliche Gegenansprüche zusammentragen',
          text: 'Übergabeprotokoll, Fotos, Schriftverkehr, offene Betriebskosten und behauptete Schäden können die Einschätzung verändern. Diese Informationen sollte GitLaw als Nächstes kennen.',
        },
        {
          title: '3. Rückzahlungsfrage mit Rechtsprechung prüfen',
          text: 'Der aktuelle Pilot durchsucht bewusst nur den BGB-Kern. Wenn der Vermieter nicht nachvollziehbar abrechnet oder bereits längere Zeit vergangen ist, braucht dieser Punkt eine rechtsprechungsbasierte Prüfung.',
        },
      ],
      missingFacts: [
        'Wann war Auszug und Schlüsselübergabe?',
        'Gab es ein Übergabeprotokoll oder dokumentierte Schäden?',
        'Hat der Vermieter erklärt, warum er Geld einbehält?',
        'Sind noch Betriebskostenabrechnungen oder andere Forderungen offen?',
        'Wie hoch ist die einbehaltene Kaution?',
      ],
      note: 'Hier zeigt GitLaw bewusst eine Grenze: § 551 allein beantwortet die Rückzahlungsfrist nicht zuverlässig.',
    }
  }

  const refs = sourceRefs(result)
  return {
    topic: refs.length ? 'Mietrechtliche Einordnung' : 'Noch unklarer Fall',
    summary: refs.length
      ? `GitLaw hat ${refs.length} mögliche gesetzliche Anknüpfungspunkte gefunden. Mit den bisherigen Angaben wäre es aber zu früh, daraus eine eindeutige beste Option abzuleiten.`
      : 'GitLaw hat noch keine belastbare gesetzliche Grundlage für eine konkrete Empfehlung gefunden. Statt zu raten, braucht das Tool mehr Informationen.',
    urgency: 'Erst Fakten klären, dann handeln',
    today: 'Ergänze Datum, Schreiben, Beträge, mögliche Fristen und dein konkretes Ziel. So wird aus einer allgemeinen Frage ein prüfbarer Fall.',
    avoid: 'Triff auf Basis der aktuellen Treffer noch keine weitreichende Entscheidung. GitLaw zeigt hier bewusst keine scheinbar sichere Empfehlung.',
    documents: ['Relevante Schreiben', 'Mietvertrag', 'Daten und Fristen', 'Beträge', 'Notizen zu deinem gewünschten Ergebnis'],
    options: [
      {
        title: '1. Den Sachverhalt konkreter machen',
        text: 'Ergänze Datum, Schreiben, Beträge, Fristen und das konkrete Ziel („Was will ich erreichen?“). Damit kann GitLaw die Einordnung und nächsten Schritte enger machen.',
      },
      {
        title: '2. Gefundene Originalquellen nachvollziehen',
        text: refs.length ? `Aktuell stützt sich die Einordnung auf: ${refs.join(', ')}.` : 'Aktuell gibt es noch keine ausreichend belastbaren Quellen.',
      },
      {
        title: '3. Bei laufender Frist oder großen Folgen menschlich prüfen lassen',
        text: 'Wenn Kündigung, Klage, hohe Geldbeträge oder eine kurze Frist im Raum stehen, sollte ein Mensch den konkreten Fall und die Unterlagen prüfen.',
      },
    ],
    missingFacts: [
      'Was genau ist passiert und wann?',
      'Welche Schreiben oder Vertragsklauseln sind relevant?',
      'Welche Beträge oder Fristen stehen im Raum?',
      'Was möchtest du konkret erreichen?',
    ],
    note: 'GitLaw soll lieber sichtbar nach fehlenden Fakten fragen als eine zu sichere Empfehlung zu erfinden.',
  }
}

function saveLocal(record: PilotRecord) {
  try {
    const existing = JSON.parse(localStorage.getItem('gitlaw-mietrecht-pilot-feedback') || '[]') as unknown
    const rows = Array.isArray(existing) ? existing : []
    localStorage.setItem('gitlaw-mietrecht-pilot-feedback', JSON.stringify([...rows, record].slice(-50)))
  } catch {
    // Die Testperson kann den Datensatz weiterhin kopieren.
  }
}

export default function MietrechtResearchDesk() {
  const [question, setQuestion] = useState(examples[0])
  const [result, setResult] = useState<MietrechtResearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rating, setRating] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [caseCopied, setCaseCopied] = useState(false)
  const decision = result ? buildDecisionSupport(question, result) : null

  async function runResearch(nextQuestion?: string) {
    const query = (nextQuestion ?? question).trim()
    if (!query || loading) return
    if (nextQuestion) setQuestion(nextQuestion)
    setLoading(true)
    setError('')
    setResult(null)
    setRating(null)
    setNote('')
    setSaved(false)
    setCopied(false)
    setCaseCopied(false)
    try {
      setResult(await askMietrechtResearchQuestion(query))
    } catch (err) {
      console.error(err)
      setError('Die Einschätzung konnte gerade nicht vollständig geladen werden. Bitte versuche es noch einmal.')
    } finally {
      setLoading(false)
    }
  }

  function makeRecord(nextRating?: Rating): PilotRecord | null {
    if (!result) return null
    const chosen = nextRating ?? rating
    if (!chosen) return null
    return {
      id: `mietrecht-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      question: question.trim(),
      rating: chosen,
      note: note.trim(),
      retrievalSignal: result.retrievalSignal,
      durationMs: result.durationMs,
      sources: result.sources.map(source => ({ law: source.law, section: source.section })),
    }
  }

  async function submitFeedback(nextRating?: Rating) {
    const chosen = nextRating ?? rating
    if (!chosen) return
    setRating(chosen)
    const record = makeRecord(chosen)
    if (!record) return
    saveLocal(record)
    try {
      await fetch(feedbackApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
        keepalive: true,
      })
    } catch {
      // Best-effort-Pilotlogging; der lokale Datensatz bleibt erhalten.
    }
    setSaved(true)
  }

  async function copyRecord() {
    const record = makeRecord() || (result ? {
      id: `mietrecht-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      question: question.trim(),
      rating: 'partial' as const,
      note: note.trim(),
      retrievalSignal: result.retrievalSignal,
      durationMs: result.durationMs,
      sources: result.sources.map(source => ({ law: source.law, section: source.section })),
    } : null)
    if (!record) return
    const text = [
      'GitLaw Mietrecht Pilot',
      `Frage: ${record.question}`,
      `Bewertung: ${record.rating}`,
      `Treffer: ${record.sources.map(source => `${source.law} ${source.section}`).join(' | ')}`,
      `Dauer: ${record.durationMs} ms`,
      `Korrektur/Notiz: ${record.note || '—'}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function copyCaseBrief() {
    if (!result || !decision) return
    const refs = sourceRefs(result)
    const text = [
      'GitLaw · Zusammenfassung für eine Beratung',
      '',
      `Geschilderter Fall: ${question.trim()}`,
      `Vorläufige Einordnung: ${decision.topic}`,
      `Dringlichkeit: ${decision.urgency}`,
      '',
      `Nächster Schritt heute: ${decision.today}`,
      `Noch nicht vorschnell tun: ${decision.avoid}`,
      '',
      'Mögliche nächste Schritte:',
      ...decision.options.map(option => `- ${option.title.replace(/^\\d+\\.\\s*/, '')}: ${option.text}`),
      '',
      'Für die Prüfung bereithalten:',
      ...decision.documents.map(document => `- ${document}`),
      '',
      'Noch offene Fragen:',
      ...decision.missingFacts.map(fact => `- ${fact}`),
      '',
      `Gefundene BGB-Quellen: ${refs.join(', ') || 'noch keine belastbaren Quellen'}`,
      '',
      'Hinweis: Orientierung und Recherchehilfe, keine individuelle Rechtsberatung. Konzeptdemo ohne offizielle Verbindung zu CONNY.',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCaseCopied(true)
      window.setTimeout(() => setCaseCopied(false), 2200)
    } catch {
      setCaseCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <a href="#/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-gold">
            <ArrowLeft className="w-4 h-4" /> GitLaw
          </a>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 font-semibold"><Scale className="w-4 h-4 text-gold" /> Mietrecht-Hilfe</div>
          <div className="flex-1" />
          <span className="hidden sm:block text-xs text-ink-muted">Orientierung · Quellen · menschliche Prüfung</span>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-white to-bg-alt/60">
          <div className="max-w-3xl mx-auto px-5 py-12 text-center">
            <div className="inline-flex px-3 py-1 rounded-full border border-gold/20 bg-gold-light text-[11px] font-bold uppercase tracking-[0.18em] text-gold mb-5">Konzeptdemo · ohne Anmeldung</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] mb-5">Wissen, was jetzt zählt.</h1>
            <p className="text-lg text-ink-soft leading-relaxed">Schildere deinen Mietfall. GitLaw zeigt dir den nächsten sinnvollen Schritt — mit nachvollziehbaren Quellen und sichtbaren Grenzen.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-semibold text-ink-soft">
              <span className="rounded-full border border-border bg-white px-3 py-1.5">Einordnung</span>
              <span className="rounded-full border border-border bg-white px-3 py-1.5">Nächster Schritt</span>
              <span className="rounded-full border border-border bg-white px-3 py-1.5">Beratungsbrief</span>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-10">
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-border">
              <label className="block text-xs font-bold uppercase tracking-widest text-gold mb-3">Was ist passiert?</label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-4 w-5 h-5 text-ink-muted" />
                <textarea value={question} onChange={event => setQuestion(event.target.value)} rows={4} className="w-full min-h-[132px] pl-12 pr-4 py-4 rounded-2xl border border-border bg-white text-base sm:text-lg focus:outline-none focus:border-gold resize-y" placeholder="Zum Beispiel: Mein Vermieter möchte die Miete erhöhen. Das Schreiben kam gestern …" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button onClick={() => runResearch()} disabled={!question.trim() || loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ink text-white font-semibold hover:opacity-90 disabled:opacity-40">
                  <Search className="w-4 h-4" /> {loading ? 'Fall wird eingeordnet …' : 'Fall einschätzen'}
                </button>
                <span className="text-xs text-ink-muted">Keine Anmeldung · bitte keine personenbezogenen Daten eingeben</span>
              </div>
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer text-ink-muted hover:text-gold">Mit einem Beispiel testen</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {examples.map(example => <button key={example} onClick={() => runResearch(example)} disabled={loading} className="text-left px-3 py-2 rounded-xl border border-border bg-bg-alt text-xs sm:text-sm text-ink-soft hover:border-gold/40 disabled:opacity-50">{example}</button>)}
                </div>
              </details>
            </div>

            {loading && <div className="p-10 text-center"><p className="font-medium">GitLaw ordnet deinen Fall ein …</p><p className="text-sm text-ink-muted mt-1">Quellen finden → Situation einordnen → Optionen sichtbar machen.</p></div>}
            {error && !loading && <div className="m-5 sm:m-7 rounded-2xl bg-red-light border border-red/10 p-5 text-sm text-red">{error}</div>}

            {result && decision && !loading && (
              <div className="p-5 sm:p-7 space-y-5">
                <section className="rounded-3xl border border-gold/20 bg-gold-light/35 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gold">{decision.topic}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/70 border border-border">{signalLabel(result.retrievalSignal)}</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl mb-3">Das bedeutet für dich</h2>
                  <p className="text-base sm:text-lg leading-relaxed text-ink-soft">{decision.summary}</p>
                  <div className="mt-6 pt-6 border-t border-gold/15 grid md:grid-cols-[1.15fr_.85fr] gap-5">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-2">{decision.urgency}</p>
                      <p className="text-base sm:text-lg font-medium leading-relaxed">{decision.today}</p>
                    </div>
                    <div className="md:border-l md:border-gold/15 md:pl-5">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Noch nicht vorschnell</p>
                      <p className="text-sm leading-relaxed text-ink-soft">{decision.avoid}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl bg-ink text-white p-5 sm:p-7">
                  <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gold-light mb-2">Dein Ergebnis zum Mitnehmen</p>
                      <h2 className="font-display text-2xl sm:text-3xl mb-2">Zusammenfassung für eine Beratung</h2>
                      <p className="text-sm text-white/70 leading-relaxed">Nimm deine Angaben, offenen Fragen, benötigten Unterlagen und Quellen mit — damit du bei einer Beratung nicht von vorn anfangen musst.</p>
                    </div>
                    <button onClick={copyCaseBrief} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-ink font-semibold hover:bg-gold-light">
                      <FileSearch className="w-4 h-4" /> {caseCopied ? 'Zusammenfassung kopiert ✓' : 'Zusammenfassung kopieren'}
                    </button>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
                    <span>{decision.documents.length} Unterlagen</span>
                    <span>{decision.missingFacts.length} offene Fragen</span>
                    <span>{result.sources.length} BGB-Quellen</span>
                    <span>Keine offizielle Verbindung zu CONNY</span>
                  </div>
                </section>

                <details className="rounded-2xl border border-border bg-white overflow-hidden">
                  <summary className="cursor-pointer px-5 py-4 font-semibold hover:bg-bg-alt">Weitere Optionen und offene Fragen</summary>
                  <div className="border-t border-border p-5 sm:p-6 space-y-6">
                    <div className="space-y-4">
                      {decision.options.map(option => {
                        const refs = sourceRefs(result, option.sourceNumbers)
                        return (
                          <article key={option.title}>
                            <h3 className="font-semibold mb-1">{option.title}</h3>
                            <p className="text-sm text-ink-soft leading-relaxed">{option.text}</p>
                            {refs.length > 0 && <p className="mt-1 text-[11px] text-ink-muted">Quelle: {refs.join(', ')}</p>}
                          </article>
                        )
                      })}
                    </div>
                    <div className="rounded-2xl bg-bg-alt border border-border p-5">
                      <p className="font-semibold mb-3">Was für eine genauere Prüfung noch fehlt</p>
                      <ul className="space-y-2 text-sm text-ink-soft list-disc pl-5">{decision.missingFacts.map(fact => <li key={fact}>{fact}</li>)}</ul>
                      <p className="text-xs text-ink-muted mt-4">{decision.note}</p>
                    </div>
                  </div>
                </details>

                <details className="rounded-2xl border border-border bg-white overflow-hidden">
                  <summary className="cursor-pointer px-5 py-4 font-semibold hover:bg-bg-alt">{result.sources.length} Gesetzesquellen und Grenzen ansehen</summary>
                  <div className="border-t border-border p-5 sm:p-6 space-y-3">
                    {result.sources.map((source, index) => (
                      <details key={`${source.section}-${index}`} className="rounded-xl border border-border bg-bg-alt">
                        <summary className="cursor-pointer p-4 text-sm font-semibold">{source.section}</summary>
                        <div className="px-4 pb-4 text-sm text-ink-soft">
                          <p className="leading-relaxed">{source.excerpt.slice(0, 520)}{source.excerpt.length > 520 ? '…' : ''}</p>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span><strong className="text-ink">Warum:</strong> {source.reason}</span>
                            <a href={source.officialUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-gold hover:underline">Original öffnen <ExternalLink className="w-3 h-3" /></a>
                          </div>
                        </div>
                      </details>
                    ))}
                    <div className="pt-4">
                      <p className="font-semibold text-sm mb-2">Was GitLaw nicht geprüft hat</p>
                      <ul className="space-y-1.5 text-sm text-ink-soft list-disc pl-5">{result.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
                      <p className="text-xs text-gold mt-3">Orientierung und Recherchehilfe, keine individuelle Rechtsberatung.</p>
                    </div>
                  </div>
                </details>

                <details className="rounded-2xl border border-border bg-white overflow-hidden">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-semibold hover:bg-bg-alt">Feedback zur Einordnung geben</summary>
                  <div className="border-t border-border p-5">
                    <p className="text-sm text-ink-soft mb-3">Fehlt eine Option oder ist etwas unklar? Dein Feedback wird zu einem neuen Regressionstest.</p>
                    <div className="flex flex-wrap gap-2">
                      {([['helpful', '✓ Hilfreich'], ['partial', '△ Teilweise'], ['missing', '✕ Etwas fehlt']] as [Rating, string][]).map(([value, label]) => <button key={value} onClick={() => submitFeedback(value)} className={`px-3 py-2 rounded-xl text-xs font-semibold border ${rating === value ? 'bg-ink text-white border-ink' : 'border-border text-ink-soft'}`}>{label}</button>)}
                    </div>
                    <textarea value={note} onChange={event => setNote(event.target.value)} rows={2} placeholder="Optional: Was fehlt, ist falsch oder unklar?" className="mt-3 w-full rounded-xl border border-border bg-bg-alt px-3 py-3 text-sm focus:outline-none resize-y" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => submitFeedback()} disabled={!rating} className="px-3 py-2 rounded-lg bg-ink text-white text-xs font-semibold disabled:opacity-40">{saved ? 'Feedback gespeichert ✓' : 'Feedback speichern'}</button>
                      <button onClick={copyRecord} className="px-3 py-2 rounded-lg border border-border text-xs text-ink-muted">{copied ? 'Testdaten kopiert ✓' : 'Testdaten kopieren'}</button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-5"><div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-ink-muted"><span>GitLaw · Mietrecht-Prototyp · Michael Ninh · Berlin</span><div className="flex gap-4"><a href="https://mikelninh.github.io/" className="hover:text-gold">Portfolio</a><a href="#/" className="hover:text-gold">GitLaw</a><a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="hover:text-gold">Code ↗</a></div></div></footer>
    </div>
  )
}
