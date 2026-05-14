/**
 * POST /api/pro/document-review
 *
 * RA oder Refa bestätigt oder gibt ein Mandant-Dokument zurück.
 *
 * Body:  { documentId: string, action: 'approve' | 'reject', comment?: string }
 * Auth:  requireProSession(req, res, 'assistenz')  — Refa darf reviewen
 * Rate:  RATE_WRITE
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
import { applyRateLimit, RATE_WRITE, ipUserKey } from '../_ratelimit'
import { applyCors, applySecurityHeaders } from '../_http'
import { recordAudit } from '../_audit'

const VALID_ACTIONS = new Set(['approve', 'reject'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const allowed = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
  if (!allowed) return

  const sql = requireDb(res)
  if (!sql) return

  const { documentId, action, comment } = req.body as {
    documentId?: string
    action?: string
    comment?: string
  }

  if (!documentId || typeof documentId !== 'string') {
    return res.status(400).json({ error: 'documentId fehlt' })
  }
  if (!action || !VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'action muss "approve" oder "reject" sein' })
  }
  if (action === 'reject' && comment && typeof comment !== 'string') {
    return res.status(400).json({ error: 'comment muss ein String sein' })
  }

  const reviewStatus = action === 'approve' ? 'approved' : 'rejected'
  const reviewedAt = new Date().toISOString()
  const reviewComment = typeof comment === 'string' ? comment.trim() : null

  // ── 1. Postgres-Lookup (LEFT JOIN — kein strict tenant-join mehr) ──────────
  const docs = await sql`
    SELECT
      d.id,
      d.case_id        AS "caseId",
      d.tenant_id      AS "tenantId",
      d.original_name  AS "originalName",
      d.uploaded_by    AS "uploadedBy",
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
    originalName: string
    uploadedBy: string | null
    tenantSlug: string | null
  } | undefined

  if (pgDoc) {
    console.warn('[document-review] PG-Lookup:', { documentId, tenantSlug: pgDoc.tenantSlug, sessionTenant: session.tenantId })

    // Tenant-Check: falsche Kanzlei → 403
    if (pgDoc.tenantSlug !== session.tenantId) {
      console.warn('[document-review] Tenant-Mismatch:', { documentId, tenantSlug: pgDoc.tenantSlug, sessionTenant: session.tenantId })
      return res.status(403).json({ error: 'Dieses Dokument gehört nicht zu Ihrer Kanzlei' })
    }

    // Update in Postgres
    await sql`
      UPDATE case_documents
      SET
        review_status  = ${reviewStatus},
        reviewed_by    = ${session.userId},
        reviewed_at    = ${reviewedAt}::timestamptz,
        review_comment = ${reviewComment}
      WHERE id = ${documentId}
    `

    // Redis-Cache invalidieren (best-effort)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const redis = Redis.fromEnv()
        await Promise.all([
          redis.del(`proEntity:${session.tenantId}:cases`),
          redis.del(`proEntity:${session.tenantId}:cases:${pgDoc.caseId}`),
        ])
      } catch (err) {
        console.warn('[document-review] Redis-Cache-Invalidierung fehlgeschlagen:', (err as Error).message)
      }
    }

    // Audit-Log
    await recordAudit(session.tenantId, session.userId, {
      action: `document.review.${action}`,
      entityType: 'case_document',
      entityId: documentId,
      diff: {
        reviewStatus,
        ...(reviewComment ? { reviewComment } : {}),
      },
    })

    // Aktualisiertes Dokument zurückgeben
    const updated = await sql`
      SELECT
        d.id,
        d.original_name    AS "originalName",
        d.uploaded_at      AS "uploadedAt",
        d.uploaded_by      AS "uploadedBy",
        d.checklist_item_id AS "checklistItemId",
        d.mime_type        AS "mimeType",
        d.size_bytes       AS "sizeBytes",
        d.kind,
        d.storage_ref      AS "serverDocumentId",
        d.review_status    AS "reviewStatus",
        d.reviewed_by      AS "reviewedBy",
        d.reviewed_at      AS "reviewedAt",
        d.review_comment   AS "reviewComment"
      FROM case_documents d
      WHERE d.id = ${documentId}
      LIMIT 1
    `

    return res.status(200).json({ ok: true, document: updated[0] ?? null })
  }

  // ── 2. Redis-Fallback — Dokument existiert im Vault aber fehlt in PG ───────
  const hasRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  if (hasRedis) {
    try {
      const redis = Redis.fromEnv()
      const redisKey = `proDoc:${session.tenantId}:${documentId}`
      const redisDoc = await redis.get(redisKey)
      console.warn('[document-review] Redis-Fallback:', { documentId, found: Boolean(redisDoc) })

      if (redisDoc) {
        // Dokument ist im Vault — PG fehlt aber. Kein spekulatives Insert (Metadaten unvollständig).
        // Review-Status als Overlay in Redis speichern + Audit.
        const overlayKey = `proDocReview:${session.tenantId}:${documentId}`
        await redis.set(overlayKey, JSON.stringify({ reviewStatus, reviewedAt, reviewedBy: session.userId, reviewComment }), { ex: 60 * 60 * 24 * 90 })

        await recordAudit(session.tenantId, session.userId, {
          action: `document.review.${action}.redis_only`,
          entityType: 'case_document',
          entityId: documentId,
          diff: { reviewStatus, source: 'redis', ...(reviewComment ? { reviewComment } : {}) },
        })

        return res.status(200).json({
          ok: true,
          document: null,
          warning: 'Dokument im Vault gefunden, aber noch nicht in der Datenbank synchronisiert. Bitte Akte aktualisieren.',
        })
      }
    } catch (err) {
      console.warn('[document-review] Redis-Fallback fehlgeschlagen:', (err as Error).message)
    }
  }

  // ── 3. Nicht gefunden ─────────────────────────────────────────────────────
  console.warn('[document-review] Dokument nicht gefunden:', { documentId, tenant: session.tenantId })
  return res.status(404).json({
    error: 'Dokument nicht in der Datenbank gefunden — möglicherweise wurde es bereits gelöscht. Bitte Akte aktualisieren.',
  })
}
