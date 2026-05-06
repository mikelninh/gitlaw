/**
 * AkteSummaryDrawer — „Akte zusammenfassen" per KI.
 *
 * Anonymisiert den Akten-Kontext client-seitig, schickt ihn an
 * /api/pro/akte-summary und zeigt das Ergebnis im Drawer an.
 *
 * Feature §14 — Bao-Pilot Sprint 1.
 * Voice: respektvoll-warm, kein Marketing-Deutsch.
 */

import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { MandantCase, KanzleiSettings } from './types'
import { anonymize } from './anonymize'
import { getStoredSessionToken } from './store'
import { formatFehlendeUnterlagen } from './case-status'

interface Props {
  case: MandantCase
  settings: KanzleiSettings
  onClose: () => void
}

/**
 * Baut einen anonymisierten Freitext aus den Akten-Daten —
 * dieser geht an die LLM, kein PII.
 */
function buildAkteContext(c: MandantCase): string {
  const lines: string[] = [
    `Mandatsart: ${c.mandatsartId ?? 'nicht angegeben'}`,
    `Status: ${c.caseStatus ?? 'unterlagen_fehlen'}`,
    `Beschreibung: ${c.description || 'keine'}`,
  ]

  if (c.behoerde) {
    lines.push(`Zuständige Behörde: ${c.behoerde}`)
  }

  if (c.fristDatum) {
    const frist = new Date(c.fristDatum).toLocaleDateString('de-DE')
    lines.push(`Frist: ${frist}${c.fristBezeichnung ? ` (${c.fristBezeichnung})` : ''}`)
  }

  const fehlend = formatFehlendeUnterlagen(c, 'de')
  if (fehlend) {
    lines.push(`Fehlende Unterlagen:\n${fehlend}`)
  } else if (c.mandatsartId) {
    lines.push('Fehlende Unterlagen: keine (Checkliste vollständig)')
  }

  // Dokument-Anzahl als grober Indikator
  if (c.documents && c.documents.length > 0) {
    lines.push(`Hochgeladene Dokumente: ${c.documents.length}`)
  }

  // Aufgaben
  if (c.tasks && c.tasks.length > 0) {
    const openTasks = c.tasks.filter(t => !t.done)
    lines.push(`Team-Aufgaben offen: ${openTasks.length} / ${c.tasks.length}`)
  }

  return lines.join('\n')
}

export default function AkteSummaryDrawer({ case: c, settings, onClose }: Props) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [copied, setCopied] = useState(false)

  async function generateSummary() {
    setLoading(true)
    setError('')
    setSummary('')

    const rawContext = buildAkteContext(c)
    const { anonymized } = anonymize(rawContext)

    const kanzleiContext = [settings.name, settings.anwaltName]
      .filter(Boolean)
      .join(', ')

    try {
      const token = getStoredSessionToken()
      const res = await fetch('/api/pro/akte-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ akteContext: anonymized, kanzleiContext }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Fehler ${res.status}`)
        return
      }

      setSummary(data.summary ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler.')
    } finally {
      setLoading(false)
    }
  }

  // Beim Öffnen direkt generieren
  useEffect(() => {
    generateSummary()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape schließt
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function copySummary() {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold">Akte zusammenfassen</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-[var(--color-gold)]">{c.aktenzeichen}</span>
              <span className="text-xs text-[var(--color-ink-muted)]">{c.mandantName}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded border bg-amber-100 border-amber-200 text-amber-800">
                KI-generiert
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors shrink-0"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] animate-pulse">
              <span>Zusammenfassung wird erstellt…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
              <button
                onClick={generateSummary}
                className="ml-2 underline text-red-700 hover:text-red-900"
              >
                nochmal versuchen
              </button>
            </div>
          )}

          {summary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Fakten-Zusammenfassung
                </p>
                <button
                  onClick={copySummary}
                  className={`inline-flex items-center gap-1.5 text-xs rounded-lg border px-3 py-1.5 transition-all ${
                    copied
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
              <textarea
                readOnly
                value={summary}
                className="w-full min-h-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Diese Zusammenfassung wurde KI-generiert. Sie ersetzt keine anwaltliche Prüfung.
          </p>
          <button
            onClick={onClose}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-gold)] transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
