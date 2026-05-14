/**
 * Magic-Link-Login für GitLaw Pro.
 *
 * Zwei Modi:
 *  1. Email-Formular: User gibt Email ein, bekommt Link per Mail.
 *  2. Verify-Modus: URL enthält ?token=XYZ → automatisch verifizieren.
 *
 * Wird von ProAuth eingebunden. Ruft /api/pro/auth/magic-link und
 * /api/pro/auth/verify auf.
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { requestMagicLink, verifyMagicLink } from './pro-api'
import type { SessionResponse } from './pro-api'

type Phase = 'idle' | 'sent' | 'verifying' | 'success' | 'error'

interface Props {
  onSuccess: (session: SessionResponse) => void
}

export default function MagicLinkLogin({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const verifyCalledRef = useRef(false)

  // Wenn URL ein token enthält → sofort verifizieren
  useEffect(() => {
    // Magic-Link-Token aus URL: ?magicToken=XXX (von /api/pro/auth/magic-link)
    // Backwards-compat: ?token=XXX wird auch akzeptiert
    const token = searchParams.get('magicToken') || searchParams.get('token')
    if (!token || verifyCalledRef.current) return
    verifyCalledRef.current = true

    setPhase('verifying')

    // Token aus URL entfernen bevor Netzwerk-Call — Schulter-Surfen verhindern
    const clean = new URLSearchParams(searchParams)
    clean.delete('magicToken')
    clean.delete('token')
    setSearchParams(clean, { replace: true })

    verifyMagicLink(token)
      .then(session => {
        setPhase('success')
        onSuccess(session)
      })
      .catch(err => {
        setPhase('error')
        setErrorMsg(
          err instanceof Error ? err.message : 'Verifizierung fehlgeschlagen. Bitte neuen Link anfordern.',
        )
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPhase('sent')
    setErrorMsg(null)
    try {
      await requestMagicLink(email.trim())
      // Antwort ist immer ok — Email-Enumeration-Schutz
    } catch {
      // Auch bei Netzwerkfehler: "sent"-State zeigen, nicht leaken
    }
  }

  if (phase === 'verifying') {
    return (
      <div className="text-sm text-[var(--color-ink-soft)] text-center py-4">
        Link wird geprüft...
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{errorMsg}</p>
        <button
          type="button"
          onClick={() => { setPhase('idle'); setErrorMsg(null); verifyCalledRef.current = false }}
          className="text-sm underline text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Neuen Link anfordern
        </button>
      </div>
    )
  }

  if (phase === 'sent') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
          Schauen Sie in Ihr Postfach — der Link gilt 15 Minuten.
        </p>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="text-sm underline text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Andere E-Mail-Adresse eingeben
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        E-Mail-Adresse
      </label>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="bao@kanzlei-nguyen.de"
        required
        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)] text-sm"
        autoFocus
      />
      <button
        type="submit"
        disabled={!email.trim()}
        className="w-full bg-[var(--color-ink)] text-white rounded-lg py-2 font-medium hover:opacity-90 disabled:opacity-40"
      >
        Login-Link senden
      </button>
    </form>
  )
}
