import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import type { MandantInvite } from '../pro/mandant-invite'
import { getSql } from '../_db'
import crypto from 'node:crypto'

const redis = Redis.fromEnv()

interface StoredCase {
  id: string
  aktenzeichen: string
  mandantName: string
  description?: string
  caseStatus?: string
  mandatsartId?: string
  fristDatum?: string
  fristBezeichnung?: string
  updatedAt: string
  createdAt: string
  checklistStates?: Record<string, 'received' | 'pending' | 'problem'>
  documents?: StoredDocument[]
  // Felder die wir NICHT weitergeben:
  // researchIds, letterIds, tasks, documentJobs, relevantParagraphs,
  // mandantEmail, behoerde, behoerdePLZ, logoDataUrl, etc.
}

interface StoredDocument {
  id: string
  originalName: string
  uploadedAt: string
  uploadedBy?: string
  checklistItemId?: string
  mimeType?: string
  sizeBytes?: number
  storageMode?: string
  serverDocumentId?: string
  checksumSha256?: string
  kind?: 'vollmacht' | 'standard'
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
  reviewComment?: string
  // dataUrl wird nie weitergegeben
}

function filterCase(raw: StoredCase) {
  return {
    id: raw.id,
    aktenzeichen: raw.aktenzeichen,
    mandantName: raw.mandantName,
    description: raw.description ?? '',
    caseStatus: raw.caseStatus ?? 'unterlagen_fehlen',
    mandatsartId: raw.mandatsartId ?? null,
    fristDatum: raw.fristDatum ?? null,
    fristBezeichnung: raw.fristBezeichnung ?? null,
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    checklistStates: raw.checklistStates ?? {},
    // Alle Documents durchlassen (egal wer hochgeladen hat) — sonst zaehlt
    // der Mandant-Frontend Pflicht-Items als unvollstaendig obwohl Bao
    // das Doc bereits selbst gescannt hat. Der Mandant-Frontend zeigt in
    // der "Bereits eingereichte Dokumente"-Liste nur seine eigenen Uploads,
    // aber die Pro-Uploads zaehlen in der Pflicht-Card-Progress mit.
    // Sicherheit: dataUrl + base64 + interne Felder werden NICHT geleakt.
    documents: (raw.documents ?? [])
      .map(d => ({
        id: d.id,
        originalName: d.originalName,
        uploadedAt: d.uploadedAt,
        checklistItemId: d.checklistItemId ?? null,
        mimeType: d.mimeType ?? null,
        sizeBytes: d.sizeBytes ?? null,
        kind: d.kind ?? 'standard',
        // uploadedBy nur normalisiert: 'mandant' oder 'kanzlei' — kein PII
        uploadedBy: d.uploadedBy === 'mandant' ? 'mandant' : 'kanzlei',
        serverDocumentId: d.serverDocumentId ?? null,
        reviewStatus: (d.reviewStatus ?? 'pending') as 'pending' | 'approved' | 'rejected',
        reviewedAt: d.reviewedAt ?? null,
        reviewComment: d.reviewComment ?? null,
        // ortsangabe/datumIso nur bei Vollmacht-Docs aus Redis vorhanden
        ortsangabe: (d as { ortsangabe?: string }).ortsangabe ?? null,
        datumIso: (d as { datumIso?: string }).datumIso ?? null,
      })),
  }
}

// ── Invite-Lookup: Postgres-first, Redis-Fallback ─────────────────────────────

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
    console.warn('[mandant/case] Postgres-Invite-Lookup fehlgeschlagen, falle auf Redis zurück:', err)
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

// ── Case-Lookup: Postgres-first, Redis-Fallback ───────────────────────────────

async function loadCaseFromPostgres(tenantSlug: string, caseId: string): Promise<StoredCase | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT
        c.id,
        c.aktenzeichen,
        c.mandant_name        AS "mandantName",
        c.description,
        c.case_status         AS "caseStatus",
        c.mandatsart_id       AS "mandatsartId",
        c.frist_datum         AS "fristDatum",
        c.frist_bezeichnung   AS "fristBezeichnung",
        c.updated_at          AS "updatedAt",
        c.created_at          AS "createdAt",
        c.checklist_states    AS "checklistStates"
      FROM cases c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE c.id = ${caseId}
        AND t.slug = ${tenantSlug}
        AND c.deleted_at IS NULL
      LIMIT 1
    `
    if (!rows[0]) return null

    const docRows = await sql`
      SELECT
        d.id,
        d.original_name       AS "originalName",
        d.uploaded_at         AS "uploadedAt",
        d.uploaded_by         AS "uploadedBy",
        d.checklist_item_id   AS "checklistItemId",
        d.mime_type           AS "mimeType",
        d.size_bytes          AS "sizeBytes",
        d.storage_provider    AS "storageMode",
        d.id                  AS "serverDocumentId",
        d.checksum_sha256     AS "checksumSha256",
        d.kind,
        d.review_status       AS "reviewStatus",
        d.reviewed_by         AS "reviewedBy",
        d.reviewed_at         AS "reviewedAt",
        d.review_comment      AS "reviewComment"
      FROM case_documents d
      WHERE d.case_id = ${caseId}
        AND d.deleted_at IS NULL
    `

    const raw = rows[0] as StoredCase
    raw.updatedAt = new Date(raw.updatedAt as unknown as Date).toISOString()
    raw.createdAt = new Date(raw.createdAt as unknown as Date).toISOString()
    raw.documents = docRows as unknown as StoredDocument[]
    return raw
  } catch (err) {
    console.warn('[mandant/case] Postgres-Case-Lookup fehlgeschlagen, falle auf Redis zurück:', err)
    return null
  }
}

async function loadCaseFromRedis(tenantId: string, caseId: string): Promise<StoredCase | null> {
  const individual = await redis.get<StoredCase>(`proEntity:${tenantId}:cases:${caseId}`)
  if (individual) return individual

  const bulk = await redis.get<{ items?: StoredCase[] }>(`proEntity:${tenantId}:cases`)
  if (bulk?.items) {
    return bulk.items.find(c => c.id === caseId) ?? null
  }

  return null
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const hasDb = Boolean(process.env.DATABASE_URL)
  const hasRedis = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasDb && !hasRedis) {
    return res.status(503).json({
      error: 'Datenzugriff nicht verfügbar.',
      hint: 'Backend nicht konfiguriert.',
    })
  }

  if (req.method === 'GET') {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
    if (!token) return res.status(401).json({ error: 'Token fehlt' })

    // Invite resolven: Postgres-first, Fallback auf Redis
    let tenantId: string
    let caseId: string
    let lang: string

    const pgInvite = await resolveInviteFromPostgres(token)
    if (pgInvite) {
      tenantId = pgInvite.tenantId
      caseId = pgInvite.caseId
      lang = pgInvite.lang
    } else {
      const redisInvite = await resolveInviteFromRedis(token)
      if (!redisInvite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
      tenantId = redisInvite.tenantId
      caseId = redisInvite.caseId
      lang = redisInvite.lang
    }

    // Case laden: Postgres-first, Fallback auf Redis
    let caseData = await loadCaseFromPostgres(tenantId, caseId)
    if (!caseData) {
      caseData = await loadCaseFromRedis(tenantId, caseId)
    }
    if (!caseData) return res.status(404).json({ error: 'Akte nicht gefunden' })

    // Defensiver Merge: wenn PG die Akte hat, aber Docs leer sind (z. B. weil
    // der Postgres-Mirror in vollmacht.ts ohne Error leer blieb, weil der Tenant
    // Slug noch nicht in PG war), dann Redis-Docs hinzufügen damit die Vollmacht
    // nach Reload sichtbar bleibt.
    if (caseData && (!caseData.documents || caseData.documents.length === 0)) {
      const redisCaseData = await loadCaseFromRedis(tenantId, caseId)
      if (redisCaseData?.documents && redisCaseData.documents.length > 0) {
        caseData.documents = redisCaseData.documents
      }
    }

    return res.status(200).json({
      ok: true,
      case: filterCase(caseData),
      lang,
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
