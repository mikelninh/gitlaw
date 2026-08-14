import { useState } from 'react'
import { ArrowLeft, ExternalLink, FileSearch, MessageCircle, Scale, Search } from 'lucide-react'
import { askMietrechtResearchQuestion, type MietrechtResearchResult } from './mietrecht'

const examples = [
  'Mein Vermieter will die Miete um 20 % erhöhen. Das Schreiben kam gestern. Was kann ich jetzt tun?',
  'Mein Vermieter kündigt wegen Eigenbedarf. Welche Möglichkeiten habe ich?',
  'Meine Kaution ist nach dem Auszug noch nicht zurückgezahlt. Was sind meine nächsten Schritte?',
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

function buildDecisionSupport(question: string, result: MietrechtResearchResult): DecisionSupport {
  const q = normalizeQuestion(question)

  if (['mieterhoehung', 'miete um 20', 'miete erhoehen', 'kappungsgrenze', 'vergleichsmiete'].some(term => q.includes(term))) {
    return {
      topic: 'Mieterhöhung',
      summary: 'Das klingt nach einem Mieterhöhungsverlangen. Aus „20 %“ allein folgt noch nicht, ob die Erhöhung zulässig ist. Entscheidend sind unter anderem Vergleichsmiete bzw. Kappungsgrenze, der zeitliche Verlauf und die Begründung des Schreibens.',
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

  const decision = result ? buildDecisionSupport(question, result) : null

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
          <a href="https://mikelninh.github.io/" className="hidden sm:block text-xs text-ink-muted hover:text-gold">Portfolio ↗</a>
          <a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-1 text-xs text-ink-muted hover:text-gold">Code <ExternalLink className="w-3 h-3" /></a>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-white to-bg-alt/60">
          <div className="max-w-5xl mx-auto px-5 py-14 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-end">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full border border-gold/20 bg-gold-light text-[11px] font-bold uppercase tracking-[0.18em] text-gold mb-5">Öffentlicher Prototyp · August 2026</div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] mb-5">Was kannst du in deinem Mietrechtsfall jetzt tun?</h1>
              <p className="text-lg text-ink-soft max-w-2xl leading-relaxed">Beschreibe, was passiert ist. GitLaw ordnet deinen Fall ein, findet die relevanten BGB-Regeln und zeigt dir auf dieser Basis mögliche nächste Schritte. Wenn entscheidende Fakten fehlen, sagt es dir konkret welche.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 text-sm text-ink-soft space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Was du bekommst</p>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">1</span><p><strong className="text-ink block">Eine Einordnung</strong>Was ist das wahrscheinlich für ein rechtliches Problem?</p></div>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">2</span><p><strong className="text-ink block">Mögliche nächste Schritte</strong>Was kannst du jetzt sinnvoll tun — und in welcher Reihenfolge?</p></div>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">3</span><p><strong className="text-ink block">Belege & Grenzen</strong>Welche BGB-Stellen tragen die Einordnung und was fehlt noch?</p></div>
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
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Oder Beispiel ausprobieren</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map(example => <button key={example} onClick={() => runResearch(example)} disabled={loading} className="text-left px-3 py-2 rounded-xl border border-border bg-bg-alt text-xs sm:text-sm text-ink-soft hover:border-gold/40 disabled:opacity-50">{example}</button>)}
                </div>
              </div>
            </div>

            {loading && <div className="p-10 text-center"><p className="font-medium">GitLaw ordnet deinen Fall ein …</p><p className="text-sm text-ink-muted mt-1">Quellen finden → Situation einordnen → Optionen sichtbar machen.</p></div>}
            {error && !loading && <div className="m-5 sm:m-7 rounded-2xl bg-red-light border border-red/10 p-5 text-sm text-red">{error}</div>}

            {result && decision && !loading && (
              <div className="p-5 sm:p-7 space-y-8">
                <section className="rounded-3xl border border-gold/20 bg-gold-light/35 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2 mb-3"><span className="text-[11px] font-bold uppercase tracking-widest text-gold">Vorläufige Einordnung · {decision.topic}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/70 border border-border">{signalLabel(result.retrievalSignal)}</span></div>
                  <p className="text-lg sm:text-xl leading-relaxed text-ink">{decision.summary}</p>
                </section>

                <section>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-1">Was du jetzt tun kannst</p>
                  <h2 className="font-display text-2xl sm:text-3xl mb-2">Deine nächsten Optionen</h2>
                  <p className="text-sm text-ink-muted mb-4">Auf Basis deiner bisherigen Angaben — nicht als endgültige Rechtsberatung, sondern als begründete Handlungsorientierung.</p>
                  <div className="grid lg:grid-cols-3 gap-3">
                    {decision.options.map(option => {
                      const refs = sourceRefs(result, option.sourceNumbers)
                      return (
                        <article key={option.title} className="rounded-2xl border border-border bg-white p-5 flex flex-col">
                          <h3 className="font-display text-lg mb-2">{option.title}</h3>
                          <p className="text-sm text-ink-soft leading-relaxed flex-1">{option.text}</p>
                          {refs.length > 0 && <p className="mt-4 pt-3 border-t border-border text-[11px] text-ink-muted"><strong className="text-ink">Gestützt auf:</strong> {refs.join(', ')}</p>}
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="grid lg:grid-cols-[1fr_220px] gap-5 items-start">
                  <div className="rounded-2xl border border-border bg-bg-alt p-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-1">Damit die Einschätzung besser wird</p>
                    <h2 className="font-display text-2xl mb-3">Was GitLaw noch wissen muss</h2>
                    <ul className="space-y-2 text-sm text-ink-soft list-disc pl-5">{decision.missingFacts.map(fact => <li key={fact}>{fact}</li>)}</ul>
                    <p className="text-xs text-ink-muted mt-4">{decision.note}</p>
                  </div>
                  <div className="rounded-2xl bg-bg-alt border border-border p-4"><FileSearch className="w-5 h-5 text-gold mb-3" /><p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Gesetzliche Basis</p><p className="font-display text-2xl mb-1">{result.sources.length} BGB-Stellen</p><p className="text-xs text-ink-muted leading-relaxed">{result.durationMs} ms · Die Quellenanzahl ist kein Maß für juristische Richtigkeit.</p></div>
                </section>

                <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-2">Quellenbasierte Begründung</p>
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-ink-soft">{result.answer}</div>
                </section>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-1">Originalquellen</p>
                  <h2 className="font-display text-2xl mb-2">Die Regeln hinter der Einordnung</h2>
                  <p className="text-sm text-ink-muted mb-4">Hier kannst du nachvollziehen, welche Gesetzesstellen GitLaw tatsächlich verwendet hat.</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {result.sources.map((source, index) => (
                      <article key={`${source.section}-${index}`} className="rounded-2xl border border-border bg-white p-5">
                        <div className="flex items-start justify-between gap-4 mb-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-gold">Quelle {index + 1}</span><h3 className="font-display text-lg mt-1">{source.section}</h3></div><a href={source.officialUrl} target="_blank" rel="noopener" className="text-ink-muted hover:text-gold" title="Offiziellen Gesetzestext öffnen"><ExternalLink className="w-4 h-4" /></a></div>
                        <p className="text-sm text-ink-soft leading-relaxed">{source.excerpt.slice(0, 520)}{source.excerpt.length > 520 ? '…' : ''}</p>
                        <div className="mt-4 pt-3 border-t border-border text-xs text-ink-muted"><strong className="text-ink">Warum diese Stelle:</strong> {source.reason}</div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gold/20 bg-gold-light/50 p-5"><p className="font-semibold mb-2">△ Was für eine belastbarere rechtliche Bewertung noch fehlt</p><ul className="space-y-1.5 text-sm text-ink-soft list-disc pl-5">{result.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul><p className="text-xs text-gold mt-3 font-medium">Orientierung und Recherchehilfe, keine individuelle Rechtsberatung.</p></div>

                <div className="rounded-3xl bg-ink text-white p-5 sm:p-7 grid lg:grid-cols-[1fr_.9fr] gap-6">
                  <div><p className="text-[11px] font-bold uppercase tracking-widest text-gold-light mb-2">Hilf GitLaw besser zu werden</p><h2 className="font-display text-2xl sm:text-3xl mb-2">Hat dir die Einordnung bei deiner nächsten Entscheidung geholfen?</h2><p className="text-sm text-white/65">Wenn eine Option fehlt oder die Einordnung irreführend ist, sag es uns. Nutzerfehler werden zu neuen Tests, damit derselbe Fehler nicht einfach wiederkommt.</p></div>
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {([['helpful', '✓ Ja'], ['partial', '△ Teilweise'], ['missing', '✕ Etwas fehlt']] as [Rating, string][]).map(([value, label]) => <button key={value} onClick={() => submitFeedback(value)} className={`px-2 py-2.5 rounded-xl text-xs font-semibold border ${rating === value ? 'bg-white text-ink border-white' : 'border-white/15 text-white/75'}`}>{label}</button>)}
                    </div>
                    <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Optional: Was fehlt, ist falsch oder unklar?" className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none resize-y" />
                    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => submitFeedback()} disabled={!rating} className="px-3 py-2 rounded-lg bg-white text-ink text-xs font-semibold disabled:opacity-40">{saved ? 'Feedback gespeichert ✓' : 'Feedback speichern'}</button><button onClick={copyRecord} className="px-3 py-2 rounded-lg border border-white/15 text-xs text-white/70">{copied ? 'Testdaten kopiert ✓' : 'Testdaten kopieren'}</button></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-5"><div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-ink-muted"><span>GitLaw · Mietrecht-Prototyp · Michael Ninh · Berlin</span><div className="flex gap-4"><a href="https://mikelninh.github.io/" className="hover:text-gold">Portfolio</a><a href="#/" className="hover:text-gold">GitLaw</a><a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="hover:text-gold">Code ↗</a></div></div></footer>
    </div>
  )
}
