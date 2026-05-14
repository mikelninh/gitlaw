/**
 * DELETE a Mandant-eigenes Dokument.
 *
 * POST /api/mandant/document-delete
 * Body: { token: string, documentId: string }
 *
 * Auth: Token-Hash-Lookup (Postgres-first, Redis-Fallback) — identisch mit case.ts.
 * Berechtigung:
 *   - Dokument muss uploaded_by = 'mandant' sein
 *   - Dokument darf NICHT kind = 'vollmacht' sein (rechtsverbindlich, nicht löschbar)
 *   - Dokument muss zur Akte des Tokens gehören
 *
 * Effekte bei Erfolg:
 *   1. Postgres: deleted_at setzen
 *   2. Redis-Vault: proDoc:{tenantId}:{documentId} löschen
 *   3. Redis-Bulk + Redis-Individual: documents[] filtern
 *   4. Audit-Log: document.delete.mandant
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'
import { recordAudit } from '../_audit'
import type { MandantInvite } from '../pro/mandant-invite'
import { getSql } from '../_db'
import crypto from 'node:crypto'

const redis = Redis.fromEnv()

// ── Invite-Lookup: Postgres-first, Redis-Fallback ──────────────────────────

async function resolveInviteFromPostgres(
  token: string,
): Promise<{ tenantId: string; caseId: string; lang: string } | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const sql = getSql()
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const rows = await sql`
      SELECT mi.case_id, mi.lang, t.slug AS tenant_slug
      FROM mandant_invitations mi
      JOIN tenants t ON t.id = mi.tenant_id
      WHERE mi.token_hash = ${tokenHash}
        AND mi.expires_at > now()
        AND mi.revoked_at IS NULL
      LIMIT 1
    `
    if (!rows[0]) return null
    return {
      tenantId: rows[0].tenant_slug as string,
      caseId: rows[0].case_id as string,
      lang: rows[0].lang as string,
    }
  } catch (err) {
    console.warn('[mandant/document-delete] Postgres-Invite-Lookup fehlgeschlagen:', err)
    return null
  }
}

async function resolveInviteFromRedis(token: string): Promise<MandantInvite | null> {
  const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
  if (!invite) return null
  const now = Math.floor(Date.now() / 1000)
  if (invite.expiresAt < now) return null
  return invite
}

// ── Redis-Snapshots bereinigen ─────────────────────────────────────────────

interface StoredCase {
  id: string
  documents?: Array<{ id: string; [key: string]: unknown }>
  updatedAt?: string
  [key: string]: unknown
}

async function removeDocumentFromRedis(
  tenantId: string,
  caseId: string,
  documentId: string,
): Promise<void> {
  const updatedAt = new Date().toISOString()

  // 1. Individual-Key
  const individualKey = `proEntity:${tenantId}:cases:${caseId}`
  const individual = await redis.get<StoredCase>(individualKey)
  if (individual) {
    const updated: StoredCase = {
      ...individual,
      documents: (Array.isArray(individual.documents) ? individual.documents : []).filter(
        d => d.id !== documentId,
      ),
      updatedAt,
    }
    await redis.set(individualKey, updated, { ex: 60 * 60 * 24 * 90 })
  }

  // 2. Bulk-Key (den /pro liest)
  const bulkKey = `proEntity:${tenantId}:cases`
  const bulk = await redis.get<{
    tenantId: string
    collection: string
    items: StoredCase[]
    updatedAt: string
    updatedBy: string
  }>(bulkKey)
  if (bulk?.items) {
    const idx = bulk.items.findIndex(c => c.id === caseId)
    if (idx >= 0) {
      const caseEntry = bulk.items[idx]
      bulk.items[idx] = {
        ...caseEntry,
        documents: (Array.isArray(caseEntry.documents) ? caseEntry.documents : []).filter(
          d => d.id !== documentId,
        ),
        updatedAt,
      }
      bulk.updatedAt = updatedAt
      await redis.set(bulkKey, bulk, { ex: 60 * 60 * 24 * 90 })
    }
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const rlOk = await applyRateLimit(req, res, RATE_WRITE)
  if (!rlOk) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, documentId } = req.body || {}

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ error: 'Token fehlt' })
  }
  if (!documentId || typeof documentId !== 'string') {
    return res.status(400).json({ error: 'documentId fehlt' })
  }

  // Invite resolven
  let tenantId: string
  let caseId: string

  const pgInvite = await resolveInviteFromPostgres(token.trim())
  if (pgInvite) {
    tenantId = pgInvite.tenantId
    caseId = pgInvite.caseId
  } else {
    const redisInvite = await resolveInviteFromRedis(token.trim())
    if (!redisInvite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
    tenantId = redisInvite.tenantId
    caseId = redisInvite.caseId
  }

  // Dokument prüfen + soft-delete in Postgres
  let docValidated = false
  if (process.env.DATABASE_URL) {
    try {
      const sql = getSql()

      // Validierung: muss zur Akte + vom Mandanten + kein Vollmacht sein
      const docs = await sql`
        SELECT id, uploaded_by, kind
        FROM case_documents
        WHERE id = ${documentId}
          AND case_id = ${caseId}
          AND deleted_at IS NULL
        LIMIT 1
      `
      if (!docs[0]) {
        return res.status(404).json({ error: 'Dokument nicht gefunden' })
      }
      if (docs[0].uploaded_by !== 'mandant') {
        return res.status(403).json({ error: 'Nur eigene Dokumente dürfen gelöscht werden' })
      }
      if (docs[0].kind === 'vollmacht') {
        return res.status(403).json({
          error: 'Die Vollmacht kann nicht gelöscht werden. Bitte kontaktieren Sie Ihre Kanzlei.',
        })
      }

      // Soft-delete
      await sql`
        UPDATE case_documents
        SET deleted_at = now()
        WHERE id = ${documentId}
          AND case_id = ${caseId}
      `
      await sql`UPDATE cases SET updated_at = now() WHERE id = ${caseId}`
      docValidated = true
    } catch (err) {
      console.warn('[mandant/document-delete] Postgres-Fehler:', err)
      // Falls Postgres fehlt: Redis-only Validation folgt unten
    }
  }

  if (!docValidated) {
    // Redis-only Fallback: Dokument aus Vault prüfen
    const vaultKey = `proDoc:${tenantId}:${documentId}`
    const vaultEntry = await redis.get<{
      caseId: string
      uploadedBy?: string
      kind?: string
    }>(vaultKey)

    if (!vaultEntry) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' })
    }
    if (vaultEntry.caseId !== caseId) {
      return res.status(403).json({ error: 'Zugriff verweigert' })
    }
    if (vaultEntry.uploadedBy !== 'mandant') {
      return res.status(403).json({ error: 'Nur eigene Dokumente dürfen gelöscht werden' })
    }
    if (vaultEntry.kind === 'vollmacht') {
      return res.status(403).json({
        error: 'Die Vollmacht kann nicht gelöscht werden. Bitte kontaktieren Sie Ihre Kanzlei.',
      })
    }
  }

  // Redis-Vault: Datei-Inhalt löschen
  await redis.del(`proDoc:${tenantId}:${documentId}`)

  // Redis-Snapshots bereinigen (Individual + Bulk)
  await removeDocumentFromRedis(tenantId, caseId, documentId)

  // Audit-Log
  await recordAudit(tenantId, `mandant:${caseId}`, {
    action: 'document.delete.mandant',
    entityType: 'case_document',
    entityId: documentId,
  })

  return res.status(200).json({ ok: true, deleted: true })
}
