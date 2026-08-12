import { useState } from 'react'
import { ArrowLeft, ExternalLink, MessageCircle, Scale, Search } from 'lucide-react'
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
  if (signal === 'strong') return 'Direkte Themen-Treffer'
  if (signal === 'mixed') return 'Gemischte Treffer'
  return 'Schwache Treffer'
}

function saveLocal(record: PilotRecord) {
  try {
    const existing = JSON.parse(localStorage.getItem('gitlaw-mietrecht-pilot-feedback') || '[]') as unknown
    const rows = Array.isArray(existing) ? existing : []
    localStorage.setItem('gitlaw-mietrecht-pilot-feedback', JSON.stringify([...rows, record].slice(-50)))
  } catch {
    // The tester can still copy the record below.
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
      // Best-effort pilot logging; local record remains available.
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
          <div className="flex items-center gap-2 font-semibold"><Scale className="w-4 h-4 text-gold" /> Mietrecht Research Desk</div>
          <div className="flex-1" />
          <a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-1 text-xs text-ink-muted hover:text-gold">GitHub <ExternalLink className="w-3 h-3" /></a>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-white to-bg-alt/60">
          <div className="max-w-5xl mx-auto px-5 py-14 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-end">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full border border-gold/20 bg-gold-light text-[11px] font-bold uppercase tracking-[0.18em] text-gold mb-5">Live research pilot · Aug 2026</div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] mb-5">Bring your own<br />Mietrecht question.</h1>
              <p className="text-lg text-ink-soft max-w-2xl leading-relaxed">GitLaw searches the actual BGB tenancy provisions, shows what it found and only then asks AI to explain those sources. If the sources are not enough, it should say so instead of guessing.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 text-sm text-ink-soft space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gold">What this pilot tests</p>
              <p>✓ Can a real question reach useful legal sources?</p>
              <p>✓ Can a reviewer inspect exactly what the answer used?</p>
              <p>△ Where are case law, local rules or more facts still needed?</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-10">
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-border">
              <label className="block text-xs font-bold uppercase tracking-widest text-gold mb-3">Your question</label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-4 w-5 h-5 text-ink-muted" />
                <textarea value={question} onChange={event => setQuestion(event.target.value)} rows={4} className="w-full min-h-[132px] pl-12 pr-4 py-4 rounded-2xl border border-border bg-white text-base sm:text-lg focus:outline-none focus:border-gold resize-y" placeholder="Beschreibe deine Mietrechtsfrage in normaler Sprache…" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button onClick={() => runResearch()} disabled={!question.trim() || loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ink text-white font-semibold hover:opacity-90 disabled:opacity-40">
                  <Search className="w-4 h-4" /> {loading ? 'Suche im BGB…' : 'Quellen prüfen'}
                </button>
                <span className="text-xs text-ink-muted">Eigene Frage · keine Anmeldung</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {examples.map(example => <button key={example} onClick={() => runResearch(example)} disabled={loading} className="text-left px-3 py-2 rounded-xl border border-border bg-bg-alt text-xs sm:text-sm text-ink-soft hover:border-gold/40 disabled:opacity-50">{example}</button>)}
              </div>
            </div>

            {loading && <div className="p-10 text-center"><p className="font-medium">GitLaw durchsucht die Mietrechtsstellen im BGB…</p><p className="text-sm text-ink-muted mt-1">Erst Quellen, dann Erklärung.</p></div>}
            {error && !loading && <div className="m-5 sm:m-7 rounded-2xl bg-red-light border border-red/10 p-5 text-sm text-red">{error}</div>}

            {result && !loading && (
              <div className="p-5 sm:p-7 space-y-8">
                <div className="grid lg:grid-cols-[1fr_220px] gap-5 items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-3"><span className="text-[11px] font-bold uppercase tracking-widest text-gold">Research answer</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-alt border border-border">{signalLabel(result.retrievalSignal)}</span></div>
                    <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap text-ink-soft">{result.answer}</div>
                  </div>
                  <div className="rounded-2xl bg-bg-alt border border-border p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Retrieval signal</p><p className="font-display text-2xl mb-1">{result.sources.length} Quellen</p><p className="text-xs text-ink-muted leading-relaxed">{result.durationMs} ms end-to-end. Das Signal misst Treffer, nicht juristische Richtigkeit.</p></div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-1">Sources used</p>
                  <h2 className="font-display text-2xl mb-4">Was GitLaw tatsächlich gefunden hat</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {result.sources.map((source, index) => (
                      <article key={`${source.section}-${index}`} className="rounded-2xl border border-border bg-white p-5">
                        <div className="flex items-start justify-between gap-4 mb-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-gold">Quelle {index + 1}</span><h3 className="font-display text-lg mt-1">{source.section}</h3></div><a href={source.officialUrl} target="_blank" rel="noopener" className="text-ink-muted hover:text-gold" title="Offiziellen Gesetzestext öffnen"><ExternalLink className="w-4 h-4" /></a></div>
                        <p className="text-sm text-ink-soft leading-relaxed">{source.excerpt.slice(0, 520)}{source.excerpt.length > 520 ? '…' : ''}</p>
                        <div className="mt-4 pt-3 border-t border-border text-xs text-ink-muted"><strong className="text-ink">Warum gefunden:</strong> {source.reason}</div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gold/20 bg-gold-light/50 p-5"><p className="font-semibold mb-2">△ Was GitLaw hier noch nicht weiß</p><ul className="space-y-1.5 text-sm text-ink-soft list-disc pl-5">{result.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul><p className="text-xs text-gold mt-3 font-medium">Recherchehilfe, keine Rechtsberatung.</p></div>

                <div className="rounded-3xl bg-ink text-white p-5 sm:p-7 grid lg:grid-cols-[1fr_.9fr] gap-6">
                  <div><p className="text-[11px] font-bold uppercase tracking-widest text-gold-light mb-2">Real-user pilot</p><h2 className="font-display text-2xl sm:text-3xl mb-2">War das wirklich hilfreich?</h2><p className="text-sm text-white/65">Sag uns, ob eine wichtige Quelle fehlt oder die Antwort praktisch nicht hilft. Genau daraus werden die nächsten Tests.</p></div>
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {([['helpful', '✓ Hilfreich'], ['partial', '△ Teilweise'], ['missing', '✕ Fehlt etwas']] as [Rating, string][]).map(([value, label]) => <button key={value} onClick={() => submitFeedback(value)} className={`px-2 py-2.5 rounded-xl text-xs font-semibold border ${rating === value ? 'bg-white text-ink border-white' : 'border-white/15 text-white/75'}`}>{label}</button>)}
                    </div>
                    <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Optional: Welche Quelle fehlt? Was war falsch oder unklar?" className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none resize-y" />
                    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => submitFeedback()} disabled={!rating} className="px-3 py-2 rounded-lg bg-white text-ink text-xs font-semibold disabled:opacity-40">{saved ? 'Feedback gespeichert ✓' : 'Feedback speichern'}</button><button onClick={copyRecord} className="px-3 py-2 rounded-lg border border-white/15 text-xs text-white/70">{copied ? 'Testrecord kopiert ✓' : 'Testrecord kopieren'}</button></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-5"><div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-ink-muted"><span>GitLaw Mietrecht Research Pilot · Michael Ninh · Berlin</span><div className="flex gap-4"><a href="#/" className="hover:text-gold">GitLaw öffnen</a><a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="hover:text-gold">Source code ↗</a></div></div></footer>
    </div>
  )
}
