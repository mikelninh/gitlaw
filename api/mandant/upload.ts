import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'
import { resolveMandantInvite } from './_invite-resolver'
import { getSql } from '../_db'

/**
 * Items die nur Fotos (kein PDF) akzeptieren.
 * Wird parallel zu acceptedFormats in mandatsart-checklists.ts gepflegt.
 * Wenn ein neues image-only Item hinzukommt, hier eintragen.
 */
const IMAGE_ONLY_ITEM_IDS = new Set([
  'biometrisches-lichtbild',
  'biometrisches-lichtbild-antragsteller',
  'biometrisches-lichtbild-kind',
  'biometrisches_lichtbild',
  'biometrisches_lichtbild_kind',
])

const redis = Redis.fromEnv()
const MAX_BASE64_BYTES = 4_500_000
const TTL_SECONDS = 60 * 60 * 24 * 30

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface StoredCase {
  id: string
  documents?: unknown[]
  checklistStates?: Record<string, string>
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
    checklistItemId?: string
  },
  checklistItemId?: string,
): Promise<void> {
  const updatedAt = new Date().toISOString()

  // 1. Individual-Key updaten (wenn vorhanden)
  const individualKey = `proEntity:${tenantId}:cases:${caseId}`
  const individual = await redis.get<StoredCase>(individualKey)
  if (individual) {
    const updated: StoredCase = {
      ...individual,
      documents: [...(Array.isArray(individual.documents) ? individual.documents : []), doc],
      checklistStates: checklistItemId
        ? { ...(individual.checklistStates ?? {}), [checklistItemId]: 'received' }
        : (individual.checklistStates ?? {}),
      updatedAt,
    }
    // TTL aus dem Bulk-Pattern: 90 Tage
    await redis.set(individualKey, updated, { ex: 60 * 60 * 24 * 90 })
  }

  // 2. Bulk-Key updaten (den /pro liest)
  const bulkKey = `proEntity:${tenantId}:cases`
  const bulk = await redis.get<{ tenantId: string; collection: string; items: StoredCase[]; updatedAt: string; updatedBy: string }>(bulkKey)
  if (bulk?.items) {
    const idx = bulk.items.findIndex((c: StoredCase) => c.id === caseId)
    if (idx >= 0) {
      const caseEntry = bulk.items[idx]
      bulk.items[idx] = {
        ...caseEntry,
        documents: [...(Array.isArray(caseEntry.documents) ? caseEntry.documents : []), doc],
        checklistStates: checklistItemId
          ? { ...(caseEntry.checklistStates ?? {}), [checklistItemId]: 'received' }
          : (caseEntry.checklistStates ?? {}),
        updatedAt,
      }
      bulk.updatedAt = updatedAt
      await redis.set(bulkKey, bulk, { ex: 60 * 60 * 24 * 90 })
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Upload-Spam-Schutz (RATE_WRITE: 30 req/min/IP)
  const rlOk = await applyRateLimit(req, res, RATE_WRITE)
  if (!rlOk) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Upload-Vault ist nicht konfiguriert.',
      hint: 'Upstash-Integration im Vercel-Dashboard verbinden.',
    })
  }

  if (req.method === 'POST') {
    const { token, checklistItemId, photoSlotId, fileName, mimeType, base64, sizeBytes } = req.body || {}

    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Token fehlt' })
    }

    const invite = await resolveMandantInvite(token.trim())
    if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

    if (!fileName || !mimeType || !base64 || !sizeBytes) {
      return res.status(400).json({ error: 'fileName, mimeType, base64 und sizeBytes sind erforderlich' })
    }

    if (typeof mimeType !== 'string' || (!mimeType.startsWith('image/') && mimeType !== 'application/pdf')) {
      return res.status(400).json({ error: 'Nur Bilder und PDFs sind erlaubt' })
    }

    // Für image-only Items (z.B. biometrisches Passfoto) PDF ablehnen
    if (
      typeof checklistItemId === 'string' &&
      IMAGE_ONLY_ITEM_IDS.has(checklistItemId) &&
      mimeType === 'application/pdf'
    ) {
      return res.status(400).json({
        error: 'Für dieses Dokument bitte ein Foto (JPG/PNG), kein PDF',
      })
    }

    if (typeof base64 !== 'string' || base64.length > MAX_BASE64_BYTES) {
      return res.status(413).json({
        error: 'Datei zu groß',
        limitBase64Bytes: MAX_BASE64_BYTES,
      })
    }

    const documentId = uid()
    const checksumSha256 = createHash('sha256').update(base64).digest('hex')
    const uploadedAt = new Date().toISOString()

    const docKey = `proDoc:${invite.tenantId}:${documentId}`
    await redis.set(
      docKey,
      {
        tenantId: invite.tenantId,
        caseId: invite.caseId,
        fileName,
        mimeType,
        sizeBytes,
        checksumSha256,
        storageProvider: 'upstash-beta-vault',
        base64,
        uploadedAt,
        uploadedBy: 'mandant',
      },
      { ex: TTL_SECONDS },
    )

    const isoDate = new Date().toISOString().slice(0, 10)
    const internalName = checklistItemId
      ? `mandant_${checklistItemId}_${isoDate}_${fileName}`
      : `mandant_${isoDate}_${fileName}`

    const docRecord = {
      id: documentId,
      originalName: fileName,
      internalName,
      mimeType,
      sizeBytes,
      uploadedAt,
      uploadedBy: 'mandant',
      storageMode: 'server_vault',
      serverDocumentId: documentId,
      checksumSha256,
      checklistItemId: typeof checklistItemId === 'string' ? checklistItemId : undefined,
      photoSlotId: typeof photoSlotId === 'string' ? photoSlotId : undefined,
    }

    await appendDocumentToCase(
      invite.tenantId,
      invite.caseId,
      docRecord,
      typeof checklistItemId === 'string' ? checklistItemId : undefined,
    )

    // Cache-Invalidierung — Bao soll Mandant-Upload sofort sehen, nicht erst nach 5min Cache-TTL
    try {
      await redis.del(`proEntity:${invite.tenantId}:cases`)
      await redis.del(`proEntity:${invite.tenantId}:cases:${invite.caseId}`)
    } catch { /* non-blocking */ }

    // Postgres mirror — Document zusätzlich in Postgres persistieren.
    // Statischer Import oben (kein dynamic import in Vercel-Functions — failed silent).
    try {
      const sql = getSql()
      await sql`
        INSERT INTO case_documents (
          id, case_id, tenant_id, original_name, internal_name,
          mime_type, size_bytes, checksum_sha256, storage_provider, storage_ref,
          kind, checklist_item_id, photo_slot_id, uploaded_by, uploaded_at
        )
        SELECT
          ${documentId},
          ${invite.caseId},
          t.id,
          ${fileName}, ${internalName}, ${mimeType},
          ${sizeBytes}, ${checksumSha256}, 'upstash_redis', ${docKey},
          'mandant_upload',
          ${typeof checklistItemId === 'string' ? checklistItemId : null},
          ${typeof photoSlotId === 'string' ? photoSlotId : null},
          'mandant', ${uploadedAt}::timestamptz
        FROM tenants t WHERE t.slug = ${invite.tenantId}
        ON CONFLICT (id) DO NOTHING
      `
      // checklist_states im cases-row updaten — der Mandant-Frontend liest das
      // nicht (rechnet selbst), aber Pro-Side legacy-views schon
      if (typeof checklistItemId === 'string') {
        await sql`
          UPDATE cases
          SET checklist_states = COALESCE(checklist_states, '{}'::jsonb)
              || jsonb_build_object(${checklistItemId}::text, 'received'::text),
              updated_at = now()
          WHERE id = ${invite.caseId}
        `
      } else {
        await sql`UPDATE cases SET updated_at = now() WHERE id = ${invite.caseId}`
      }
    } catch (err) {
      console.error('[upload] Postgres mirror FAILED:', err instanceof Error ? err.message : err, 'docId=', documentId, 'caseId=', invite.caseId)
    }

    // proSync-Snapshot aktualisieren (für /pro pullFromCloud-Sichtbarkeit)
    try {
      const snapKey = `proSync:${invite.tenantId}`
      const snap = await redis.get<any>(snapKey)
      if (snap?.cases && Array.isArray(snap.cases)) {
        const idx = snap.cases.findIndex((c: any) => c.id === invite.caseId)
        if (idx >= 0) {
          snap.cases[idx].documents = [...(snap.cases[idx].documents ?? []), docRecord]
          snap.cases[idx].updatedAt = uploadedAt
          snap.exportedAt = uploadedAt
          await redis.set(snapKey, snap, { ex: 60 * 60 * 24 * 90 })
        }
      }
    } catch (err) {
      console.warn('[mandant-sync] proSync update failed:', err instanceof Error ? err.message : err)
    }

    return res.status(200).json({ ok: true, documentId, checksumSha256 })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
