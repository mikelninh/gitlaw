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
  const corsAllowed = applyCors(req, res, 'GET, PUT, POST, DELETE, OPTIONS')
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
  const bulkKey = `proEntity:${session.tenantId}:${collection}`
  const itemId = typeof req.query.id === 'string' ? req.query.id.trim() : ''

  // --- Individual item operations (POST = create, PUT = update, GET = read, DELETE = delete) ---
  if (itemId) {
    const itemKey = `proEntity:${session.tenantId}:${collection}:${itemId}`

    if (req.method === 'GET') {
      try {
        const payload = await redis.get(itemKey)
        if (!payload) return res.status(404).json({ error: 'Item not found' })
        return res.status(200).json({ ok: true, item: payload })
      } catch (err) {
        return res.status(500).json({ error: 'Read failed', detail: String(err) })
      }
    }

    if (req.method === 'PUT') {
      const item = req.body?.item
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ error: 'Body must contain item object' })
      }
      try {
        await redis.set(itemKey, { ...item, _updatedAt: new Date().toISOString(), _updatedBy: session.userId }, { ex: TTL_SECONDS })
        return res.status(200).json({ ok: true, id: itemId, collection })
      } catch (err) {
        return res.status(500).json({ error: 'Write failed', detail: String(err) })
      }
    }

    if (req.method === 'DELETE') {
      try {
        await redis.del(itemKey)
        return res.status(200).json({ ok: true, id: itemId, deleted: true })
      } catch (err) {
        return res.status(500).json({ error: 'Delete failed', detail: String(err) })
      }
    }

    return res.status(405).json({ error: 'Method not allowed for individual item' })
  }

  // --- POST: create new item (generates server-side id if not provided) ---
  if (req.method === 'POST') {
    const item = req.body?.item
    if (!item || typeof item !== 'object') {
      return res.status(400).json({ error: 'Body must contain item object' })
    }
    const id = item.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const itemKey = `proEntity:${session.tenantId}:${collection}:${id}`
    try {
      await redis.set(itemKey, { ...item, id, _createdAt: new Date().toISOString(), _createdBy: session.userId }, { ex: TTL_SECONDS })
      return res.status(200).json({ ok: true, id, collection })
    } catch (err) {
      return res.status(500).json({ error: 'Write failed', detail: String(err) })
    }
  }

  // --- Bulk GET / PUT (existing behavior, preserved for backward compat) ---
  if (req.method === 'GET') {
    try {
      const payload = await redis.get(bulkKey)
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
      await redis.set(bulkKey, payload, { ex: TTL_SECONDS })
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
