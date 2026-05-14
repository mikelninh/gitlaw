/**
 * POST /api/mandant/vollmacht
 *
 * Speichert eine digital signierte Vollmacht (PNG) für einen Mandanten.
 * Token-Auth: Postgres-first, Redis-Fallback (siehe _invite-resolver).
 *
 * Body POST: { token, signaturePngBase64, ortsangabe, datumIso }
 * Antwort POST: { ok, documentId }
 *
 * GET /api/mandant/vollmacht?token=&id=
 * Liefert die signierte Vollmacht-PNG zurück (für Mandant-Vorschau).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'
import { resolveMandantInvite } from './_invite-resolver'
import { getSql } from '../_db'

const redis = Redis.fromEnv()

const MAX_BASE64_BYTES = 700_000
const TTL_SECONDS = 60 * 60 * 24 * 90

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface StoredCase {
  id: string
  documents?: unknown[]
  updatedAt?: string
  [key: string]: unknown
}

async function appendDocumentToCase(
  tenantId: string,
  caseId: string,
  doc: {
    id: string
    originalName: string
    internalName: string
    mimeType: string
    sizeBytes: number
    uploadedAt: string
    uploadedBy: string
    storageMode: string
    serverDocumentId: string
    checksumSha256: string
    kind: 'vollmacht'
    ortsangabe: string
    datumIso: string
  },
): Promise<void> {
  const updatedAt = new Date().toISOString()

  const individualKey = `proEntity:${tenantId}:cases:${caseId}`
  const individual = await redis.get<StoredCase>(individualKey)
  if (individual) {
    await redis.set(
      individualKey,
      {
        ...individual,
        documents: [...(Array.isArray(individual.documents) ? individual.documents : []), doc],
        updatedAt,
      },
      { ex: TTL_SECONDS },
    )
  }

  const bulkKey = `proEntity:${tenantId}:cases`
  const bulk = await redis.get<{
    tenantId: string
    collection: string
    items: StoredCase[]
    updatedAt: string
    updatedBy: string
  }>(bulkKey)
  if (bulk?.items) {
    const idx = bulk.items.findIndex((c: StoredCase) => c.id === caseId)
    if (idx >= 0) {
      const caseEntry = bulk.items[idx]
      bulk.items[idx] = {
        ...caseEntry,
        documents: [
          ...(Array.isArray(caseEntry.documents) ? caseEntry.documents : []),
          doc,
        ],
        updatedAt,
      }
      bulk.updatedAt = updatedAt
      await redis.set(bulkKey, bulk, { ex: TTL_SECONDS })
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Datenzugriff nicht verfügbar.',
      hint: 'Backend nicht konfiguriert.',
    })
  }

  // GET — Vollmacht-PNG abrufen (für Mandant-Vorschau)
  if (req.method === 'GET') {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : ''
    if (!token || !id) return res.status(400).json({ error: 'token + id sind erforderlich' })

    const invite = await resolveMandantInvite(token)
    if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

    const docKey = `proDoc:${invite.tenantId}:${id}`
    const payload = await redis.get<{
      caseId: string
      mimeType: string
      kind?: string
      base64: string
    }>(docKey)
    if (!payload) return res.status(404).json({ error: 'Vollmacht nicht gefunden' })
    if (payload.caseId !== invite.caseId) return res.status(403).json({ error: 'Zugriff nicht erlaubt' })
    if (payload.kind !== 'vollmacht') return res.status(400).json({ error: 'Falsches Dokument-Typ' })

    const buffer = Buffer.from(payload.base64, 'base64')
    res.setHeader('Content-Type', payload.mimeType || 'image/png')
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).send(buffer)
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rlOk = await applyRateLimit(req, res, RATE_WRITE)
  if (!rlOk) return

  const { token, signaturePngBase64, ortsangabe, datumIso } = req.body || {}

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ error: 'Token fehlt' })
  }

  const invite = await resolveMandantInvite(token)
  if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

  if (!signaturePngBase64 || typeof signaturePngBase64 !== 'string') {
    return res.status(400).json({ error: 'signaturePngBase64 ist erforderlich' })
  }

  if (signaturePngBase64.length > MAX_BASE64_BYTES) {
    return res.status(413).json({ error: 'Unterschrift zu groß', limitBase64Bytes: MAX_BASE64_BYTES })
  }

  const safeOrt = typeof ortsangabe === 'string' && ortsangabe.trim() ? ortsangabe.trim() : 'Berlin'
  const safeDate = typeof datumIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datumIso)
    ? datumIso
    : new Date().toISOString().slice(0, 10)

  const documentId = uid()
  const checksumSha256 = createHash('sha256').update(signaturePngBase64).digest('hex')
  const uploadedAt = new Date().toISOString()
  const originalName = `Vollmacht-${safeDate}.png`
  const internalName = `mandant_vollmacht_${safeDate}_${documentId}.png`

  const docKey = `proDoc:${invite.tenantId}:${documentId}`
  await redis.set(
    docKey,
    {
      tenantId: invite.tenantId,
      caseId: invite.caseId,
      fileName: originalName,
      mimeType: 'image/png',
      sizeBytes: Math.round((signaturePngBase64.length * 3) / 4),
      checksumSha256,
      storageProvider: 'upstash-beta-vault',
      base64: signaturePngBase64,
      uploadedAt,
      uploadedBy: 'mandant',
      kind: 'vollmacht',
      ortsangabe: safeOrt,
      datumIso: safeDate,
    },
    { ex: TTL_SECONDS },
  )

  const docRecord = {
    id: documentId,
    originalName,
    internalName,
    mimeType: 'image/png',
    sizeBytes: Math.round((signaturePngBase64.length * 3) / 4),
    uploadedAt,
    uploadedBy: 'mandant',
    storageMode: 'server_vault',
    serverDocumentId: documentId,
    checksumSha256,
    kind: 'vollmacht' as const,
    ortsangabe: safeOrt,
    datumIso: safeDate,
  }

  await appendDocumentToCase(invite.tenantId, invite.caseId, docRecord)

  // Cache-Invalidierung
  try {
    await redis.del(`proEntity:${invite.tenantId}:cases`)
    await redis.del(`proEntity:${invite.tenantId}:cases:${invite.caseId}`)
  } catch { /* non-blocking */ }

  // Postgres mirror — statischer Import (kein dynamic import in Vercel-Functions)
  try {
    const sql = getSql()
    await sql`
      INSERT INTO case_documents (
        id, case_id, tenant_id, original_name, internal_name,
        mime_type, size_bytes, checksum_sha256, storage_provider, storage_ref,
        kind, checklist_item_id, uploaded_by, uploaded_at
      )
      SELECT
        ${documentId},
        ${invite.caseId},
        t.id,
        ${originalName}, ${internalName}, 'image/png',
        ${Math.round((signaturePngBase64.length * 3) / 4)},
        ${checksumSha256}, 'upstash_redis', ${docKey},
        'vollmacht', 'anwaltsvollmacht', 'mandant', ${uploadedAt}::timestamptz
      FROM tenants t WHERE t.slug = ${invite.tenantId}
      ON CONFLICT (id) DO NOTHING
    `
    // Auch checklist_states + updated_at setzen
    await sql`
      UPDATE cases
      SET checklist_states = COALESCE(checklist_states, '{}'::jsonb)
          || jsonb_build_object('anwaltsvollmacht'::text, 'received'::text),
          updated_at = now()
      WHERE id = ${invite.caseId}
    `
  } catch (err) {
    console.error('[vollmacht] Postgres mirror FAILED:', err instanceof Error ? err.message : err, 'docId=', documentId, 'caseId=', invite.caseId)
  }

  // proSync-Snapshot-Update für /pro pullFromCloud-Sichtbarkeit
  try {
    const snapKey = `proSync:${invite.tenantId}`
    const snap = await redis.get<{
      cases?: Array<{ id: string; documents?: unknown[]; updatedAt?: string }>
      exportedAt?: string
    }>(snapKey)
    if (snap?.cases && Array.isArray(snap.cases)) {
      const idx = snap.cases.findIndex(c => c.id === invite.caseId)
      if (idx >= 0) {
        snap.cases[idx].documents = [...(snap.cases[idx].documents ?? []), docRecord]
        snap.cases[idx].updatedAt = uploadedAt
        snap.exportedAt = uploadedAt
        await redis.set(snapKey, snap, { ex: TTL_SECONDS })
      }
    }
  } catch (err) {
    console.warn('[vollmacht] proSync update failed:', err instanceof Error ? err.message : err)
  }

  return res.status(200).json({ ok: true, documentId })
}
