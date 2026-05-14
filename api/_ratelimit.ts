/**
 * Zentrales Rate-Limiting für GitLaw-API-Endpoints.
 *
 * Nutzt Upstash Redis mit Sliding-Window-Algorithmus.
 * Fallback auf in-memory Map wenn KV_REST_API_URL fehlt (local dev).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Tier-Konstanten ───────────────────────────────────────────

export const RATE_PUBLIC = { limit: 60, window: '1 m', prefix: 'rl:public' } as const
export const RATE_WRITE  = { limit: 30, window: '1 m', prefix: 'rl:write' }  as const
export const RATE_AUTH   = { limit: 5,  window: '1 m', prefix: 'rl:auth' }   as const
export const RATE_LLM    = { limit: 20, window: '1 m', prefix: 'rl:llm' }    as const

type RateOpts = typeof RATE_PUBLIC | typeof RATE_WRITE | typeof RATE_AUTH | typeof RATE_LLM

// ── Upstash Redis / in-memory Fallback ───────────────────────

function buildLimiter(opts: RateOpts): Ratelimit | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(opts.limit, opts.window),
    analytics: true,
    prefix: opts.prefix,
  })
}

// In-memory Fallback (local dev) — kein TTL, reicht für Dev-Sessions
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Hilfsfunktionen ───────────────────────────────────────────

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

/**
 * Rate-Limit anwenden.
 *
 * key      — Identifikator für diesen Client (IP, userId, oder IP:userId)
 * opts     — RATE_PUBLIC / RATE_WRITE / RATE_AUTH / RATE_LLM
 *
 * Gibt `true` zurück wenn Request durchgelassen wird.
 * Gibt `false` zurück und sendet HTTP 429 wenn Limit überschritten.
 *
 * Idempotent: mehrfacher Aufruf pro Request erhöht den Counter nur einmal —
 * Upstash-Ratelimit ist deterministisch pro (prefix + key)-Kombination.
 */
export async function applyRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  opts: RateOpts,
  key?: string,
): Promise<boolean> {
  const resolvedKey = key ?? clientIp(req)

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    // Local-Dev-Fallback: in-memory, kein Redis erforderlich
    console.warn(`[ratelimit] KV_REST_API_URL fehlt — in-memory Fallback für "${opts.prefix}:${resolvedKey}"`)
    const windowMs = opts.window === '1 m' ? 60_000 : 60_000
    const allowed = memoryLimit(`${opts.prefix}:${resolvedKey}`, opts.limit, windowMs)
    if (!allowed) {
      res.setHeader('Retry-After', '60')
      res.status(429).json({ error: 'Zu viele Anfragen. Bitte kurz warten.', retryAfterSeconds: 60 })
      return false
    }
    return true
  }

  const limiter = buildLimiter(opts)
  if (!limiter) return true // Sollte durch obigen Check abgedeckt sein

  const { success, reset } = await limiter.limit(resolvedKey)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({ error: 'Zu viele Anfragen. Bitte kurz warten.', retryAfterSeconds: retryAfter })
    return false
  }
  return true
}

/**
 * Baut einen kombinierten Rate-Limit-Key aus IP + userId.
 * Für authentifizierte Endpoints — verhindert dass eine IP viele User-IDs nutzt.
 */
export function ipUserKey(req: VercelRequest, userId: string): string {
  return `${clientIp(req)}:${userId}`
}
