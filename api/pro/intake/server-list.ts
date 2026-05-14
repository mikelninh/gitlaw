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
import { requireProSession } from '../../_auth'
import { applyCors, applySecurityHeaders } from '../../_http'
import { applyRateLimit, RATE_READ, RATE_WRITE } from '../../_ratelimit'
import type { VisaKompassBriefing } from './visa-kompass'

const hasRedis = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
const redis = hasRedis ? Redis.fromEnv() : null
const devStore: Map<string, unknown> =
  ((globalThis as unknown as { __vkDevStore?: Map<string, unknown> }).__vkDevStore ??=
    new Map())

type ServerIntake =
  | (VisaKompassBriefing & { source: 'visa-kompass' })

async function listForTenant(tenantId: string): Promise<ServerIntake[]> {
  const prefix = `gitlaw:intake:vk:${tenantId}:`
  let values: (VisaKompassBriefing | null)[] = []

  if (redis) {
    const keys: string[] = []
    let cursor = 0
    do {
      const [next, batch] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 })
      cursor = typeof next === 'string' ? parseInt(next, 10) : next
      if (Array.isArray(batch)) keys.push(...batch)
    } while (cursor !== 0)
    if (keys.length === 0) return []
    values = await Promise.all(keys.map((k) => redis.get<VisaKompassBriefing>(k)))
  } else {
    for (const [k, v] of devStore.entries()) {
      if (k.startsWith(prefix)) values.push(v as VisaKompassBriefing)
    }
  }

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
      if (redis) {
        const current = await redis.get<VisaKompassBriefing>(key)
        if (!current) return res.status(404).json({ error: 'not found' })
        await redis.set(key, { ...current, reviewed: true }, { ex: 60 * 60 * 24 * 30 })
      } else {
        const current = devStore.get(key) as VisaKompassBriefing | undefined
        if (!current) return res.status(404).json({ error: 'not found' })
        devStore.set(key, { ...current, reviewed: true })
      }
      return res.status(200).json({ ok: true })
    }
    if (action === 'delete') {
      if (redis) await redis.del(key)
      else devStore.delete(key)
      return res.status(200).json({ ok: true })
    }
    return res.status(400).json({ error: 'unknown action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
