import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'

const redis = Redis.fromEnv()
const TTL_SECONDS = 60 * 60 * 24 * 90
const MAX_COLLECTION_SIZE = 900_000
const ALLOWED = new Set(['cases', 'research', 'letters'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, PUT, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Entity persistence is not configured.',
      hint: 'Upstash-Integration im Vercel-Dashboard verbinden und neu deployen.',
    })
  }

  const collection = typeof req.query.collection === 'string' ? req.query.collection.trim() : ''
  if (!ALLOWED.has(collection)) {
    return res.status(400).json({ error: 'Unsupported collection', allowed: Array.from(ALLOWED) })
  }
  const key = `proEntity:${session.tenantId}:${collection}`

  if (req.method === 'GET') {
    try {
      const payload = await redis.get(key)
      if (!payload) return res.status(404).json({ error: 'No collection for this tenant' })
      return res.status(200).json(payload)
    } catch (err) {
      return res.status(500).json({ error: 'Read failed', detail: String(err) })
    }
  }

  if (req.method === 'PUT') {
    const items = req.body?.items
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Body must contain items[]' })
    }
    const size = JSON.stringify(items).length
    if (size > MAX_COLLECTION_SIZE) {
      return res.status(413).json({
        error: 'Collection too large',
        sizeBytes: size,
        limitBytes: MAX_COLLECTION_SIZE,
      })
    }
    const payload = {
      tenantId: session.tenantId,
      collection,
      items,
      updatedAt: new Date().toISOString(),
      updatedBy: session.userId,
    }
    try {
      await redis.set(key, payload, { ex: TTL_SECONDS })
      return res.status(200).json({
        ok: true,
        collection,
        count: items.length,
        sizeBytes: size,
        ttlDays: TTL_SECONDS / 86400,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Write failed', detail: String(err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
