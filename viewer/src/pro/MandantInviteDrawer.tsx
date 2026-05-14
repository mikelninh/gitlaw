/**
 * Drawer zum Erstellen eines Mandant-Portal-Links fuer eine Akte.
 *
 * Bao klickt "Mandant einladen" -> POST /api/pro/mandant-invite -> Link + WhatsApp-Button.
 * Kein QR-Code hier (der Mandant bekommt den Link per WhatsApp auf sein Handy).
 */

import { useState } from 'react'
import { Copy, Check, X, MessageCircle, AlertTriangle, ExternalLink } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

interface Props {
  caseId: string
  mandantName: string
  onClose: () => void
  sessionToken: string | null
}

type Lang = 'de' | 'vi'

function buildWaMessage(lang: Lang, mandantUrl: string): string {
  if (lang === 'de') {
    return `Hallo, hier ist Ihr Zugang zu Ihrer Akte bei der Kanzlei:\n${mandantUrl}\n\nDort können Sie fehlende Dokumente hochladen und den Stand verfolgen. Der Link ist 30 Tage gültig.`
  }
  // TODO: VI native review by Bao or Refa
  return `Xin chào, đây là đường link vào hồ sơ của bạn:\n${mandantUrl}\n\nBạn có thể tải lên các tài liệu còn thiếu và theo dõi tiến độ. Link có hiệu lực trong 30 ngày.`
}

export default function MandantInviteDrawer({ caseId, mandantName, onClose, sessionToken }: Props) {
  const [lang, setLang] = useState<Lang>('de')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ token: string; mandantUrl: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function createInvite() {
    if (!sessionToken) {
      setError('Keine aktive Pro-Session. Bitte neu einloggen.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Sicherstellen dass die Akte im Backend liegt — sonst findet der
      // Mandant-Endpoint sie spaeter nicht.
      const { pushToCloud } = await import('./sync')
      await pushToCloud().catch(() => { /* non-blocking, falls Cloud-Sync aus */ })

      const resp = await fetch(`${API_URL}/api/pro/mandant-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ caseId, lang, expiresInDays: 30 }),
      })
      const data = await resp.json() as { ok?: boolean; token?: string; mandantUrl?: string; expiresAt?: string; error?: string }
      if (!resp.ok || !data.ok) {
        setError(data.error ?? `Fehler (HTTP ${resp.status})`)
        return
      }
      setResult({ token: data.token!, mandantUrl: data.mandantUrl!, expiresAt: data.expiresAt! })
    } catch {
      setError('Verbindung zum Server nicht moeglich.')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!result) return
    void navigator.clipboard.writeText(result.mandantUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const waMessage = result ? buildWaMessage(lang, result.mandantUrl) : ''
  const waUrl = result ? `https://wa.me/?text=${encodeURIComponent(waMessage)}` : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-[var(--color-border)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">Mandant einladen</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{mandantName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {!result && (
            <>
              {/* Sprache */}
              <div>
                <label className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide block mb-2">
                  Sprache des Mandant-Portals
                </label>
                <div className="flex gap-2">
                  {(['de', 'vi'] as Lang[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        lang === l
                          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                          : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink-soft)]'
                      }`}
                    >
                      {l === 'de' ? 'Deutsch' : 'Tieng Viet'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={createInvite}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--color-ink)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Erstelle Link...' : 'Link erstellen'}
              </button>

              <p className="text-xs text-[var(--color-ink-muted)] text-center">
                Link ist 30 Tage gueltig. Bei Verlust einfach neuen Link erstellen.
              </p>
            </>
          )}

          {result && (
            <div className="space-y-4">
              {/* Link-Box */}
              <div>
                <label className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide block mb-2">
                  Zugangs-Link
                </label>
                <div className="bg-slate-50 border border-[var(--color-border)] rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <code className="text-xs break-all flex-1 font-mono text-[var(--color-ink)] leading-relaxed">
                    {result.mandantUrl}
                  </code>
                  <button
                    onClick={copyLink}
                    className="shrink-0 inline-flex items-center gap-1 text-xs bg-[var(--color-ink)] text-white rounded px-2 py-1.5 hover:opacity-90"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Kopiert' : 'Kopieren'}
                  </button>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">
                  Gueltig bis {new Date(result.expiresAt).toLocaleDateString('de-DE')}
                </p>
              </div>

              {/* WhatsApp-Button */}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90"
                >
                  <MessageCircle className="w-4 h-4" />
                  Per WhatsApp senden
                </a>
              )}

              {/* Vorschau-Text */}
              <details className="border border-[var(--color-border)] rounded-lg">
                <summary className="text-xs font-medium cursor-pointer px-3 py-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                  WhatsApp-Nachricht anzeigen
                </summary>
                <pre className="text-xs text-[var(--color-ink-soft)] px-3 py-2 border-t border-[var(--color-border)] whitespace-pre-wrap leading-relaxed font-sans">
                  {waMessage}
                </pre>
              </details>

              {/* Neuen Link erstellen */}
              <button
                onClick={() => { setResult(null); setError(null) }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <ExternalLink className="w-4 h-4" />
                Neuen Link erstellen
              </button>

              <p className="text-xs text-[var(--color-ink-muted)] text-center">
                Link ist 30 Tage gueltig. Jeder mit diesem Link kann die Akte sehen und Dokumente hochladen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
