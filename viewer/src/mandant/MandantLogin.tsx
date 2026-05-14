/**
 * Mandanten-Login — Token-Gate analog zu ProAuth aber komplett getrennt.
 *
 * Wenn URL ?token=... (kein MANDANT-DEMO) -> Login-Screen wird nicht gezeigt,
 * MandantApp schaltet direkt durch. Diese Komponente kueimmert sich nur um
 * den Demo-Login-Flow (Token-Eingabe).
 */

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import {
  isMandantTokenValid,
  setMandantSession,
  getMandantSession,
  isMandantSessionExpired,
  touchMandantActivity,
  mandantIdFromToken,
} from './mandant-auth'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'

interface Props {
  lang: MandantLang
  urlToken: string | null
  onUnlock: (mandantId: string) => void
}

export default function MandantLogin({ lang, urlToken, onUnlock }: Props) {
  const t = getMandantStrings(lang)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Bestehende Demo-Session wiederherstellen (kein Backend-Token-Flow)
    if (urlToken && urlToken !== 'MANDANT-DEMO') return
    const session = getMandantSession()
    if (session && !isMandantSessionExpired()) {
      touchMandantActivity()
      onUnlock(session.mandantId)
    }
  }, [onUnlock, urlToken])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = token.trim().toUpperCase()
    if (!isMandantTokenValid(normalized)) {
      setError(t.loginError)
      return
    }
    const mandantId = mandantIdFromToken(normalized)
    setMandantSession(normalized, mandantId)
    onUnlock(mandantId)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-[var(--color-gold)]" />
          <h1 className="text-lg font-semibold">{t.loginTitle}</h1>
        </div>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
          {t.loginSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={token}
            onChange={e => {
              setToken(e.target.value)
              setError(null)
            }}
            placeholder={t.loginTokenPlaceholder}
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 font-mono uppercase tracking-wide focus:outline-none focus:border-[var(--color-gold)]"
            autoFocus
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[var(--color-ink)] text-white rounded-lg py-2 font-medium hover:opacity-90"
          >
            {t.loginButton}
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
          {t.loginHint}
        </p>
      </div>
    </div>
  )
}
