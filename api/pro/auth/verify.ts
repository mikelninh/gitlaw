/**
 * POST /api/pro/auth/verify
 *
 * Body: { token: string }
 *
 * Verifiziert den Magic-Link-Token, löscht ihn (single-use), sucht den User
 * in Redis und mintet eine JWT-Session — analog zu /api/pro/session POST.
 *
 * Rate-Limit: RATE_AUTH (5 req/min/IP) via zentralem _ratelimit.ts.
 *
 * DSGVO: Token wird nach Verifikation gelöscht. Audit-Log enthält nur emailHash.
 */

import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applySecurityHeaders, applyCors } from '../../_http'
import { hashEmail, mintSessionToken } from '../../_auth'
import type { ProSessionClaims, ProRole } from '../../_auth'
import { applyRateLimit, RATE_AUTH } from '../../_ratelimit'

const redis = Redis.fromEnv()

interface UserRecord {
  tenantId: string
  userId: string
  role: ProRole
  name?: string
}

interface TokenPayload {
  email: string
  createdAt: string
}

async function loadUserSeeds(): Promise<Record<string, UserRecord>> {
  const raw = process.env.GITLAW_PRO_OWNER_SEEDS
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, UserRecord>
  } catch {
    console.error('GITLAW_PRO_OWNER_SEEDS is not valid JSON — ignoring')
    return {}
  }
}

async function lookupUser(email: string): Promise<UserRecord | null> {
  const emailHash = hashEmail(email)
  const redisKey = `userByEmail:${emailHash}`

  // Zuerst Redis prüfen (bereits angelegte User)
  const stored = await redis.get<UserRecord>(redisKey)
  if (stored) return stored

  // Fallback: Env-geseedete Owner (erstes Login bootstrapt automatisch)
  const seeds = await loadUserSeeds()
  const normalized = email.toLowerCase().trim()
  const seed = seeds[normalized]
  if (seed) {
    // Lazy-write in Redis damit zukünftige Lookups schneller sind
    await redis.set(redisKey, JSON.stringify(seed))
    console.info('[verify] seeded_owner_bootstrapped', { emailHash: emailHash.slice(0, 12) })
    return seed
  }

  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // IP-Rate-Limit (RATE_AUTH: 5 req/min) — Brute-Force-Schutz für Token-Verify
  const rlOk = await applyRateLimit(req, res, RATE_AUTH)
  if (!rlOk) return

  const tokenRaw = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Token fehlt.' })
  }

  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')
  const tokenKey = `magicLinkToken:${tokenHash}`

  const payload = await redis.get<string | TokenPayload>(tokenKey)
  if (!payload) {
    console.info('[verify] token_not_found_or_expired', { tokenHash: tokenHash.slice(0, 12) })
    return res.status(401).json({ error: 'Link ungültig oder abgelaufen. Bitte einen neuen Link anfordern.' })
  }

  // Token sofort löschen (single-use)
  await redis.del(tokenKey)

  const parsed: TokenPayload = typeof payload === 'string' ? JSON.parse(payload) : payload
  const email = parsed.email

  const emailHash = hashEmail(email)
  const user = await lookupUser(email)

  if (!user) {
    console.info('[verify] user_not_found', { emailHash: emailHash.slice(0, 12) })
    return res.status(401).json({ error: 'Diese E-Mail-Adresse ist nicht für GitLaw Pro freigeschaltet.' })
  }

  const now = Math.floor(Date.now() / 1000)
  const SESSION_TTL = 60 * 60 * 12
  const claims: ProSessionClaims = {
    tenantId: user.tenantId,
    userId: user.userId,
    role: user.role,
    invite: `magic:${emailHash.slice(0, 8)}`,
    iat: now,
    exp: now + SESSION_TTL,
  }

  const sessionToken = mintSessionToken(claims)

  console.info('[verify] login_success', { emailHash: emailHash.slice(0, 12), tenantId: user.tenantId, role: user.role })

  return res.status(200).json({
    token: sessionToken,
    access: {
      tenantId: claims.tenantId,
      userId: claims.userId,
      role: claims.role,
      sessionExpiresAt: new Date(claims.exp * 1000).toISOString(),
    },
  })
}
