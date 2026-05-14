/**
 * DocumentReviewPanel
 *
 * Erscheint in der Akten-Detail-View unterhalb jedes Mandant-Uploads.
 * Zeigt den aktuellen Review-Status und erlaubt Bao/Refa das Bestätigen
 * oder Zurückgeben mit Kommentar.
 *
 * Nur für Docs mit uploadedBy === 'mandant' — für Kanzlei-eigene Uploads
 * rendert die Komponente nichts.
 */

import { useState, useEffect } from 'react'
import { Check, AlertTriangle, Clock, RotateCcw, Eye, X, RefreshCw } from 'lucide-react'
import type { CaseDocument } from './types'
import { getStoredSessionToken } from './store'
import { pullFromCloud } from './sync'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

/** HTTP 404 erkennbar an Statuscode oder an bestimmten Fehlertexten */
function is404(error: string): boolean {
  return (
    error.includes('nicht in der Datenbank') ||
    error.includes('bereits gelöscht') ||
    error.includes('404')
  )
}

interface Props {
  document: CaseDocument
  onUpdate: (newDoc: CaseDocument) => void
  /** Optional: aufgerufen nach erfolgreichem Review damit Parent sofort refreshen kann. */
  onReviewed?: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

type ReviewResult =
  | { document: CaseDocument; error?: never }
  | { document?: never; error: string }

async function postReview(
  documentId: string,
  action: 'approve' | 'reject',
  comment?: string,
): Promise<ReviewResult> {
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
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null
      return { error: body?.error ?? `Server-Fehler (${res.status}) — bitte Akte refreshen` }
    }
    const json = await res.json() as { ok: boolean; document: CaseDocument }
    if (!json.document) return { error: 'Server hat kein Dokument zurückgegeben' }
    return { document: json.document }
  } catch {
    return { error: 'Verbindung unterbrochen — bitte WLAN/Internet prüfen' }
  }
}

// ---------------------------------------------------------------------------
// Datei-Vorschau-Modal (Bug C)
// Lädt die Datei per fetch mit Bearer-Token → Blob-URL (kein auth-Header-Leak)
// ---------------------------------------------------------------------------

function DocPreviewModal({
  doc,
  onClose,
}: {
  doc: CaseDocument
  onClose: () => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const id = doc.serverDocumentId ?? doc.id
  const isPdf = doc.mimeType?.includes('pdf')
  // External dataUrl (z.B. visa-kompass Vercel-Blob) — direkt anzeigen, kein vault-lookup.
  const externalUrl =
    typeof doc.dataUrl === 'string' && /^https?:\/\//.test(doc.dataUrl) ? doc.dataUrl : null

  useEffect(() => {
    if (externalUrl) {
      // Externe URL: nicht durch /api/pro/upload routen
      setBlobUrl(externalUrl)
      return
    }
    const token = getStoredSessionToken()
    let revoke = ''
    fetch(`${API_URL}/api/pro/upload?id=${encodeURIComponent(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null) as { error?: string } | null
          throw new Error(body?.error ?? `HTTP ${r.status}`)
        }
        return r.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        revoke = url
        setBlobUrl(url)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Datei konnte nicht geladen werden')
      })
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, externalUrl])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
          <span className="text-sm font-medium truncate max-w-[80%]">{doc.originalName}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 bg-[var(--color-bg-alt)] flex items-center justify-center p-4">
          {loadError && (
            <p className="text-sm text-red-600">{loadError}</p>
          )}
          {!blobUrl && !loadError && (
            <p className="text-sm text-[var(--color-ink-muted)]">Laden…</p>
          )}
          {blobUrl && (
            isPdf ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-[var(--color-ink-muted)]">PDF-Vorschau</p>
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-[var(--color-gold)] text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                  PDF in neuem Tab öffnen
                </a>
              </div>
            ) : (
              <img
                src={blobUrl}
                alt={doc.originalName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function DocumentReviewPanel({ document: doc, onUpdate, onReviewed }: Props) {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefreshAkte() {
    setRefreshing(true)
    try {
      await pullFromCloud()
      onReviewed?.()
    } finally {
      setRefreshing(false)
    }
  }

  // Nur Mandant-Uploads brauchen einen Review-Workflow
  if (doc.uploadedBy !== 'mandant') return null

  const status = doc.reviewStatus ?? 'pending'

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(true)
    setError(null)
    const result = await postReview(doc.id, action, action === 'reject' ? comment.trim() : undefined)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowComment(false)
    setComment('')
    onUpdate({ ...doc, ...result.document })
    onReviewed?.()
  }

  // ── Anzeigen-Button (immer sichtbar wenn serverDocumentId vorhanden) ────────
  const hasServerDoc = Boolean(doc.serverDocumentId ?? doc.id)

  const previewButton = hasServerDoc ? (
    <button
      onClick={() => setShowPreview(true)}
      className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 hover:bg-[var(--color-bg-alt)] transition-colors"
      title="Datei anzeigen"
    >
      <Eye className="w-3.5 h-3.5" />
      Anzeigen
    </button>
  ) : null

  // ── Bestätigt ─────────────────────────────────────────────────────────────
  if (status === 'approved') {
    return (
      <>
        {showPreview && <DocPreviewModal doc={doc} onClose={() => setShowPreview(false)} />}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>
              Bestätigt
              {doc.reviewedAt ? ` am ${formatDate(doc.reviewedAt)}` : ''}
              {doc.reviewedBy ? ` von ${doc.reviewedBy}` : ''}
            </span>
          </div>
          {previewButton}
        </div>
      </>
    )
  }

  // ── Zurückgegeben ─────────────────────────────────────────────────────────
  if (status === 'rejected') {
    return (
      <>
        {showPreview && <DocPreviewModal doc={doc} onClose={() => setShowPreview(false)} />}
        <div className="mt-2 space-y-1">
          <div className="flex items-start gap-1.5 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Zurückgegeben
              {doc.reviewedAt ? ` am ${formatDate(doc.reviewedAt)}` : ''}
              {doc.reviewComment ? ` — Hinweis: „${doc.reviewComment}"` : ''}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShowComment(false); setComment(''); handleAction('approve') }}
              disabled={loading}
              className="text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3 inline mr-1" />
              Doch bestätigen
            </button>
            {previewButton}
          </div>
        </div>
      </>
    )
  }

  // ── Ausstehend ────────────────────────────────────────────────────────────
  return (
    <>
      {showPreview && <DocPreviewModal doc={doc} onClose={() => setShowPreview(false)} />}
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Wartet auf Prüfung — Mandant-Upload</span>
        </div>

        {!showComment ? (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs bg-green-600 text-white rounded-md px-2.5 py-1.5 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Geprüft + bestätigen
            </button>
            <button
              onClick={() => setShowComment(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs bg-orange-100 text-orange-800 border border-orange-300 rounded-md px-2.5 py-1.5 hover:bg-orange-200 disabled:opacity-50 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Zurück an Mandant
            </button>
            {previewButton}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder='Hinweis an Mandant (z. B. "Bitte mit höherer Auflösung erneut hochladen")'
              rows={2}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400 resize-none"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleAction('reject')}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs bg-orange-600 text-white rounded-md px-2.5 py-1.5 hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {loading ? 'Speichern…' : 'Zurückgeben'}
              </button>
              <button
                onClick={() => { setShowComment(false); setComment(''); setError(null) }}
                disabled={loading}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
              >
                Abbrechen
              </button>
              {previewButton}
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-1.5">
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </p>
            {is404(error) && (
              <button
                onClick={() => { void handleRefreshAkte() }}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 hover:bg-[var(--color-bg-alt)] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Wird aktualisiert…' : 'Akte aktualisieren'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
