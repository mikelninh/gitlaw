import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE, ipUserKey } from '../_ratelimit'

const redis = Redis.fromEnv()
const MAX_SNAPSHOT_SIZE = 900_000
const TTL_SECONDS = 60 * 60 * 24 * 90

function containsRealOrUnclassifiedMatter(body: unknown): boolean {
  if (!body || typeof body !== 'object') return true
  const cases = (body as { cases?: unknown }).cases
  if (!Array.isArray(cases)) return true
  return cases.some(c => {
    if (!c || typeof c !== 'object') return true
    const mode = (c as { privacy?: { dataMode?: unknown } }).privacy?.dataMode
    return mode !== 'synthetic'
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const corsAllowed = applyCors(req, res, 'GET, PUT, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  if (req.method === 'PUT') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
    if (!rlOk) return
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Cloud-Sync ist serverseitig nicht konfiguriert.' })
  }

  const namespacedKey = `proSync:${session.tenantId}`

  if (req.method === 'GET') {
    try {
      const snapshot = await redis.get(namespacedKey)
      if (!snapshot) return res.status(404).json({ error: 'No snapshot for this tenant' })
      // Never release a legacy plaintext real-mandate snapshot back through this route.
      if (containsRealOrUnclassifiedMatter(snapshot)) {
        return res.status(423).json({
          error: 'Legacy plaintext sync contains real/unclassified mandate data and is locked. Use /api/pro/secure-sync.',
          code: 'SECURE_VAULT_REQUIRED',
        })
      }
      return res.status(200).json(snapshot)
    } catch (err) {
      return res.status(500).json({ error: 'Read failed', detail: String(err) })
    }
  }

  if (req.method === 'PUT') {
    const body = req.body
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Body must be a JSON snapshot' })
    if (containsRealOrUnclassifiedMatter(body)) {
      return res.status(423).json({
        error: 'Plaintext cloud sync is forbidden for real or unclassified mandate data.',
        code: 'SECURE_VAULT_REQUIRED',
      })
    }
    const size = JSON.stringify(body).length
    if (size > MAX_SNAPSHOT_SIZE) return res.status(413).json({ error: 'Snapshot too large', sizeBytes: size, limitBytes: MAX_SNAPSHOT_SIZE })
    const nextBody = {
      ...body,
      tenantId: session.tenantId,
      lastSyncedBy: session.userId,
      lastSyncedAt: new Date().toISOString(),
    }
    try {
      await redis.set(namespacedKey, nextBody, { ex: TTL_SECONDS })
      return res.status(200).json({ ok: true, sizeBytes: size, ttlDays: TTL_SECONDS / 86400 })
    } catch (err) {
      return res.status(500).json({ error: 'Write failed', detail: String(err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
