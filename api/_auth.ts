import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export type ProRole = 'owner' | 'anwalt' | 'assistenz' | 'read_only'

export interface ProSessionClaims {
  tenantId: string
  userId: string
  role: ProRole
  invite: string
  iat: number
  exp: number
}

type InviteMap = Record<string, Pick<ProSessionClaims, 'tenantId' | 'userId' | 'role'>>

// Tokens are loaded from GITLAW_BETA_TOKENS (JSON string) at runtime.
// In production this env var must be set — hardcoded values are dev-only fallback.
// Rotate all tokens after first production deploy.
const DEV_INVITE_MAP: InviteMap = {
  'BETA-NGUYEN': { tenantId: 'kanzlei-nguyen', userId: 'nguyen-owner', role: 'owner' },
  'BETA-RUBIN': { tenantId: 'kanzlei-rubin', userId: 'rubin-owner', role: 'owner' },
  'BETA-WERNER': { tenantId: 'kanzlei-gniosdorz', userId: 'werner-owner', role: 'owner' },
  'BETA-JASMIN': { tenantId: 'kanzlei-gniosdorz', userId: 'jasmin-anwalt', role: 'anwalt' },
  'BETA-MUSTER-1': { tenantId: 'beta-shared', userId: 'beta-muster-1', role: 'anwalt' },
  'BETA-MUSTER-2': { tenantId: 'beta-shared', userId: 'beta-muster-2', role: 'anwalt' },
  'BETA-MUSTER-3': { tenantId: 'beta-shared', userId: 'beta-muster-3', role: 'anwalt' },
  'BETA-MUSTER-4': { tenantId: 'beta-shared', userId: 'beta-muster-4', role: 'anwalt' },
  'BETA-MUSTER-5': { tenantId: 'beta-shared', userId: 'beta-muster-5', role: 'anwalt' },
  DEMO: { tenantId: 'beta-shared', userId: 'beta-demo', role: 'anwalt' },
}

function loadInviteMap(): InviteMap {
  const raw = process.env.GITLAW_BETA_TOKENS
  if (raw) {
    try {
      return JSON.parse(raw) as InviteMap
    } catch {
      console.error('GITLAW_BETA_TOKENS is set but not valid JSON — falling back to dev map')
    }
  }
  if (process.env.VERCEL_ENV === 'production') {
    console.error('GITLAW_BETA_TOKENS not set in production — no invites will be accepted')
    return {}
  }
  return DEV_INVITE_MAP
}

const INVITE_MAP = loadInviteMap()

const ROLE_RANK: Record<ProRole, number> = {
  read_only: 1,
  assistenz: 2,
  anwalt: 3,
  owner: 4,
}

const ISSUER = 'gitlaw-pro'
const SESSION_TTL_SECONDS = 60 * 60 * 12

/**
 * HMAC-Schlüssel für Pro-Session-Token. Muss in Vercel-Env gesetzt sein.
 *
 * Kein Hardcode-Fallback — sonst wäre die Session in einer fehlkonfigurierten
 * Deploy fälschbar (jeder mit Repo-Zugriff könnte gültige Tokens generieren).
 *
 * Local dev: setze GITLAW_SESSION_SECRET in .env.local auf einen zufälligen
 * 64-char Hex-String, z.B. via:  openssl rand -hex 32
 */
function secret(): string {
  const s = process.env.GITLAW_SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('GITLAW_SESSION_SECRET environment variable is required (≥32 chars). Generate via: openssl rand -hex 32')
  }
  return s
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(data: string): string {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}

export function resolveInvite(inviteRaw: string): ProSessionClaims | null {
  const invite = inviteRaw.trim().toUpperCase()
  const mapped = INVITE_MAP[invite]
  if (!mapped) return null
  const now = Math.floor(Date.now() / 1000)
  return {
    ...mapped,
    invite,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }
}

export function mintSessionToken(claims: ProSessionClaims): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', iss: ISSUER }))
  const payload = b64url(JSON.stringify(claims))
  const signature = sign(`${header}.${payload}`)
  return `${header}.${payload}.${signature}`
}

export function verifySessionToken(token: string): ProSessionClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`)
  const sigBuf = new Uint8Array(Buffer.from(signature, 'utf8'))
  const expBuf = new Uint8Array(Buffer.from(expected, 'utf8'))
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ProSessionClaims
    const now = Math.floor(Date.now() / 1000)
    if (!decoded?.tenantId || !decoded?.userId || !decoded?.role || !decoded?.exp) return null
    if (decoded.exp <= now) return null
    return decoded
  } catch {
    return null
  }
}

export function extractBearerToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth || typeof auth !== 'string') return null
  const [scheme, token] = auth.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token.trim()
}

/**
 * HMAC-peppered hash of an email address — for rate-limit keys, user-lookup
 * keys, and audit logs. Uses GITLAW_SESSION_SECRET as pepper so the hash
 * cannot be brute-forced by email enumeration even if Redis is leaked.
 *
 * Input is normalized to lowercase + trimmed before hashing.
 */
export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim()
  return crypto.createHmac('sha256', secret()).update(normalized).digest('hex')
}

export function requireProSession(
  req: VercelRequest,
  res: VercelResponse,
  minRole: ProRole = 'read_only',
): ProSessionClaims | null {
  const token = extractBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Missing bearer session' })
    return null
  }
  const claims = verifySessionToken(token)
  if (!claims) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return null
  }
  if (ROLE_RANK[claims.role] < ROLE_RANK[minRole]) {
    res.status(403).json({ error: 'Insufficient role', required: minRole, role: claims.role })
    return null
  }
  return claims
}
