/**
 * DELETE /api/pro/document?id={documentId}
 *
 * Loescht ein einzelnes Dokument aus case_documents (soft-delete),
 * aus dem Upstash-Vault und invalidiert alle betroffenen Caches.
 *
 * Vollmachten (kind = 'vollmacht') sind nicht loeschbar — 409.
 *
 * Auth: requireProSession(req, res, 'assistenz')
 *
 * Lookup-Reihenfolge (fail-safe):
 *   1. Postgres case_documents LEFT JOIN tenants — tenant als sekundärer Check
 *   2. Redis proDoc:{tenantId}:{documentId} — wenn PG-Eintrag fehlt
 *   3. 404 mit Klartext wenn beides leer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { requireDb } from '../_db'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE, ipUserKey } from '../_ratelimit'
import { recordAudit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'DELETE, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const rlOk = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
  if (!rlOk) return

  const sql = requireDb(res)
  if (!sql) return

  const documentId = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  if (!documentId) return res.status(400).json({ error: 'Query-Parameter id fehlt' })

  // ── 1. Postgres-Lookup (LEFT JOIN — kein strict tenant-join mehr) ──────────
  const docs = await sql`
    SELECT
      d.id,
      d.case_id        AS "caseId",
      d.tenant_id      AS "tenantId",
      d.kind,
      d.storage_ref    AS "storageRef",
      d.uploaded_by    AS "uploadedBy",
      d.original_name  AS "originalName",
      t.slug           AS "tenantSlug"
    FROM case_documents d
    LEFT JOIN tenants t ON t.id = d.tenant_id
    WHERE d.id = ${documentId}
      AND d.deleted_at IS NULL
    LIMIT 1
  `

  const pgDoc = docs[0] as {
    id: string
    caseId: string
    tenantId: string
    kind: string | null
    storageRef: string | null
    uploadedBy: string | null
    originalName: string
    tenantSlug: string | null
  } | undefined

  if (pgDoc) {
    console.warn('[document] PG-Lookup:', { documentId, tenantSlug: pgDoc.tenantSlug, sessionTenant: session.tenantId })

    // Tenant-Isolation
    if (pgDoc.tenantSlug !== session.tenantId) {
      console.warn('[document] Tenant-Mismatch:', { documentId, tenantSlug: pgDoc.tenantSlug, sessionTenant: session.tenantId })
      return res.status(403).json({ error: 'Kein Zugriff auf dieses Dokument' })
    }

    // Vollmacht ist rechtlich relevant — nicht loeschbar
    if (pgDoc.kind === 'vollmacht') {
      return res.status(409).json({
        error: 'Vollmacht ist rechtlich relevant und kann nicht geloescht werden',
        kind: 'vollmacht',
      })
    }

    // Soft-delete in Postgres
    await sql`
      UPDATE case_documents
      SET deleted_at = now()
      WHERE id = ${documentId}
    `

    // Vault-Key aus Redis entfernen (best-effort)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const redis = Redis.fromEnv()
        const vaultKey = pgDoc.storageRef || `proDoc:${session.tenantId}:${documentId}`
        await Promise.all([
          redis.del(vaultKey),
          redis.del(`proEntity:${session.tenantId}:cases`),
          redis.del(`proEntity:${session.tenantId}:cases:${pgDoc.caseId}`),
          redis.del(`proSync:${session.tenantId}`),
        ])
      } catch (err) {
        console.warn('[document] Redis-Cleanup fehlgeschlagen:', (err as Error).message)
      }
    }

    // Audit-Log
    await recordAudit(session.tenantId, session.userId, {
      action: 'document.delete.kanzlei',
      entityType: 'case_document',
      entityId: documentId,
      diff: {
        caseId: pgDoc.caseId,
        originalName: pgDoc.originalName,
        uploadedBy: pgDoc.uploadedBy,
        kind: pgDoc.kind,
      },
    })

    return res.status(200).json({ ok: true, deleted: true })
  }

  // ── 2. Redis-Fallback — Dokument existiert im Vault aber fehlt in PG ───────
  const hasRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  if (hasRedis) {
    try {
      const redis = Redis.fromEnv()
      const redisKey = `proDoc:${session.tenantId}:${documentId}`
      const redisDoc = await redis.get(redisKey)
      console.warn('[document] Redis-Fallback:', { documentId, found: Boolean(redisDoc) })

      if (redisDoc) {
        // Dokument nur im Vault — direkt löschen
        await redis.del(redisKey)

        await recordAudit(session.tenantId, session.userId, {
          action: 'document.delete.redis_only',
          entityType: 'case_document',
          entityId: documentId,
          diff: { source: 'redis' },
        })

        return res.status(200).json({ ok: true, deleted: true, source: 'redis' })
      }
    } catch (err) {
      console.warn('[document] Redis-Fallback fehlgeschlagen:', (err as Error).message)
    }
  }

  // ── 3. Nicht gefunden ─────────────────────────────────────────────────────
  console.warn('[document] Dokument nicht gefunden:', { documentId, tenant: session.tenantId })
  return res.status(404).json({
    error: 'Dokument nicht in der Datenbank gefunden — möglicherweise wurde es bereits gelöscht. Bitte Akte aktualisieren.',
    alreadyGone: true,
  })
}
