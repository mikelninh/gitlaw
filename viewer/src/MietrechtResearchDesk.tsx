import { useState } from 'react'
import { ArrowLeft, ExternalLink, FileSearch, MessageCircle, Scale, Search } from 'lucide-react'
import { askMietrechtResearchQuestion, type MietrechtResearchResult } from './mietrecht'

const examples = [
  'Mein Vermieter will die Miete um 20 % erhöhen. Welche Regeln sollte ich prüfen?',
  'Mein Vermieter kündigt wegen Eigenbedarf. Welche Paragraphen sind relevant?',
  'Meine Kaution wurde nach dem Auszug nicht zurückgezahlt. Wo sollte ich anfangen?',
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

function feedbackApiUrl() {
  const apiBase = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
  return `${apiBase}/api/research-feedback`
}

function signalLabel(signal: MietrechtResearchResult['retrievalSignal']) {
  if (signal === 'strong') return 'Thema klar erkannt'
  if (signal === 'mixed') return 'Mögliche Treffer'
  return 'Unsicherer Treffer'
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
      setError('Die Recherche konnte gerade nicht vollständig geladen werden. Bitte versuche es noch einmal.')
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
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] mb-5">Welche Mietrechtsregeln solltest du zuerst prüfen?</h1>
              <p className="text-lg text-ink-soft max-w-2xl leading-relaxed">Beschreibe deinen Fall in Alltagssprache. GitLaw zeigt dir zuerst die wahrscheinlich relevanten BGB-Stellen, warum sie gefunden wurden und was das Tool noch nicht beurteilen kann.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 text-sm text-ink-soft space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Was du bekommst</p>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">1</span><p><strong className="text-ink block">Relevante BGB-Stellen</strong>Ein verständlicher Startpunkt statt einer Liste beliebiger Suchtreffer.</p></div>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">2</span><p><strong className="text-ink block">Originalquellen</strong>Jede gefundene Regel lässt sich direkt im Gesetz nachlesen.</p></div>
              <div className="flex gap-3"><span className="mt-0.5 w-7 h-7 rounded-full bg-gold-light text-gold grid place-items-center text-xs font-bold">3</span><p><strong className="text-ink block">Sichtbare Grenzen</strong>Wenn Vertrag, Rechtsprechung oder weitere Fakten fehlen, soll das sichtbar bleiben.</p></div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-10">
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-border">
              <label className="block text-xs font-bold uppercase tracking-widest text-gold mb-3">Dein Fall</label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-4 w-5 h-5 text-ink-muted" />
                <textarea value={question} onChange={event => setQuestion(event.target.value)} rows={4} className="w-full min-h-[132px] pl-12 pr-4 py-4 rounded-2xl border border-border bg-white text-base sm:text-lg focus:outline-none focus:border-gold resize-y" placeholder="Zum Beispiel: Mein Vermieter möchte die Miete erhöhen …" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button onClick={() => runResearch()} disabled={!question.trim() || loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ink text-white font-semibold hover:opacity-90 disabled:opacity-40">
                  <Search className="w-4 h-4" /> {loading ? 'Suche im BGB …' : 'Relevante Regeln finden'}
                </button>
                <span className="text-xs text-ink-muted">Keine Anmeldung · keine personenbezogenen Daten nötig</span>
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Oder Beispiel ausprobieren</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map(example => <button key={example} onClick={() => runResearch(example)} disabled={loading} className="text-left px-3 py-2 rounded-xl border border-border bg-bg-alt text-xs sm:text-sm text-ink-soft hover:border-gold/40 disabled:opacity-50">{example}</button>)}
                </div>
              </div>
            </div>

            {loading && <div className="p-10 text-center"><p className="font-medium">GitLaw sucht passende Mietrechtsstellen im BGB …</p><p className="text-sm text-ink-muted mt-1">Zuerst Quellen, dann Einordnung.</p></div>}
            {error && !loading && <div className="m-5 sm:m-7 rounded-2xl bg-red-light border border-red/10 p-5 text-sm text-red">{error}</div>}

            {result && !loading && (
              <div className="p-5 sm:p-7 space-y-8">
                <div className="grid lg:grid-cols-[1fr_220px] gap-5 items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-3"><span className="text-[11px] font-bold uppercase tracking-widest text-gold">Dein Recherche-Start</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-alt border border-border">{signalLabel(result.retrievalSignal)}</span></div>
                    <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap text-ink-soft">{result.answer}</div>
                  </div>
                  <div className="rounded-2xl bg-bg-alt border border-border p-4"><FileSearch className="w-5 h-5 text-gold mb-3" /><p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Gefunden</p><p className="font-display text-2xl mb-1">{result.sources.length} BGB-Stellen</p><p className="text-xs text-ink-muted leading-relaxed">{result.durationMs} ms · Die Zahl beschreibt die Suche, nicht die juristische Richtigkeit.</p></div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-1">Originalquellen</p>
                  <h2 className="font-display text-2xl mb-2">Die Regeln hinter dem Ergebnis</h2>
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

                <div className="rounded-2xl border border-gold/20 bg-gold-light/50 p-5"><p className="font-semibold mb-2">△ Was für eine echte rechtliche Bewertung noch fehlt</p><ul className="space-y-1.5 text-sm text-ink-soft list-disc pl-5">{result.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul><p className="text-xs text-gold mt-3 font-medium">Recherchehilfe, keine Rechtsberatung.</p></div>

                <div className="rounded-3xl bg-ink text-white p-5 sm:p-7 grid lg:grid-cols-[1fr_.9fr] gap-6">
                  <div><p className="text-[11px] font-bold uppercase tracking-widest text-gold-light mb-2">Hilf GitLaw besser zu werden</p><h2 className="font-display text-2xl sm:text-3xl mb-2">Hat dir das als erster Recherche-Schritt geholfen?</h2><p className="text-sm text-white/65">Wenn etwas fehlt oder irreführend ist, sag es uns. Nutzerfehler werden zu neuen Tests, damit derselbe Fehler nicht einfach wiederkommt.</p></div>
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {([['helpful', '✓ Ja'], ['partial', '△ Teilweise'], ['missing', '✕ Quelle fehlt']] as [Rating, string][]).map(([value, label]) => <button key={value} onClick={() => submitFeedback(value)} className={`px-2 py-2.5 rounded-xl text-xs font-semibold border ${rating === value ? 'bg-white text-ink border-white' : 'border-white/15 text-white/75'}`}>{label}</button>)}
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
