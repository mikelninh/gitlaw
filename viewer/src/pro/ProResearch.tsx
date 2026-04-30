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

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Loader2, Save, Download, CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, Shield } from 'lucide-react'
import { EXAMPLE_QUESTIONS, proAsk } from './ai'
import {
  getApprovedMemoryExamples,
  getCase,
  getSettings,
  listCases,
  listResearch,
  listApprovedAnswerMemory,
  markResearchReviewed,
  saveApprovedAnswerMemory,
  saveResearch,
} from './store'
import { verifyAllCitations } from './verify'
import { exportResearchPDF } from './pdf'
import { anonymize, hasPII, isDsgvoModusActive } from './anonymize'
import CitationDrawer from './CitationDrawer'
import type { Citation, ResearchQuery } from './types'

interface ResearchTurn {
  question: string
  answer: string
  citations: Citation[]
  savedItem: ResearchQuery | null
}

export default function ProResearch() {
  const [params, setParams] = useSearchParams()
  const initialCaseId = params.get('case') || ''
  const refResearchId = params.get('ref') || ''
  const cases = listCases().filter(c => c.status === 'aktiv')
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [savedItem, setSavedItem] = useState<ResearchQuery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openCitation, setOpenCitation] = useState<Citation | null>(null)
  const [showPrivacyGate, setShowPrivacyGate] = useState(false)
  const [history, setHistory] = useState<ResearchTurn[]>([])
  const [approvedAnswerDraft, setApprovedAnswerDraft] = useState('')

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
    if (answer) {
      setHistory(prev => [
        ...prev,
        { question, answer, citations, savedItem },
      ])
    }
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
      const context = history.slice(-2).map((t, i) => (
        `Vorfrage ${i + 1}: ${t.question}\nVorantwort ${i + 1}: ${t.answer}`
      )).join('\n\n')
      const prompt = context
        ? `${context}\n\nAktuelle Frage: ${questionForAi}`
        : questionForAi
      const { antwort, zitate } = await proAsk(prompt, {
        approvedMemory: getApprovedMemoryExamples(questionForAi, 3),
      })
      setAnswer(antwort)
      const cites = await verifyAllCitations(zitate)
      setCitations(cites)
      setApprovedAnswerDraft(antwort)
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
    setApprovedAnswerDraft('')
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

  function onSaveHistory(index: number) {
    const t = history[index]
    if (!t || t.savedItem) return
    const saved = saveResearch({
      caseId: selectedCaseId || undefined,
      question: t.question,
      answer: t.answer,
      citations: t.citations,
      reviewed: false,
    })
    setHistory(prev => prev.map((x, i) => (i === index ? { ...x, savedItem: saved } : x)))
  }

  function onMarkReviewedHistory(index: number) {
    const t = history[index]
    if (!t?.savedItem) return
    markResearchReviewed(t.savedItem.id, t.savedItem.answer)
    saveApprovedAnswerMemory({
      caseId: t.savedItem.caseId,
      question: t.savedItem.question,
      approvedAnswer: t.savedItem.answer,
      sourceResearchId: t.savedItem.id,
    })
    setHistory(prev => prev.map((x, i) => (
      i === index && x.savedItem
        ? { ...x, savedItem: { ...x.savedItem, reviewed: true, approvedAnswer: x.savedItem.answer } }
        : x
    )))
  }

  function onExportHistoryPDF(index: number) {
    const t = history[index]
    if (!t?.savedItem) return
    const settings = getSettings()
    const caseInfo = t.savedItem.caseId ? getCase(t.savedItem.caseId) : undefined
    exportResearchPDF({ settings, research: t.savedItem, caseInfo })
  }

  function onMarkReviewed() {
    if (!savedItem) return
    const finalApprovedAnswer = approvedAnswerDraft.trim() || savedItem.answer
    markResearchReviewed(savedItem.id, finalApprovedAnswer)
    saveApprovedAnswerMemory({
      caseId: savedItem.caseId,
      question: savedItem.question,
      approvedAnswer: finalApprovedAnswer,
      sourceResearchId: savedItem.id,
    })
    setSavedItem({
      ...savedItem,
      reviewed: true,
      approvedAnswer: finalApprovedAnswer,
    })
  }

  function onExportPDF() {
    if (!savedItem) return
    const settings = getSettings()
    const caseInfo = savedItem.caseId ? getCase(savedItem.caseId) : undefined
    exportResearchPDF({ settings, research: savedItem, caseInfo })
  }

  const verifiedCount = citations.filter(c => c.verified).length
  const memoryItems = listApprovedAnswerMemory().slice(0, 5)
  const linkedResearch = selectedCaseId ? listResearch(selectedCaseId).find(r => r.id === refResearchId) : undefined

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

        {linkedResearch && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-green-800 font-semibold">Verknüpfte Recherche</p>
                <p className="font-medium mt-1">{linkedResearch.question}</p>
                <p className="text-xs text-green-900/80 mt-1">
                  {new Date(linkedResearch.createdAt).toLocaleDateString('de-DE')} · {linkedResearch.citations.length} Zitate
                  {linkedResearch.reviewed ? ' · geprüft' : ' · ungeprüft'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuestion(linkedResearch.question)
                    setAnswer(linkedResearch.answer)
                    setCitations(linkedResearch.citations)
                    setSavedItem(linkedResearch)
                    setApprovedAnswerDraft(linkedResearch.approvedAnswer || linkedResearch.answer)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="text-xs bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
                >
                  In Frage übernehmen
                </button>
              </div>
            </div>
          </section>
        )}

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

        {history.length > 0 && (
          <section className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
                Verlauf ({history.length})
              </h2>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Verlauf leeren
              </button>
            </div>
            <ul className="space-y-3">
              {history.map((t, i) => (
                <li key={i} className="border border-[var(--color-border)] rounded-xl p-3">
                  <p className="text-sm font-medium mb-1">{t.question}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] line-clamp-3 whitespace-pre-wrap">{t.answer}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {!t.savedItem && (
                      <button
                        type="button"
                        onClick={() => onSaveHistory(i)}
                        className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-ink)] text-white rounded-lg px-2 py-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Speichern
                      </button>
                    )}
                    {t.savedItem && !t.savedItem.reviewed && (
                      <button
                        type="button"
                        onClick={() => onMarkReviewedHistory(i)}
                        className="inline-flex items-center gap-1.5 text-xs bg-green-700 text-white rounded-lg px-2 py-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Als geprüft markieren
                      </button>
                    )}
                    {t.savedItem && (
                      <button
                        type="button"
                        onClick={() => onExportHistoryPDF(i)}
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-[var(--color-border)] rounded-lg px-2 py-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {memoryItems.length > 0 && (
          <section className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
              Freigegebene Kanzlei-Memory ({memoryItems.length})
            </h2>
            <ul className="space-y-2">
              {memoryItems.map(m => (
                <li key={m.id} className="border border-[var(--color-border)] rounded-xl p-3">
                  <p className="text-sm font-medium">{m.question}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] mt-1 line-clamp-3 whitespace-pre-wrap">{m.approvedAnswer}</p>
                </li>
              ))}
            </ul>
          </section>
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
                    const context = history.slice(-2).map((t, i) => (
                      `Vorfrage ${i + 1}: ${t.question}\nVorantwort ${i + 1}: ${t.answer}`
                    )).join('\n\n')
                    const prompt = context
                      ? `${context}\n\nAktuelle Frage: ${question}`
                      : question
                    const { antwort, zitate } = await proAsk(prompt, {
                      approvedMemory: getApprovedMemoryExamples(question, 3),
                    })
                    setAnswer(antwort)
                    const cites = await verifyAllCitations(zitate)
                    setCitations(cites)
                    setApprovedAnswerDraft(antwort)
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
            <div
              className={`text-xs rounded-lg px-3 py-2 border ${
                savedItem?.reviewed
                  ? 'bg-green-50 text-green-900 border-green-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {savedItem?.reviewed
                ? 'Status: geprueft/finalisiert durch Anwalt.'
                : 'Status: Entwurf (ungeprueft). Vor externer Nutzung pruefen.'}
            </div>
            <section>
              <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
                Antwort
              </h2>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
            </section>

            <section>
              <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
                Freigabefassung
              </h2>
              <textarea
                value={approvedAnswerDraft}
                onChange={e => setApprovedAnswerDraft(e.target.value)}
                rows={8}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                placeholder="Hier kann die finale anwaltlich gepruefte Fassung angepasst werden. Diese Version wird spaeter als Memory-Beispiel genutzt."
              />
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
              <button
                type="button"
                onClick={() => {
                  const q = question.trim()
                  const follow = answer
                    ? `${q ? `${q}\n` : ''}Bitte vertiefe die vorige Antwort und nenne Gegenargumente, Risiken und prozesstaktische Optionen.`
                    : 'Bitte vertiefe die vorige Antwort und nenne Gegenargumente, Risiken und prozesstaktische Optionen.'
                  setQuestion(follow)
                }}
                className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
              >
                Vertiefungsfrage vorbereiten
              </button>
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
