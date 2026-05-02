/**
 * Beta invite-token gate.
 *
 * Not real auth — just a soft barrier so we can hand out specific tokens to
 * test Anwält:innen and pilot firms. Tokens are validated client-side against
 * a small allowlist in `store.ts`. Once approved, the token is persisted in
 * localStorage so the user doesn't see the gate again on the same browser.
 *
 * Real auth (magic-link / Supabase) follows once we have a paying customer.
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import {
  getStoredInvite,
  getStoredSessionToken,
  getAccessContext,
  isSessionExpired,
  isInviteValid,
  log,
  setAccessContext,
  setStoredInvite,
  setStoredSessionToken,
  touchSessionActivity,
} from './store'
import { isDemoLoaded, loadDemoData, getPreset, DEMO_MARKER } from './demo-data'
import { exchangeInviteForSession, resumeSession } from './pro-api'

interface Props {
  children: React.ReactNode
}

export default function ProAuth({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  async function bootstrapAccess(tokenRaw: string) {
    const existing = getAccessContext()
    if (existing && getStoredSessionToken() && !isSessionExpired()) {
      touchSessionActivity()
      return
    }
    const session = await exchangeInviteForSession(tokenRaw.trim().toUpperCase())
    if (!session.token) throw new Error('Session token missing')
    setStoredSessionToken(session.token)
    setAccessContext(session.access)
    touchSessionActivity()
  }

  // Auto-unlock if a previously saved token is still valid, OR if a fresh
  // token is in the URL (#/pro?invite=BETA-…&preset=rubin)
  useEffect(() => {
    const fromHash = searchParams.get('invite')
    const presetFromHash = searchParams.get('preset')
    // Also fall back to pre-hash query string, just in case someone shared
    // a link like "/?invite=BETA-…" before the hash got added.
    const fromSearch = new URLSearchParams(window.location.search).get('invite')
    const presetFromSearch = new URLSearchParams(window.location.search).get('preset')
    const fromUrl = fromHash || fromSearch
    const presetFromUrl = presetFromHash || presetFromSearch

    if (fromUrl && isInviteValid(fromUrl)) {
      setStoredInvite(fromUrl)
      bootstrapAccess(fromUrl)
        .then(() => {
          log('login', 'via URL token')
          setUnlocked(true)
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Login fehlgeschlagen'))

      if (presetFromUrl && getPreset(presetFromUrl)) {
        const currentPreset = localStorage.getItem(DEMO_MARKER)
        if (!isDemoLoaded()) {
          // First time — auto-load preset directly
          try { loadDemoData(presetFromUrl) }
          catch (err) { console.warn('Preset auto-load failed', err) }
        } else if (currentPreset !== presetFromUrl) {
          // Another preset is loaded — defer to user. We'll show a switcher
          // banner inside the Pro app via this stored „pending preset switch".
          localStorage.setItem('gitlaw.pro.pendingPresetSwitch.v1', presetFromUrl)
        }
      }

      // Strip token + preset from URL so they're not shoulder-surfed / copied.
      const clean = new URLSearchParams(searchParams)
      clean.delete('invite')
      clean.delete('preset')
      setSearchParams(clean, { replace: true })
      if (fromSearch || presetFromSearch) {
        const url = window.location.pathname + window.location.hash
        window.history.replaceState({}, '', url)
      }
      return
    }
    const storedSession = getStoredSessionToken()
    const storedInvite = getStoredInvite()
    if (storedSession && !isSessionExpired()) {
      resumeSession()
        .then(session => {
          setAccessContext(session.access)
          touchSessionActivity()
          log('login', 'via stored session')
          setUnlocked(true)
        })
        .catch(() => {
          if (storedInvite && isInviteValid(storedInvite)) {
            bootstrapAccess(storedInvite)
              .then(() => {
                log('login', 'via stored invite refresh')
                setUnlocked(true)
              })
              .catch(err => setError(err instanceof Error ? err.message : 'Login fehlgeschlagen'))
          }
        })
      return
    }
    if (storedInvite && isInviteValid(storedInvite) && !isSessionExpired()) {
      bootstrapAccess(storedInvite)
        .then(() => {
          log('login', 'via stored token')
          setUnlocked(true)
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Login fehlgeschlagen'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isInviteValid(token)) {
      setError('Token ungültig. Bitte prüfe Schreibweise oder kontaktiere uns.')
      return
    }
    try {
      setStoredInvite(token)
      await bootstrapAccess(token)
      log('login', `via form`)
      setUnlocked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen')
    }
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
          Geschlossene Beta für Anwält:innen und Kanzleien. Wenn du bereits
          einen persönlichen Beta-Token hast, kannst du hier direkt rein.
          Wenn nicht, ist der richtige nächste Schritt aktuell ein kurzer
          Demo- oder Pilotkontakt.
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
              → Pilot-Angebot, Preise &amp; 60-Tage-Garantie ansehen
            </Link>
          </p>
          <p>
            Für Bürger:innen ist die kostenlose Version weiterhin offen:{' '}
            <Link to="/" className="underline">gitlaw.app</Link>
          </p>
          <p>
            Demo / Pilot anfragen: <a href="mailto:mikel_ninh@yahoo.de?subject=GitLaw%20Pro%20Pilot%20anfragen" className="underline">mikel_ninh@yahoo.de</a>
          </p>
        </div>
      </div>
    </div>
  )
}
