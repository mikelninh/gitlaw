/**
 * Recherche page — AI Q&A with verified citations.
 *
 * Flow:
 *   1. Anwält:in types question (optionally tied to a Mandant:innen-Akte)
 *   2. We call askLegalQuestion (existing infra)
 *   3. We post-process the answer: extract § citations, verify against
 *      our local law corpus (./laws/*.md)
 *   4. Display answer with each citation badged ✓ verifiziert / ⚠ ungeprüft
 *   5. Anwält:in can save to a case + export branded PDF
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2, Save, Download, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'
import { EXAMPLE_QUESTIONS, proAsk } from './ai'
import {
  getCase,
  getSettings,
  listCases,
  markResearchReviewed,
  saveResearch,
} from './store'
import { verifyAllCitations } from './verify'
import { exportResearchPDF } from './pdf'
import type { Citation, ResearchQuery } from './types'

export default function ProResearch() {
  const [params, setParams] = useSearchParams()
  const initialCaseId = params.get('case') || ''
  const cases = useMemo(() => listCases().filter(c => c.status === 'aktiv'), [])
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [savedItem, setSavedItem] = useState<ResearchQuery | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialCaseId) setSelectedCaseId(initialCaseId)
  }, [initialCaseId])

  async function onAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setAnswer('')
    setCitations([])
    setSavedItem(null)
    try {
      const { antwort, zitate } = await proAsk(question)
      setAnswer(antwort)
      const cites = await verifyAllCitations(zitate)
      setCitations(cites)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  function onSave() {
    if (!answer) return
    const saved = saveResearch({
      caseId: selectedCaseId || undefined,
      question,
      answer,
      citations,
      reviewed: false,
    })
    setSavedItem(saved)
  }

  function onMarkReviewed() {
    if (!savedItem) return
    markResearchReviewed(savedItem.id)
    setSavedItem({ ...savedItem, reviewed: true })
  }

  function onExportPDF() {
    if (!savedItem) return
    const settings = getSettings()
    const caseInfo = savedItem.caseId ? getCase(savedItem.caseId) : undefined
    exportResearchPDF({ settings, research: savedItem, caseInfo })
  }

  const verifiedCount = citations.filter(c => c.verified).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold mb-1">Recherche</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          KI-gestützte Antwort mit Paragraphen-Belegen, abgeglichen gegen unsere lokale Sammlung
          von 5.936 Bundesgesetzen.
        </p>
      </header>

      <form onSubmit={onAsk} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
        <div className="flex gap-2 items-baseline">
          <label className="text-sm text-[var(--color-ink-soft)] shrink-0">Akte:</label>
          <select
            value={selectedCaseId}
            onChange={e => {
              setSelectedCaseId(e.target.value)
              setParams(e.target.value ? { case: e.target.value } : {}, { replace: true })
            }}
            className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm flex-1 max-w-md"
          >
            <option value="">— ohne Akte (freie Recherche) —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.aktenzeichen} · {c.mandantName}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="z. B. Welche Tatbestände kommen bei wiederholten Drohnachrichten via Instagram-DM in Betracht?"
          rows={3}
          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
          required
        />
        <div className="flex items-baseline gap-2 flex-wrap">
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'KI denkt…' : 'Frage stellen'}
          </button>
          {!question && !loading && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
              <Lightbulb className="w-3.5 h-3.5" /> Beispielfragen:
            </div>
          )}
          {!question && !loading && EXAMPLE_QUESTIONS.slice(0, 3).map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuestion(ex)}
              className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] text-[var(--color-ink-soft)]"
            >
              {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
      )}

      {answer && (
        <article className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          <section>
            <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
              Antwort
            </h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
          </section>

          <section>
            <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
              Zitierte Vorschriften ({citations.length})
              {citations.length > 0 && (
                <span className="ml-2 text-xs">
                  {verifiedCount}/{citations.length} verifiziert
                </span>
              )}
            </h2>
            {citations.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] italic">
                Die KI hat keine konkreten Paragraphen zitiert. Antwort vorsichtig prüfen.
              </p>
            ) : (
              <ul className="space-y-2">
                {citations.map((c, i) => (
                  <li
                    key={i}
                    className={`border rounded-lg px-3 py-2 text-sm ${
                      c.verified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-semibold">{c.display}</span>
                      {c.verified ? (
                        <span className="text-xs text-green-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> verifiziert
                        </span>
                      ) : (
                        <span className="text-xs text-amber-800 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> nicht verifiziert
                        </span>
                      )}
                    </div>
                    {c.excerpt && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 leading-snug">{c.excerpt}</p>
                    )}
                    {!c.verified && (
                      <p className="text-xs text-amber-800 mt-1">
                        Paragraph nicht in unserer lokalen Gesetzessammlung gefunden. Vor Verwendung
                        manuell gegenprüfen (Halluzination möglich).
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--color-border)]">
            {!savedItem && (
              <button
                onClick={onSave}
                className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
              >
                <Save className="w-4 h-4" /> Speichern{selectedCaseId ? ' in Akte' : ''}
              </button>
            )}
            {savedItem && !savedItem.reviewed && (
              <button
                onClick={onMarkReviewed}
                className="inline-flex items-center gap-1.5 text-sm bg-green-700 text-white rounded-lg px-3 py-1.5 hover:opacity-90"
              >
                <CheckCircle2 className="w-4 h-4" /> Als geprüft markieren
              </button>
            )}
            {savedItem && (
              <button
                onClick={onExportPDF}
                className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
              >
                <Download className="w-4 h-4" /> Branded PDF exportieren
              </button>
            )}
            {savedItem?.reviewed && (
              <span className="text-xs text-green-700">✓ Als geprüft markiert</span>
            )}
          </footer>
        </article>
      )}
    </div>
  )
}
