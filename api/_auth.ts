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

const INVITE_MAP: Record<string, Pick<ProSessionClaims, 'tenantId' | 'userId' | 'role'>> = {
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

const ROLE_RANK: Record<ProRole, number> = {
  read_only: 1,
  assistenz: 2,
  anwalt: 3,
  owner: 4,
}

const ISSUER = 'gitlaw-pro'
const SESSION_TTL_SECONDS = 60 * 60 * 12

function secret(): string {
  return process.env.GITLAW_SESSION_SECRET || process.env.OPENAI_API_KEY || 'gitlaw-beta-secret'
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
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
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
