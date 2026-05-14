/**
 * GET /api/pro/audit — Audit-Log-Read für Pro-Anwält:innen.
 *
 * Auth: requireProSession (min. 'anwalt')
 * Liest Redis-Liste audit:{tenantId}. Kein eigenes Audit-Logging
 * (würde Endlos-Schleife erzeugen).
 *
 * Query-Parameter:
 *   limit    — max. Einträge (Standard 100, max. 500)
 *   before   — ISO-Timestamp: nur Einträge älter als dieser Wert
 *   action   — Filter auf Aktionstyp (z.B. case.create)
 *   entityType — Filter auf Entity-Typ (z.B. case)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applySecurityHeaders, applyCors } from '../_http'

interface AuditRecord {
  id: string
  ts: string
  tenantId: string
  userHash: string
  action: string
  entityType: string
  entityId?: string
  diff?: Record<string, unknown>
}

function buildRedisClient(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return Redis.fromEnv()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  applyCors(req, res, 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'anwalt')
  if (!session) return

  const redis = buildRedisClient()
  if (!redis) {
    return res.status(503).json({ error: 'Audit-Log nicht verfügbar (Redis nicht konfiguriert)' })
  }

  const limitRaw = Number(req.query.limit ?? 100)
  const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 100 : limitRaw), 500)
  const before = typeof req.query.before === 'string' ? req.query.before : null
  const actionFilter = typeof req.query.action === 'string' ? req.query.action : null
  const entityTypeFilter = typeof req.query.entityType === 'string' ? req.query.entityType : null

  const redisKey = `audit:${session.tenantId}`

  // Wir lesen in Batches aus Redis (LRANGE 0..N) und filtern client-seitig.
  // Für typ. Kanzlei-Volumen (<10k Einträge) ist das effizient genug.
  // Echte Pagination über einen Cursor käme in Phase 2 (server-side index).
  const FETCH_BATCH = Math.min(limit * 10, 2000)
  const rawItems = await redis.lrange(redisKey, 0, FETCH_BATCH - 1)

  const parsed: AuditRecord[] = []
  for (const item of rawItems) {
    try {
      const entry: AuditRecord = typeof item === 'string' ? JSON.parse(item) : (item as AuditRecord)
      parsed.push(entry)
    } catch {
      // Korrupter Eintrag — überspringen
    }
  }

  // Redis-Liste ist newest-first (LPUSH). Sortierung ist schon korrekt.
  let filtered = parsed
  if (before) {
    filtered = filtered.filter((e) => e.ts < before)
  }
  if (actionFilter) {
    filtered = filtered.filter((e) => e.action === actionFilter)
  }
  if (entityTypeFilter) {
    filtered = filtered.filter((e) => e.entityType === entityTypeFilter)
  }

  const page = filtered.slice(0, limit)
  const hasMore = filtered.length > limit

  return res.status(200).json({ entries: page, hasMore })
}
