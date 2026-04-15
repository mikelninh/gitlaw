/**
 * Beta invite-token gate.
 *
 * Not real auth — just a soft barrier so we can hand out specific tokens to
 * test Anwält:innen. Tokens are validated client-side against a small allowlist
 * in `store.ts`. Once approved, the token is persisted in localStorage so the
 * user doesn't see the gate again on the same browser.
 *
 * Real auth (magic-link / Supabase) follows once we have a paying customer.
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import {
  getStoredInvite,
  isInviteValid,
  log,
  setStoredInvite,
} from './store'

interface Props {
  children: React.ReactNode
}

export default function ProAuth({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Auto-unlock if a previously saved token is still valid, OR if a fresh
  // token is in the URL (#/pro?invite=BETA-…)
  useEffect(() => {
    const fromHash = searchParams.get('invite')
    // Also fall back to pre-hash query string, just in case someone shared
    // a link like "/?invite=BETA-…" before the hash got added.
    const fromSearch = new URLSearchParams(window.location.search).get('invite')
    const fromUrl = fromHash || fromSearch
    if (fromUrl && isInviteValid(fromUrl)) {
      setStoredInvite(fromUrl)
      log('login', `via URL token`)
      setUnlocked(true)
      // Strip the token from the URL so it's not shoulder-surfed / copied.
      const clean = new URLSearchParams(searchParams)
      clean.delete('invite')
      setSearchParams(clean, { replace: true })
      if (fromSearch) {
        const url = window.location.pathname + window.location.hash
        window.history.replaceState({}, '', url)
      }
      return
    }
    const stored = getStoredInvite()
    if (stored && isInviteValid(stored)) {
      log('login', `via stored token`)
      setUnlocked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isInviteValid(token)) {
      setError('Token ungültig. Bitte prüfe Schreibweise oder kontaktiere uns.')
      return
    }
    setStoredInvite(token)
    log('login', `via form`)
    setUnlocked(true)
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Scale className="w-6 h-6 text-[var(--color-gold)]" />
          <h1 className="text-xl font-semibold">GitLaw <span className="text-[var(--color-gold)]">Pro</span></h1>
        </div>

        <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
          Geschlossene Beta für Anwält:innen und Kanzleien. Du brauchst einen
          persönlichen Beta-Token. Falls du keinen hast, schreib uns kurz —
          wir geben gerade Stück für Stück Zugänge raus.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={token}
            onChange={e => {
              setToken(e.target.value)
              setError(null)
            }}
            placeholder="BETA-…"
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 font-mono uppercase tracking-wide focus:outline-none focus:border-[var(--color-gold)]"
            autoFocus
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[var(--color-ink)] text-white rounded-lg py-2 font-medium hover:opacity-90"
          >
            Freischalten
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] space-y-2">
          <p>
            <Link to="/preise" className="underline font-medium text-[var(--color-ink)]">
              → Preise &amp; 60-Tage-Garantie ansehen
            </Link>
          </p>
          <p>
            Für Bürger:innen ist die kostenlose Version weiterhin offen:{' '}
            <Link to="/" className="underline">gitlaw.app</Link>
          </p>
          <p>
            Beta-Zugang anfragen: <a href="mailto:pro@gitlaw.app" className="underline">pro@gitlaw.app</a>
          </p>
        </div>
      </div>
    </div>
  )
}
