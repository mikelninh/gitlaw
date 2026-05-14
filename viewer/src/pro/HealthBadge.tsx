/**
 * HealthBadge — kleiner System-Status-Indikator für die Pro-Top-Bar.
 *
 * Pollt alle 30s gegen /api/health und zeigt:
 *   grün  → alles ok
 *   amber → degraded (LLM oder E-Mail fehlt, aber Redis up)
 *   rot   → down (Redis nicht erreichbar)
 *
 * Kein Logging im Browser-Kontext — Fehler werden still behandelt.
 */

import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
const POLL_INTERVAL_MS = 30_000

type HealthState = 'ok' | 'degraded' | 'down' | 'unknown'

interface HealthResponse {
  ok: boolean
  ts: string
  services: {
    redis: 'up' | 'down'
    llm: 'configured' | 'missing'
    email: 'configured' | 'missing'
    postgres: 'up' | 'down' | 'not_configured'
  }
}

function deriveState(data: HealthResponse): HealthState {
  if (data.services.redis === 'down') return 'down'
  if (data.services.llm === 'missing' || data.services.email === 'missing') return 'degraded'
  if (data.services.postgres === 'down') return 'degraded'
  return 'ok'
}

const DOT_CLASSES: Record<HealthState, string> = {
  ok: 'bg-green-500',
  degraded: 'bg-amber-400',
  down: 'bg-red-500',
  unknown: 'bg-slate-300',
}

const TOOLTIP: Record<HealthState, string> = {
  ok: 'Alle Systeme bereit',
  degraded: 'Eingeschränkter Betrieb — einige Dienste nicht konfiguriert',
  down: 'System nicht erreichbar — Mikel ist informiert',
  unknown: 'Status wird geprüft…',
}

export default function HealthBadge() {
  const [state, setState] = useState<HealthState>('unknown')
  const [showBanner, setShowBanner] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function poll() {
    try {
      const resp = await fetch(`${API_URL}/api/health`, { cache: 'no-store' })
      if (!resp.ok) {
        setState('down')
        setShowBanner(true)
        return
      }
      const data = (await resp.json()) as HealthResponse
      const next = deriveState(data)
      setState(next)
      setShowBanner(next === 'down' || next === 'degraded')
    } catch {
      setState('down')
      setShowBanner(true)
    }
  }

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <>
      {showBanner && state !== 'unknown' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 text-center">
          {state === 'down'
            ? 'System derzeit nicht erreichbar — wir sind informiert und arbeiten daran.'
            : 'Eingeschränkter Betrieb — einige Funktionen stehen möglicherweise nicht zur Verfügung.'}
        </div>
      )}
      <span
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]"
        title={TOOLTIP[state]}
        aria-label={`System-Status: ${TOOLTIP[state]}`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${DOT_CLASSES[state]} ${state === 'down' ? 'animate-pulse' : ''}`}
        />
        <span className="sr-only">{TOOLTIP[state]}</span>
      </span>
    </>
  )
}
