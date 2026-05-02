import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'

const redis = Redis.fromEnv()
const MAX_SNAPSHOT_SIZE = 900_000
const TTL_SECONDS = 60 * 60 * 24 * 90

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, PUT, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Cloud-Sync ist serverseitig nicht konfiguriert.',
      hint: 'Upstash-Integration im Vercel-Dashboard verbinden und neu deployen.',
    })
  }

  const namespacedKey = `proSync:${session.tenantId}`

  if (req.method === 'GET') {
    try {
      const snapshot = await redis.get(namespacedKey)
      if (!snapshot) return res.status(404).json({ error: 'No snapshot for this tenant' })
      return res.status(200).json(snapshot)
    } catch (err) {
      return res.status(500).json({ error: 'Read failed', detail: String(err) })
    }
  }

  if (req.method === 'PUT') {
    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Body must be a JSON snapshot' })
    }
    const size = JSON.stringify(body).length
    if (size > MAX_SNAPSHOT_SIZE) {
      return res.status(413).json({
        error: 'Snapshot too large',
        sizeBytes: size,
        limitBytes: MAX_SNAPSHOT_SIZE,
      })
    }
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
