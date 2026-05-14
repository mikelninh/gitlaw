import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession, type ProSessionClaims } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { getSql } from '../_db'

const redis = Redis.fromEnv()
const TTL_SECONDS = 60 * 60 * 24 * 90
const CACHE_TTL = 60 * 5  // 5 Min Lese-Cache vor Postgres
const MAX_COLLECTION_SIZE = 900_000
const ALLOWED = new Set(['cases', 'research', 'letters'])

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function collectionTable(collection: string): string | null {
  if (collection === 'cases') return 'cases'
  if (collection === 'research') return 'case_research'
  if (collection === 'letters') return 'case_letters'
  return null
}

function cacheKey(tenantId: string, collection: string, itemId?: string): string {
  return itemId
    ? `proEntity:${tenantId}:${collection}:${itemId}`
    : `proEntity:${tenantId}:${collection}`
}

async function invalidateCache(tenantId: string, collection: string, itemId?: string) {
  await redis.del(cacheKey(tenantId, collection, itemId))
  if (itemId) await redis.del(cacheKey(tenantId, collection))
}

// ── Postgres ──────────────────────────────────────────────────────────────────

async function pgGetItem(tenantId: string, collection: string, itemId: string) {
  const sql = getSql()
  if (collection === 'cases') {
    const caseRows = await sql`
      SELECT * FROM cases
      WHERE id = ${itemId}
        AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId})
        AND deleted_at IS NULL
      LIMIT 1
    `
    if (!caseRows[0]) return null
    // serverDocumentId = doc-id (frontend prefixt selbst nichts; /api/pro/upload?id= prefixt mit proDoc:tenant:)
    const docRows = await sql`
      SELECT id, original_name AS "originalName", internal_name AS "internalName",
             mime_type AS "mimeType", size_bytes AS "sizeBytes",
             checksum_sha256 AS "checksumSha256", storage_provider AS "storageMode",
             id AS "serverDocumentId", kind, checklist_item_id AS "checklistItemId",
             photo_slot_id AS "photoSlotId", uploaded_by AS "uploadedBy",
             uploaded_at AS "uploadedAt", review_status AS "reviewStatus",
             reviewed_by AS "reviewedBy", reviewed_at AS "reviewedAt",
             review_comment AS "reviewComment",
             CASE WHEN storage_ref LIKE 'http%' THEN storage_ref ELSE NULL END AS "dataUrl"
      FROM case_documents
      WHERE case_id = ${itemId} AND deleted_at IS NULL
      ORDER BY uploaded_at DESC
    `
    return { ...caseRows[0], documents: docRows }
  }
  const table = collectionTable(collection)
  if (!table) return null
  const rows = await (table === 'case_research'
    ? sql`SELECT * FROM case_research WHERE id = ${itemId} AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId}) LIMIT 1`
    : sql`SELECT * FROM case_letters WHERE id = ${itemId} AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId}) LIMIT 1`)
  return rows[0] ?? null
}

async function pgGetCollection(tenantId: string, collection: string) {
  const sql = getSql()
  if (collection === 'cases') {
    const cases = await sql`
      SELECT c.* FROM cases c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.slug = ${tenantId} AND c.deleted_at IS NULL
      ORDER BY c.updated_at DESC
    `
    if (cases.length === 0) return cases
    const caseIds = cases.map((c: { id: string }) => c.id)
    const docs = await sql`
      SELECT id, case_id AS "caseId", original_name AS "originalName",
             internal_name AS "internalName", mime_type AS "mimeType",
             size_bytes AS "sizeBytes", checksum_sha256 AS "checksumSha256",
             storage_provider AS "storageMode", id AS "serverDocumentId",
             kind, checklist_item_id AS "checklistItemId",
             photo_slot_id AS "photoSlotId", uploaded_by AS "uploadedBy",
             uploaded_at AS "uploadedAt", review_status AS "reviewStatus",
             reviewed_by AS "reviewedBy", reviewed_at AS "reviewedAt",
             review_comment AS "reviewComment",
             CASE WHEN storage_ref LIKE 'http%' THEN storage_ref ELSE NULL END AS "dataUrl"
      FROM case_documents
      WHERE case_id = ANY(${caseIds}) AND deleted_at IS NULL
      ORDER BY uploaded_at DESC
    `
    const byCase: Record<string, unknown[]> = {}
    for (const d of docs as Array<{ caseId: string }>) {
      if (!byCase[d.caseId]) byCase[d.caseId] = []
      byCase[d.caseId].push(d)
    }
    return cases.map((c: { id: string }) => ({ ...c, documents: byCase[c.id] ?? [] }))
  }
  if (collection === 'research') {
    return sql`
      SELECT r.* FROM case_research r
      JOIN tenants t ON t.id = r.tenant_id
      WHERE t.slug = ${tenantId} AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `
  }
  if (collection === 'letters') {
    return sql`
      SELECT l.* FROM case_letters l
      JOIN tenants t ON t.id = l.tenant_id
      WHERE t.slug = ${tenantId} AND l.deleted_at IS NULL
      ORDER BY l.created_at DESC
    `
  }
  return null
}

async function pgUpsertItem(
  tenantId: string,
  collection: string,
  id: string,
  item: Record<string, unknown>,
) {
  const sql = getSql()
  const now = new Date().toISOString()

  if (collection === 'cases') {
    await sql`
      INSERT INTO cases (
        id, tenant_id, aktenzeichen, mandant_name, description,
        status, case_status, mandatsart_id, frist_datum, frist_bezeichnung,
        mandant_email, behoerde, behoerde_plz,
        checklist_states, tasks, relevant_paragraphs,
        created_at, updated_at
      )
      SELECT
        ${id},
        t.id,
        ${(item.aktenzeichen as string) ?? ''},
        ${(item.mandantName as string) ?? ''},
        ${(item.description as string | null) ?? null},
        ${(item.status as string) ?? 'aktiv'},
        COALESCE(${(item.caseStatus as string | null) ?? null}, 'unterlagen_fehlen')::case_status,
        ${(item.mandatsartId as string | null) ?? null},
        ${(item.fristDatum as string | null) ?? null},
        ${(item.fristBezeichnung as string | null) ?? null},
        ${(item.mandantEmail as string | null) ?? null},
        ${(item.behoerde as string | null) ?? null},
        ${(item.behoerdePLZ as string | null) ?? null},
        ${JSON.stringify(item.checklistStates ?? {})}::jsonb,
        ${JSON.stringify(item.tasks ?? [])}::jsonb,
        ${JSON.stringify(item.relevantParagraphs ?? [])}::jsonb,
        COALESCE(${(item.createdAt as string | null) ?? null}::timestamptz, now()),
        ${now}::timestamptz
      FROM tenants t WHERE t.slug = ${tenantId}
      ON CONFLICT (id) DO UPDATE SET
        aktenzeichen = EXCLUDED.aktenzeichen,
        mandant_name = EXCLUDED.mandant_name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        case_status = EXCLUDED.case_status,
        mandatsart_id = EXCLUDED.mandatsart_id,
        frist_datum = EXCLUDED.frist_datum,
        frist_bezeichnung = EXCLUDED.frist_bezeichnung,
        mandant_email = EXCLUDED.mandant_email,
        behoerde = EXCLUDED.behoerde,
        behoerde_plz = EXCLUDED.behoerde_plz,
        checklist_states = EXCLUDED.checklist_states,
        tasks = EXCLUDED.tasks,
        relevant_paragraphs = EXCLUDED.relevant_paragraphs,
        updated_at = EXCLUDED.updated_at
      WHERE EXCLUDED.updated_at >= cases.updated_at
    `
    // Documents-Array auch nach case_documents syncen
    const docs = Array.isArray(item.documents) ? item.documents : []
    for (const d of docs as Array<Record<string, unknown>>) {
      const docId = d.id as string | undefined
      if (!docId) continue
      const uploadedBy = (d.uploadedBy as string) === 'mandant' ? 'mandant' : 'kanzlei'
      const kindRaw = (d.kind as string) ?? 'standard'
      // Map client storage hints to valid postgres enum values
      // (storage_provider_type ENUM: 'vercel_blob' | 'upstash_redis' | 'neon_large_object').
      const VALID_STORAGE = new Set(['vercel_blob', 'upstash_redis', 'neon_large_object'])
      const rawStorage = (d.storageMode as string | null) ?? null
      const storageProvider = rawStorage && VALID_STORAGE.has(rawStorage) ? rawStorage : 'vercel_blob'
      // storage_ref: für vercel_blob die externe URL aus dataUrl behalten
      // (VK-pre-uploads landen so im PG-Mirror), sonst Redis-Key-Format.
      const rawDataUrl = typeof d.dataUrl === 'string' ? d.dataUrl : null
      const storageRef =
        storageProvider === 'vercel_blob' && rawDataUrl && /^https?:\/\//.test(rawDataUrl)
          ? rawDataUrl
          : `proDoc:${tenantId}:${docId}`
      try {
        await sql`
          INSERT INTO case_documents (
            id, case_id, tenant_id, original_name, internal_name,
            mime_type, size_bytes, checksum_sha256, storage_provider, storage_ref,
            kind, checklist_item_id, photo_slot_id, uploaded_by, uploaded_at
          )
          SELECT
            ${docId},
            ${id},
            t.id,
            ${(d.originalName as string) ?? ''},
            ${(d.internalName as string | null) ?? null},
            ${(d.mimeType as string | null) ?? null},
            ${(d.sizeBytes as number | null) ?? null},
            ${(d.checksumSha256 as string | null) ?? null},
            ${storageProvider},
            ${storageRef},
            ${kindRaw},
            ${(d.checklistItemId as string | null) ?? null},
            ${(d.photoSlotId as string | null) ?? null},
            ${uploadedBy},
            ${(d.uploadedAt as string | null) ?? now}::timestamptz
          FROM tenants t WHERE t.slug = ${tenantId}
          ON CONFLICT (id) DO UPDATE SET
            storage_ref = EXCLUDED.storage_ref,
            storage_provider = EXCLUDED.storage_provider,
            checklist_item_id = COALESCE(EXCLUDED.checklist_item_id, case_documents.checklist_item_id)
          WHERE case_documents.storage_ref LIKE 'proDoc:%'
             OR case_documents.storage_ref IS NULL
        `
      } catch (err) {
        console.warn('[entities] case_document mirror failed:', docId, err instanceof Error ? err.message : err)
      }
    }
  }
}

async function pgSoftDelete(tenantId: string, collection: string, itemId: string) {
  const sql = getSql()
  const table = collectionTable(collection)
  if (!table) return
  if (table === 'cases') {
    await sql`UPDATE cases SET deleted_at = now() WHERE id = ${itemId} AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId})`
  } else if (table === 'case_research') {
    await sql`UPDATE case_research SET deleted_at = now() WHERE id = ${itemId} AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId})`
  } else {
    await sql`UPDATE case_letters SET deleted_at = now() WHERE id = ${itemId} AND tenant_id = (SELECT id FROM tenants WHERE slug = ${tenantId})`
  }
}

// ── Redis-only-Fallback ───────────────────────────────────────────────────────

async function redisOnlyHandler(
  req: VercelRequest,
  res: VercelResponse,
  session: ProSessionClaims,
) {
  const collection = typeof req.query.collection === 'string' ? req.query.collection.trim() : ''
  if (!ALLOWED.has(collection)) {
    return res.status(400).json({ error: 'Unsupported collection' })
  }
  const itemId = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  const bulkKey = cacheKey(session.tenantId, collection)
  const itemKey = itemId ? cacheKey(session.tenantId, collection, itemId) : ''

  if (itemId) {
    if (req.method === 'GET') {
      const payload = await redis.get(itemKey)
      if (!payload) return res.status(404).json({ error: 'Item not found' })
      return res.status(200).json({ ok: true, item: payload })
    }
    if (req.method === 'PUT') {
      const item = req.body?.item
      if (!item) return res.status(400).json({ error: 'Body must contain item' })
      await redis.set(itemKey, { ...item, _updatedAt: new Date().toISOString() }, { ex: TTL_SECONDS })
      return res.status(200).json({ ok: true, id: itemId, collection })
    }
    if (req.method === 'DELETE') {
      await redis.del(itemKey)
      return res.status(200).json({ ok: true, deleted: true })
    }
  }
  if (req.method === 'GET') {
    const payload = await redis.get(bulkKey)
    if (!payload) return res.status(200).json({ tenantId: session.tenantId, collection, items: [] })
    return res.status(200).json(payload)
  }
  if (req.method === 'PUT') {
    const items = req.body?.items
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' })
    const payload = { tenantId: session.tenantId, collection, items, updatedAt: new Date().toISOString() }
    await redis.set(bulkKey, payload, { ex: TTL_SECONDS })
    return res.status(200).json({ ok: true, count: items.length })
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, PUT, POST, DELETE, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Entity persistence is not configured.' })
  }

  if (!usePostgres()) {
    return redisOnlyHandler(req, res, session)
  }

  const collection = typeof req.query.collection === 'string' ? req.query.collection.trim() : ''
  if (!ALLOWED.has(collection)) {
    return res.status(400).json({ error: 'Unsupported collection' })
  }
  const itemId = typeof req.query.id === 'string' ? req.query.id.trim() : ''

  // Individual-Item-Operationen
  if (itemId) {
    const ck = cacheKey(session.tenantId, collection, itemId)
    if (req.method === 'GET') {
      const cached = await redis.get(ck)
      if (cached) return res.status(200).json({ ok: true, item: cached })
      try {
        const row = await pgGetItem(session.tenantId, collection, itemId)
        if (!row) return res.status(404).json({ error: 'Item not found' })
        await redis.set(ck, row, { ex: CACHE_TTL })
        return res.status(200).json({ ok: true, item: row })
      } catch (err) {
        return res.status(500).json({ error: 'Read failed', detail: String(err) })
      }
    }
    if (req.method === 'PUT') {
      const item = req.body?.item
      if (!item) return res.status(400).json({ error: 'Body must contain item' })
      try {
        await pgUpsertItem(session.tenantId, collection, itemId, item)
        await invalidateCache(session.tenantId, collection, itemId)
        return res.status(200).json({ ok: true, id: itemId, collection })
      } catch (err) {
        return res.status(500).json({ error: 'Write failed', detail: String(err) })
      }
    }
    if (req.method === 'DELETE') {
      try {
        await pgSoftDelete(session.tenantId, collection, itemId)
        await invalidateCache(session.tenantId, collection, itemId)
        return res.status(200).json({ ok: true, deleted: true })
      } catch (err) {
        return res.status(500).json({ error: 'Delete failed', detail: String(err) })
      }
    }
    return res.status(405).json({ error: 'Method not allowed for individual item' })
  }

  // POST: neues Item
  if (req.method === 'POST') {
    const item = req.body?.item
    if (!item) return res.status(400).json({ error: 'Body must contain item' })
    const id = (item.id as string | undefined) || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    try {
      await pgUpsertItem(session.tenantId, collection, id, { ...item, id })
      await invalidateCache(session.tenantId, collection)
      return res.status(200).json({ ok: true, id, collection })
    } catch (err) {
      return res.status(500).json({ error: 'Write failed', detail: String(err) })
    }
  }

  // Bulk GET / PUT
  const bulkCk = cacheKey(session.tenantId, collection)
  if (req.method === 'GET') {
    const cached = await redis.get(bulkCk)
    if (cached) return res.status(200).json(cached)
    try {
      const rows = await pgGetCollection(session.tenantId, collection)
      const payload = {
        tenantId: session.tenantId,
        collection,
        items: rows ?? [],
        updatedAt: new Date().toISOString(),
      }
      await redis.set(bulkCk, payload, { ex: CACHE_TTL })
      return res.status(200).json(payload)
    } catch (err) {
      return res.status(500).json({ error: 'Read failed', detail: String(err) })
    }
  }
  if (req.method === 'PUT') {
    const items = req.body?.items
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' })
    const size = JSON.stringify(items).length
    if (size > MAX_COLLECTION_SIZE) {
      return res.status(413).json({ error: 'Collection too large', sizeBytes: size, limitBytes: MAX_COLLECTION_SIZE })
    }
    try {
      for (const item of items as Array<Record<string, unknown>>) {
        const id = (item.id as string | undefined) || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await pgUpsertItem(session.tenantId, collection, id, { ...item, id })
      }
      await invalidateCache(session.tenantId, collection)
      return res.status(200).json({ ok: true, count: items.length })
    } catch (err) {
      return res.status(500).json({ error: 'Bulk write failed', detail: String(err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
