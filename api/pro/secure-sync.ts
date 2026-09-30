import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE, ipUserKey } from '../_ratelimit'

const redis = Redis.fromEnv()
const TTL_SECONDS = 60 * 60 * 24 * 30
const MAX_ENVELOPE_BYTES = 950_000
const VERSION = 'gitlaw-secure-vault/1'

function validEnvelope(body: unknown): body is {
  version: string
  alg: string
  kdf: string
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  tenantBindingDigest: string
} {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return b.version === VERSION &&
    b.alg === 'AES-256-GCM' &&
    b.kdf === 'PBKDF2-HMAC-SHA256' &&
    typeof b.iterations === 'number' && b.iterations >= 600_000 &&
    typeof b.salt === 'string' && b.salt.length >= 20 &&
    typeof b.iv === 'string' && b.iv.length >= 12 &&
    typeof b.ciphertext === 'string' && b.ciphertext.length >= 16 &&
    typeof b.tenantBindingDigest === 'string' && b.tenantBindingDigest.length >= 40
}

function containsPlaintextSnapshotShape(body: Record<string, unknown>): boolean {
  // Server must never accept a mixed envelope carrying plaintext copies.
  return ['cases', 'research', 'letters', 'intakes', 'settings', 'documents', 'audit', 'mandantName', 'aktenzeichen']
    .some(key => Object.prototype.hasOwnProperty.call(body, key))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const corsAllowed = applyCors(req, res, 'GET, PUT, DELETE, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Secure vault storage is not configured.' })
  }

  const key = `proSecureVault:${session.tenantId}`

  if (req.method === 'GET') {
    const envelope = await redis.get(key)
    if (!envelope) return res.status(404).json({ error: 'No secure vault for tenant' })
    return res.status(200).json(envelope)
  }

  if (req.method === 'DELETE') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
    if (!rlOk) return
    await redis.del(key)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PUT') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
    if (!rlOk) return
    if (!validEnvelope(req.body)) return res.status(400).json({ error: 'Valid encrypted vault envelope required' })
    if (containsPlaintextSnapshotShape(req.body as Record<string, unknown>)) {
      return res.status(400).json({ error: 'Plaintext snapshot fields are forbidden on secure vault endpoint' })
    }
    const size = JSON.stringify(req.body).length
    if (size > MAX_ENVELOPE_BYTES) return res.status(413).json({ error: 'Encrypted vault too large', sizeBytes: size, limitBytes: MAX_ENVELOPE_BYTES })
    // The server persists exactly the opaque envelope. It never receives the passphrase/key.
    await redis.set(key, req.body, { ex: TTL_SECONDS })
    return res.status(200).json({ ok: true, sizeBytes: size, ttlDays: TTL_SECONDS / 86400 })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
