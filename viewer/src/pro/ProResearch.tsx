/**
 * Recherche page — AI Q&A with verified citations.
 *
 * Flow:
 *   1. Anwält:in types question (optionally tied to a Mandant:innen-Akte)
 *   2. We call proAsk (structured output: antwort + zitate[])
 *   3. We verify each cited paragraph against our local law corpus
 *   4. Display answer with citations; click a citation → drawer with full text
 *   5. Save to case + export branded PDF
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2, Save, Download, CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, Shield } from 'lucide-react'
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
import { anonymize, hasPII, isDsgvoModusActive } from './anonymize'
import CitationDrawer from './CitationDrawer'
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
  const [openCitation, setOpenCitation] = useState<Citation | null>(null)
  const [showPrivacyGate, setShowPrivacyGate] = useState(false)

  useEffect(() => {
    if (initialCaseId) setSelectedCaseId(initialCaseId)
  }, [initialCaseId])

  async function onAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    if (!isDsgvoModusActive() && hasPII(question)) {
      setShowPrivacyGate(true)
      return
    }
    setLoading(true)
    setError(null)
    setAnswer('')
    setCitations([])
    setSavedItem(null)
    // DSGVO-Modus: auto-anonymize vor dem Senden, ohne Frage im Textfeld zu ändern
    let questionForAi = question
    if (isDsgvoModusActive()) {
      const { anonymized, replacements } = anonymize(question)
      if (replacements.length > 0) {
        questionForAi = anonymized
        setAnonymizeFeedback({
          tone: 'success',
          text: `🛡 DSGVO-Modus: ${replacements.length} Stelle(n) automatisch ersetzt vor KI-Versand.`,
        })
        setTimeout(() => setAnonymizeFeedback(null), 6000)
      }
    }
    try {
      const { antwort, zitate } = await proAsk(questionForAi)
      setAnswer(antwort)
      const cites = await verifyAllCitations(zitate)
      setCitations(cites)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OpenAI hat keine Antwort zurückgegeben. In 10 Sekunden erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  function resetForNewQuestion() {
    setQuestion('')
    setAnswer('')
    setCitations([])
    setSavedItem(null)
    setError(null)
  }

  function onAnonymize() {
    const { anonymized, replacements } = anonymize(question)
    if (replacements.length === 0) {
      setAnonymizeFeedback({ tone: 'neutral', text: 'Keine personenbezogenen Daten erkannt — die Frage ist bereits sicher.' })
      setTimeout(() => setAnonymizeFeedback(null), 4000)
      return
    }
    setQuestion(anonymized)
    setAnonymizeFeedback({
      tone: 'success',
      text: `${replacements.length} Stelle(n) ersetzt: ` +
        replacements.slice(0, 5).map(r => `${r.original} → ${r.placeholder}`).join(' · ') +
        (replacements.length > 5 ? ` (+${replacements.length - 5})` : ''),
    })
    setTimeout(() => setAnonymizeFeedback(null), 6000)
  }

  const piiDetected = question && hasPII(question)
  const [anonymizeFeedback, setAnonymizeFeedback] = useState<{ tone: 'success' | 'neutral'; text: string } | null>(null)

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
    <>
      <div className="space-y-6">
        <header>
          <h1 className="h-page">Recherche</h1>
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Antwort suchen · §§ prüfen' : 'Frage stellen'}
            </button>
            {piiDetected && (
              <button
                type="button"
                onClick={onAnonymize}
                className="inline-flex items-center gap-1.5 text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 hover:bg-amber-100"
                title="Namen, Adressen und Kontaktdaten durch Platzhalter ersetzen, bevor die Frage an OpenAI geht"
              >
                <Shield className="w-4 h-4" /> Anonymisieren
              </button>
            )}
            {(answer || question) && (
              <button
                type="button"
                onClick={resetForNewQuestion}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                title="Frage und Antwort verwerfen"
              >
                <RotateCcw className="w-4 h-4" /> Neue Frage
              </button>
            )}
          </div>
          {piiDetected && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <strong>Hinweis:</strong> Die Frage enthält potenziell personenbezogene Daten (Namen,
              Adressen, E-Mails). Vor dem Absenden an die KI empfehlen wir die Anonymisierung —
              Recherche-Fragen gehen an OpenAI (USA) ohne AVV.
            </div>
          )}
          {anonymizeFeedback && (
            <div
              className={`text-xs rounded px-3 py-2 transition-opacity ${
                anonymizeFeedback.tone === 'success'
                  ? 'text-green-900 bg-green-50 border border-green-200'
                  : 'text-[var(--color-ink-soft)] bg-[var(--color-bg-alt)] border border-[var(--color-border)]'
              }`}
            >
              {anonymizeFeedback.text}
            </div>
          )}

          {/* Example questions — always visible so the Anwält:in can cycle quickly */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] mb-2">
              <Lightbulb className="w-3.5 h-3.5" /> Beispielfragen (klicken zum Übernehmen):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(ex)}
                  className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] text-[var(--color-ink-soft)]"
                >
                  {ex.length > 55 ? ex.slice(0, 55) + '…' : ex}
                </button>
              ))}
            </div>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
        )}

        {showPrivacyGate && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-amber-900 font-semibold">
              Datenschutz-Hinweis vor KI-Versand
            </p>
            <p className="text-sm text-amber-800">
              Die Frage enthaelt potenziell personenbezogene Daten und der DSGVO-Schutz-Modus ist aktuell deaktiviert.
              Vor dem Versand an die KI sollte die Frage anonymisiert werden.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onAnonymize()
                  setShowPrivacyGate(false)
                }}
                className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-2 hover:opacity-90"
              >
                <Shield className="w-4 h-4" /> Jetzt anonymisieren
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowPrivacyGate(false)
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
                    setError(err instanceof Error ? err.message : 'OpenAI hat keine Antwort zurückgegeben. In 10 Sekunden erneut versuchen.')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm border border-amber-400 text-amber-900 rounded-lg px-3 py-2 hover:bg-amber-100"
              >
                Trotzdem senden
              </button>
              <button
                type="button"
                onClick={() => setShowPrivacyGate(false)}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
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
                    {verifiedCount}/{citations.length} verifiziert · klicken für Volltext
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
                      onClick={() => setOpenCitation(c)}
                      style={{ animationDelay: `${i * 70}ms` }}
                      className={`border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors animate-fade-slide-up active:scale-[0.98] ${
                        c.verified
                          ? 'border-green-200 bg-green-50 hover:border-green-400'
                          : 'border-amber-200 bg-amber-50 hover:border-amber-400'
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
                  <Download className="w-4 h-4" /> Branded PDF
                </button>
              )}
              {savedItem?.reviewed && (
                <span className="text-xs text-green-700">✓ Als geprüft markiert</span>
              )}
            </footer>
          </article>
        )}
      </div>

      <CitationDrawer citation={openCitation} onClose={() => setOpenCitation(null)} />
    </>
  )
}
