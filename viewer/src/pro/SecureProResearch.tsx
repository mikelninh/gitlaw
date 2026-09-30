import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Download, Loader2, Save, Search, Shield, ShieldCheck } from 'lucide-react'
import { getExampleQuestions, proAsk, type PrivacyReceiptSummary } from './ai'
import { getAccessContext, getApprovedMemoryExamples, getCase, getSettings, listCases, markResearchReviewed, saveApprovedAnswerMemory, saveResearch } from './store'
import { prepareResearchEgress, safeHistoryContext } from './research-privacy'
import { verifyAllCitations } from './verify'
import { exportResearchPDF } from './pdf'
import { exportResearchDOCX } from './docx'
import CitationDrawer from './CitationDrawer'
import type { Citation, ResearchQuery } from './types'

interface Turn {
  question: string
  aiQuestion: string
  answer: string
  citations: Citation[]
}

export default function SecureProResearch() {
  const [params, setParams] = useSearchParams()
  const cases = listCases().filter(c => c.status === 'aktiv')
  const [selectedCaseId, setSelectedCaseId] = useState(params.get('case') || '')
  const selectedCase = useMemo(() => selectedCaseId ? getCase(selectedCaseId) : undefined, [selectedCaseId])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [savedItem, setSavedItem] = useState<ResearchQuery | null>(null)
  const [approvedAnswerDraft, setApprovedAnswerDraft] = useState('')
  const [history, setHistory] = useState<Turn[]>([])
  const [receipt, setReceipt] = useState<PrivacyReceiptSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [openCitation, setOpenCitation] = useState<Citation | null>(null)

  const matterMode = selectedCase
    ? (selectedCase.privacy?.dataMode === 'synthetic' ? 'synthetic' : 'real_mandate')
    : 'general'

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setReceipt(null)
    setSavedItem(null)

    try {
      const memory = getApprovedMemoryExamples(question, 6)
      const prepared = prepareResearchEgress({
        question,
        caseItem: selectedCase,
        approvedMemory: memory,
        forceRedaction: Boolean(selectedCase),
      })
      const context = safeHistoryContext(history)
      const prompt = context
        ? `${context}\n\nAktuelle Frage: ${prepared.questionForAi}`
        : prepared.questionForAi
      const result = await proAsk(prompt, {
        approvedMemory: prepared.approvedMemoryForAi,
        privacy: prepared.privacy,
      })
      const verified = await verifyAllCitations(result.zitate)
      if (answer) {
        setHistory(prev => [...prev, { question, aiQuestion: prepared.questionForAi, answer, citations }].slice(-6))
      }
      setAnswer(result.antwort)
      setApprovedAnswerDraft(result.antwort)
      setCitations(verified)
      setReceipt(result.privacyReceipt || null)
    } catch (err) {
      setAnswer('')
      setCitations([])
      setError(err instanceof Error ? err.message : 'Recherche wurde sicher abgebrochen.')
    } finally {
      setLoading(false)
    }
  }

  function save() {
    if (!answer) return
    const item = saveResearch({
      caseId: selectedCaseId || undefined,
      question,
      answer,
      citations,
      reviewed: false,
    })
    setSavedItem(item)
  }

  function markReviewed() {
    if (!savedItem) return
    const finalAnswer = approvedAnswerDraft.trim() || savedItem.answer
    markResearchReviewed(savedItem.id, finalAnswer)
    saveApprovedAnswerMemory({
      caseId: savedItem.caseId,
      question: savedItem.question,
      approvedAnswer: finalAnswer,
      sourceResearchId: savedItem.id,
    })
    setSavedItem({ ...savedItem, reviewed: true, approvedAnswer: finalAnswer })
  }

  function exportPdf() {
    if (!savedItem) return
    exportResearchPDF({ settings: getSettings(), research: savedItem, caseInfo: selectedCaseId ? getCase(selectedCaseId) : undefined })
  }

  function exportDocx() {
    if (!savedItem) return
    void exportResearchDOCX({ settings: getSettings(), research: savedItem, caseInfo: selectedCaseId ? getCase(selectedCaseId) : undefined })
  }

  const verifiedCount = citations.filter(c => c.verified).length

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">
            <ShieldCheck className="w-4 h-4" /> Lawyer-safe research
          </div>
          <h1 className="h-page mt-2">Recherche · geschützt</h1>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-3xl">
            Jede externe KI-Anfrage wird serverseitig vor dem Netzwerkaufruf gegen Mandatsgeheimnis-, Datenschutz- und Provider-Gates geprüft. Fehlende Klassifikation bedeutet: Realmandat, fail-closed.
          </p>
        </div>
        <Link to="/pro/privacy" className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold hover:border-[var(--color-gold)]">
          Privacy Proof Center →
        </Link>
      </header>

      <ModeBanner mode={matterMode} caseItem={selectedCase} />

      <form onSubmit={ask} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
        <div className="flex gap-2 items-baseline">
          <label className="text-sm text-[var(--color-ink-soft)] shrink-0">Akte:</label>
          <select
            value={selectedCaseId}
            onChange={e => {
              const id = e.target.value
              setSelectedCaseId(id)
              setParams(id ? { case: id } : {}, { replace: true })
              setAnswer('')
              setCitations([])
              setReceipt(null)
              setError('')
            }}
            className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm flex-1 max-w-xl"
          >
            <option value="">— freie, nicht mandatsbezogene Recherche —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.aktenzeichen} · {c.mandantName}</option>
            ))}
          </select>
        </div>

        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={4}
          placeholder="Rechtsfrage formulieren. Bei verknüpften Akten läuft die Pseudonymisierung immer vor dem Versand."
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-3 focus:outline-none focus:border-[var(--color-gold)]"
        />

        <div className="flex gap-2 flex-wrap">
          <button type="submit" disabled={loading || !question.trim()} className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-xl px-4 py-2.5 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Privacy-Gate + Recherche…' : 'Sicher recherchieren'}
          </button>
          {question && (
            <button type="button" onClick={() => { setQuestion(''); setAnswer(''); setCitations([]); setError(''); setReceipt(null) }} className="px-3 py-2 text-sm text-[var(--color-ink-muted)]">
              Neue Frage
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-ink-muted)] mb-2">Sichere Beispielfragen</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {getExampleQuestions(getAccessContext()?.tenantId).slice(0, 6).map(q => (
              <button type="button" key={q} onClick={() => setQuestion(q)} className="text-left text-xs rounded-lg border border-[var(--color-border)] p-2.5 hover:border-[var(--color-gold)]">
                {q}
              </button>
            ))}
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-950">Sicher blockiert — kein stiller Fallback</p>
              <p className="text-sm text-red-900 mt-1 break-words">{error}</p>
              {matterMode === 'real_mandate' && <p className="text-xs text-red-800 mt-2">Nutze bis zur Freigabe Shadow Mode oder eine explizit synthetische Testakte.</p>}
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-emerald-950">Privacy receipt · ALLOW</p>
              <p className="text-xs text-emerald-900/70 mt-1 font-mono break-all">{receipt.receiptDigest}</p>
            </div>
            <span className="rounded-full bg-white border border-emerald-200 px-2.5 py-1 text-xs text-emerald-900">
              {receipt.signature ? 'signiert' : 'unsigned dev proof'}
            </span>
          </div>
        </div>
      )}

      {answer && (
        <article className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            Entwurf · anwaltliche Prüfung erforderlich. Keine autonome Rechtsentscheidung.
          </div>
          <section>
            <h2 className="text-xs uppercase tracking-wide font-semibold text-[var(--color-ink-muted)] mb-2">Antwort</h2>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{answer}</div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-xs uppercase tracking-wide font-semibold text-[var(--color-ink-muted)]">Quellenprüfung</h2>
              <span className="text-xs">{verifiedCount}/{citations.length} verifiziert</span>
            </div>
            {citations.length === 0 ? (
              <p className="text-sm text-amber-800">Keine verifizierbaren Paragraphenzitate geliefert.</p>
            ) : (
              <div className="space-y-2">
                {citations.map((c, i) => (
                  <button key={`${c.display}-${i}`} type="button" onClick={() => setOpenCitation(c)} className={`w-full text-left rounded-xl border p-3 ${c.verified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex justify-between gap-3">
                      <span className="font-mono font-semibold text-sm">{c.display}</span>
                      {c.verified
                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> verifiziert</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> prüfen</span>}
                    </div>
                    {c.excerpt && <p className="text-xs text-[var(--color-ink-soft)] mt-1 line-clamp-2">{c.excerpt}</p>}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wide font-semibold text-[var(--color-ink-muted)] mb-2">Anwaltliche Freigabefassung</h2>
            <textarea value={approvedAnswerDraft} onChange={e => setApprovedAnswerDraft(e.target.value)} rows={8} className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm" />
          </section>

          <footer className="flex gap-2 flex-wrap pt-3 border-t border-[var(--color-border)]">
            {!savedItem && <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] text-white px-3 py-2 text-sm"><Save className="w-4 h-4" /> In Akte speichern</button>}
            {savedItem && !savedItem.reviewed && <button onClick={markReviewed} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 text-white px-3 py-2 text-sm"><CheckCircle2 className="w-4 h-4" /> Anwaltlich geprüft</button>}
            {savedItem && <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"><Download className="w-4 h-4" /> PDF</button>}
            {savedItem && <button onClick={exportDocx} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"><Download className="w-4 h-4" /> DOCX</button>}
          </footer>
        </article>
      )}

      <CitationDrawer citation={openCitation} onClose={() => setOpenCitation(null)} />
    </div>
  )
}

function ModeBanner({ mode, caseItem }: { mode: 'general' | 'synthetic' | 'real_mandate'; caseItem?: ReturnType<typeof getCase> }) {
  if (mode === 'synthetic') {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><strong>Demo/Synthetic.</strong> Keine echte Mandatsinformation. Externe Recherche darf durch den Privacy-Gateway laufen.</div>
  }
  if (mode === 'general') {
    return <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm"><strong>Freie Recherche.</strong> Direkte Identifikatoren werden vor dem Versand entfernt; mandatsbezogene Tatsachen gehören stattdessen in eine klassifizierte Akte.</div>
  }
  const p = caseItem?.privacy
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex gap-3">
        <Shield className="w-5 h-5 text-amber-800 shrink-0" />
        <div>
          <p className="font-semibold text-amber-950">Realmandat · Shadow Mode ist der sichere Standard</p>
          <p className="text-sm text-amber-900 mt-1">Externe KI bleibt blockiert, bis Kanzlei-/Provider-Gates und die mandatsbezogene Evidenz vollständig sind.</p>
          <div className="grid sm:grid-cols-3 gap-2 mt-3 text-xs">
            <Gate ok={p?.externalAiConsentOnFile === true} label="Einwilligung belegt" />
            <Gate ok={p?.externalServiceNecessaryAttested === true} label="Erforderlichkeit bestätigt" />
            <Gate ok={Boolean(p?.pseudonymousCaseRef)} label="Pseudonym vorhanden" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`rounded-lg border px-2 py-1.5 ${ok ? 'border-emerald-200 bg-white text-emerald-800' : 'border-amber-300 bg-white/70 text-amber-900'}`}>{ok ? '✓' : '○'} {label}</span>
}
