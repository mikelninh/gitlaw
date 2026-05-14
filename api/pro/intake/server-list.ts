/**
 * Server-side Intake-Listing für Pro-Frontend.
 *
 * GET /api/pro/intake/server-list
 *   → Liste aller server-side Intakes (visa-kompass, email) für den
 *     authentifizierten Tenant.
 *
 * POST /api/pro/intake/server-list  (action=mark-reviewed | action=delete)
 *   → Status-Updates persistent.
 *
 * Pro-Session erforderlich (Tenant-Isolation).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_READ, RATE_WRITE } from '../_ratelimit'
import type { VisaKompassBriefing } from './visa-kompass'

const redis = Redis.fromEnv()

type ServerIntake =
  | (VisaKompassBriefing & { source: 'visa-kompass' })

async function listForTenant(tenantId: string): Promise<ServerIntake[]> {
  const pattern = `gitlaw:intake:vk:${tenantId}:*`
  const keys: string[] = []
  let cursor = 0
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = typeof next === 'string' ? parseInt(next, 10) : next
    if (Array.isArray(batch)) keys.push(...batch)
  } while (cursor !== 0)

  if (keys.length === 0) return []
  const values = await Promise.all(keys.map((k) => redis.get<VisaKompassBriefing>(k)))
  return values
    .filter((v): v is VisaKompassBriefing => v != null)
    .map((v) => ({ ...v, source: 'visa-kompass' as const }))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Redis not configured' })
  }

  const session = requireProSession(req, res, 'read_only')
  if (!session) return

  if (req.method === 'GET') {
    const rlOk = await applyRateLimit(req, res, RATE_READ)
    if (!rlOk) return
    const items = await listForTenant(session.tenantId)
    return res.status(200).json({ ok: true, items })
  }

  if (req.method === 'POST') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE)
    if (!rlOk) return
    const body = req.body || {}
    const action = body.action as string
    const id = String(body.id ?? '')
    if (!id || !id.startsWith('vk_')) {
      return res.status(400).json({ error: 'id required' })
    }
    const key = `gitlaw:intake:vk:${session.tenantId}:${id}`
    if (action === 'mark-reviewed') {
      const current = await redis.get<VisaKompassBriefing>(key)
      if (!current) return res.status(404).json({ error: 'not found' })
      await redis.set(key, { ...current, reviewed: true }, { ex: 60 * 60 * 24 * 30 })
      return res.status(200).json({ ok: true })
    }
    if (action === 'delete') {
      await redis.del(key)
      return res.status(200).json({ ok: true })
    }
    return res.status(400).json({ error: 'unknown action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
