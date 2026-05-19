/**
 * BulkSuggestModal — KI-Vorprüfung aller pending Mandant-Uploads einer Akte.
 *
 * Bao klickt "Alle Mandant-Uploads prüfen lassen", Claude Haiku bewertet pro
 * Doc (matchesChecklist, confidence, action). UI rendert pro Doc Suggestion +
 * Approve/Reject/Skip + Bulk-Action "Alle ≥80% Confidence übernehmen".
 *
 * Falls ANTHROPIC_API_KEY in Vercel fehlt: Endpoint liefert hasAi=false und alle
 * Items als 'review-manually' — UI zeigt entsprechenden Banner.
 */

import { useEffect, useMemo, useState } from 'react'
import { X, Check, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import type { CaseDocument, MandantCase } from './types'
import { getStoredSessionToken } from './store'
import { getChecklistById } from './mandatsart-checklists'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

interface Suggestion {
  docId: string
  suggestedAction: 'approve' | 'review-manually' | 'reject'
  confidence: number
  reason: string
  matchesChecklist: boolean
}

interface Props {
  case: MandantCase
  pendingDocs: CaseDocument[]
  onClose: () => void
  onReviewed: () => void
}

async function fetchSuggestions(caseId: string): Promise<{ items: Suggestion[]; hasAi: boolean } | { error: string }> {
  const token = getStoredSessionToken()
  try {
    const res = await fetch(`${API_URL}/api/pro/document-bulk-suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ caseId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null
      return { error: body?.error ?? `Server-Fehler (${res.status})` }
    }
    return await res.json() as { items: Suggestion[]; hasAi: boolean }
  } catch {
    return { error: 'Verbindung unterbrochen — bitte WLAN prüfen.' }
  }
}

async function postReview(documentId: string, action: 'approve' | 'reject', comment?: string): Promise<boolean> {
  const token = getStoredSessionToken()
  try {
    const res = await fetch(`${API_URL}/api/pro/document-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ documentId, action, comment }),
    })
    return res.ok
  } catch {
    return false
  }
}

type DocState = 'pending' | 'applying' | 'done' | 'skipped' | 'failed'

export default function BulkSuggestModal({ case: c, pendingDocs, onClose, onReviewed }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAi, setHasAi] = useState<boolean>(true)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [docStates, setDocStates] = useState<Record<string, DocState>>({})
  const [bulkRunning, setBulkRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetchSuggestions(c.id)
      if (cancelled) return
      if ('error' in res) {
        setError(res.error)
      } else {
        setSuggestions(res.items)
        setHasAi(res.hasAi)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [c.id])

  const labelByItemId = useMemo(() => {
    const m = new Map<string, string>()
    if (c.mandatsartId) {
      const cl = getChecklistById(c.mandatsartId)
      cl?.requiredDocuments.forEach(i => m.set(i.id, i.label))
    }
    return m
  }, [c.mandatsartId])

  const docById = useMemo(() => {
    const m = new Map<string, CaseDocument>()
    for (const d of pendingDocs) m.set(d.id, d)
    return m
  }, [pendingDocs])

  async function applyOne(docId: string, action: 'approve' | 'reject', comment?: string) {
    setDocStates(s => ({ ...s, [docId]: 'applying' }))
    const ok = await postReview(docId, action, comment)
    setDocStates(s => ({ ...s, [docId]: ok ? 'done' : 'failed' }))
  }

  async function skipOne(docId: string) {
    setDocStates(s => ({ ...s, [docId]: 'skipped' }))
  }

  async function runBulk() {
    setBulkRunning(true)
    const eligible = suggestions.filter(s =>
      s.suggestedAction === 'approve' &&
      s.confidence >= 0.8 &&
      docStates[s.docId] !== 'done',
    )
    // Sequenziell — sonst rate-limit am document-review Endpoint
    for (const s of eligible) {
      await applyOne(s.docId, 'approve')
    }
    setBulkRunning(false)
    onReviewed()
  }

  function handleClose() {
    onReviewed()
    onClose()
  }

  const eligibleCount = suggestions.filter(s =>
    s.suggestedAction === 'approve' &&
    s.confidence >= 0.8 &&
    docStates[s.docId] !== 'done',
  ).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-2xl border border-[var(--color-border)] max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
            <h2 className="font-semibold">KI-Vorprüfung Mandant-Uploads</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)]"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Claude prüft {pendingDocs.length} Docs — kann ~20 Sekunden dauern…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {!loading && !error && !hasAi && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2">
              ANTHROPIC_API_KEY ist im Vercel-Backend nicht gesetzt. Die Vorprüfung läuft im Manuell-Modus —
              du kannst trotzdem pro Doc Approve/Reject klicken, aber ohne KI-Empfehlung.
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <p className="text-sm text-[var(--color-ink-muted)]">Keine pending Mandant-Uploads in dieser Akte.</p>
          )}

          {!loading && !error && suggestions.length > 0 && hasAi && eligibleCount > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-green-900">
                <strong>{eligibleCount}</strong> Dokument{eligibleCount === 1 ? '' : 'e'} mit KI-Confidence ≥80% — bereit zur Bulk-Bestätigung.
              </p>
              <button
                onClick={() => void runBulk()}
                disabled={bulkRunning}
                className="text-sm bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {bulkRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Alle ≥80% übernehmen
              </button>
            </div>
          )}

          {suggestions.map(s => {
            const doc = docById.get(s.docId)
            if (!doc) return null
            const state = docStates[s.docId] ?? 'pending'
            const label = doc.checklistItemId ? labelByItemId.get(doc.checklistItemId) : null
            const actionColor =
              s.suggestedAction === 'approve' ? 'bg-green-100 text-green-800 border-green-300' :
              s.suggestedAction === 'reject' ? 'bg-red-100 text-red-800 border-red-300' :
              'bg-slate-100 text-slate-700 border-slate-300'
            const actionLabel =
              s.suggestedAction === 'approve' ? 'KI: bestätigen' :
              s.suggestedAction === 'reject' ? 'KI: ablehnen' :
              'KI: manuell prüfen'
            return (
              <div
                key={s.docId}
                className={`rounded-lg border p-3 space-y-2 ${
                  state === 'done' ? 'bg-green-50 border-green-200 opacity-70' :
                  state === 'skipped' ? 'opacity-50' :
                  state === 'failed' ? 'border-red-300 bg-red-50' :
                  'border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {label && (
                      <div className="text-xs font-medium text-[var(--color-ink)] mb-0.5">{label}</div>
                    )}
                    <div className="text-sm font-mono text-[var(--color-ink-soft)] truncate">{doc.originalName}</div>
                    <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                      {doc.mimeType} • {Math.round(doc.sizeBytes / 1024)} KB
                    </div>
                  </div>
                  {hasAi && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${actionColor}`}>
                        {actionLabel}
                      </span>
                      <span className="text-[11px] text-[var(--color-ink-muted)] font-mono">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                {s.reason && (
                  <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">{s.reason}</p>
                )}
                {state === 'pending' && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => void applyOne(s.docId, 'approve')}
                      className="inline-flex items-center gap-1 text-xs bg-green-600 text-white rounded-md px-2.5 py-1 hover:bg-green-700"
                    >
                      <Check className="w-3 h-3" /> Bestätigen
                    </button>
                    <button
                      onClick={() => void applyOne(s.docId, 'reject', s.reason || 'Bitte erneut hochladen')}
                      className="inline-flex items-center gap-1 text-xs bg-orange-600 text-white rounded-md px-2.5 py-1 hover:bg-orange-700"
                    >
                      <AlertTriangle className="w-3 h-3" /> Ablehnen
                    </button>
                    <button
                      onClick={() => void skipOne(s.docId)}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1"
                    >
                      Überspringen (manuell)
                    </button>
                  </div>
                )}
                {state === 'applying' && (
                  <div className="text-xs text-[var(--color-ink-muted)] inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Wird angewendet…
                  </div>
                )}
                {state === 'done' && (
                  <div className="text-xs text-green-700 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Übernommen
                  </div>
                )}
                {state === 'failed' && (
                  <div className="text-xs text-red-700 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Fehlgeschlagen — bitte manuell in der Checkliste prüfen
                  </div>
                )}
                {state === 'skipped' && (
                  <div className="text-xs text-[var(--color-ink-muted)]">Übersprungen — wird in Checkliste manuell geprüft</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2 shrink-0">
          <button
            onClick={handleClose}
            className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--color-bg-alt)]"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
