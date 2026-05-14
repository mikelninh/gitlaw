/**
 * Redis → Postgres Migration (idempotent)
 *
 * Liest aus Upstash Redis, schreibt nach Neon Postgres.
 * Sicher mehrfach ausführbar: ON CONFLICT DO UPDATE / DO NOTHING je Tabelle.
 *
 * Ausführen:
 *   DATABASE_URL_UNPOOLED=... npx tsx scripts/migrate-redis-to-postgres.ts
 *
 * Env-Vars (aus .env.local oder vercel env pull):
 *   KV_REST_API_URL, KV_REST_API_TOKEN  — Upstash Redis
 *   DATABASE_URL_UNPOOLED               — Neon (ungepoolter Direkt-Verbindungs-String)
 */

import { Redis } from '@upstash/redis'
import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

// ── Verbindungen ─────────────────────────────────────────────────────────────

const redis = Redis.fromEnv()

const dbUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!dbUrl) {
  console.error('Fehler: DATABASE_URL_UNPOOLED oder DATABASE_URL muss gesetzt sein.')
  process.exit(1)
}
const sql = neon(dbUrl)

// ── Bekannte Tenants (aus _auth.ts INVITE_MAP) ───────────────────────────────

const KNOWN_TENANTS = [
  { slug: 'kanzlei-nguyen',    name: 'Kanzlei Nguyen' },
  { slug: 'kanzlei-rubin',     name: 'Kanzlei Rubin' },
  { slug: 'kanzlei-gniosdorz', name: 'Kanzlei Gniosdorz' },
  { slug: 'beta-shared',       name: 'Beta Shared' },
]

// ── Typen ────────────────────────────────────────────────────────────────────

interface StoredCase {
  id: string
  aktenzeichen: string
  mandantName: string
  description?: string
  status?: string
  caseStatus?: string
  mandatsartId?: string
  fristDatum?: string
  fristBezeichnung?: string
  mandantEmail?: string
  behoerde?: string
  behoerdePLZ?: string
  checklistStates?: Record<string, string>
  tasks?: unknown[]
  relevantParagraphs?: unknown[]
  documents?: StoredDocument[]
  createdAt: string
  updatedAt: string
  _createdAt?: string
  _updatedAt?: string
}

interface StoredDocument {
  id: string
  originalName: string
  internalName?: string
  mimeType?: string
  sizeBytes?: number
  uploadedAt: string
  uploadedBy?: string
  kind?: string
  checklistItemId?: string
  photoSlotId?: string
  storageMode?: string
  serverDocumentId?: string
  checksumSha256?: string
  ocrText?: string
  translatedTextDe?: string
  translationReviewed?: boolean
}

interface StoredResearch {
  id: string
  caseId?: string
  question: string
  answer: string
  citations?: unknown[]
  reviewed?: boolean
  approvedAnswer?: string
  createdAt: string
}

interface StoredLetter {
  id: string
  caseId?: string
  templateId: string
  templateTitle: string
  fields?: Record<string, string>
  body: string
  letterStatus?: string
  createdAt: string
}

interface StoredMandantInvite {
  tenantId: string
  caseId: string
  lang: string
  expiresAt: number
  createdBy: string
  createdAt: string
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function toTs(iso?: string): string {
  return iso ? new Date(iso).toISOString() : new Date().toISOString()
}

function normalizeCaseStatus(raw?: string): string {
  const allowed = new Set([
    'unterlagen_fehlen', 'unterlagen_in_pruefung', 'antrag_in_vorbereitung',
    'antrag_eingereicht', 'behoerdliche_rueckmeldung_ausstehend',
    'behoerde_nachforderung', 'termin_steht_aus', 'verfahren_abgeschlossen',
  ])
  return raw && allowed.has(raw) ? raw : 'unterlagen_fehlen'
}

function normalizeStatus(raw?: string): string {
  return raw === 'archiviert' ? 'archiviert' : 'aktiv'
}

// ── SCAN-basierter Redis-Key-Iterator ────────────────────────────────────────

async function* scanKeys(pattern: string): AsyncGenerator<string> {
  let cursor = 0
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    for (const key of keys) yield key
  } while (cursor !== 0)
}

// ── 1. Tenants ────────────────────────────────────────────────────────────────

async function migrateTenants(): Promise<Map<string, string>> {
  console.log('\n[1/6] Tenants...')
  const slugToUuid = new Map<string, string>()

  for (const t of KNOWN_TENANTS) {
    const rows = await sql`
      INSERT INTO tenants (slug, name, plan)
      VALUES (${t.slug}, ${t.name}, 'pilot')
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id
    `
    slugToUuid.set(t.slug, rows[0].id as string)
    console.log(`  ok ${t.slug} -> ${rows[0].id}`)
  }

  return slugToUuid
}

// ── 2. Cases ──────────────────────────────────────────────────────────────────

async function migrateCases(slugToUuid: Map<string, string>): Promise<void> {
  console.log('\n[2/6] Cases...')

  for (const [slug, tenantUuid] of slugToUuid) {
    const individualKeys: string[] = []
    for await (const key of scanKeys(`proEntity:${slug}:cases:*`)) {
      individualKeys.push(key)
    }

    // Bulk-Key einmalig laden
    const bulkData = await redis.get<{ items?: StoredCase[] }>(`proEntity:${slug}:cases`)
    const bulkById = new Map<string, StoredCase>()
    if (bulkData?.items) {
      for (const c of bulkData.items) {
        if (c?.id) bulkById.set(c.id, c)
      }
    }

    // Individual-Keys priorisiert (aktueller als Bulk)
    const migratedIds = new Set<string>()
    for (const key of individualKeys) {
      const raw = await redis.get<StoredCase>(key)
      if (!raw?.id) continue
      await upsertCase(raw, tenantUuid)
      migratedIds.add(raw.id)
    }

    // Bulk-Cases die noch nicht als Individual-Key vorlagen
    for (const [caseId, raw] of bulkById) {
      if (migratedIds.has(caseId)) continue
      await upsertCase(raw, tenantUuid)
    }

    const total = migratedIds.size + [...bulkById.keys()].filter(id => !migratedIds.has(id)).length
    console.log(`  ok ${slug}: ${total} Cases`)
  }
}

async function upsertCase(raw: StoredCase, tenantUuid: string): Promise<void> {
  const createdAt = toTs(raw.createdAt ?? raw._createdAt)
  const updatedAt = toTs(raw.updatedAt ?? raw._updatedAt)

  await sql`
    INSERT INTO cases (
      id, tenant_id, aktenzeichen, mandant_name, description,
      status, case_status, mandatsart_id, frist_datum, frist_bezeichnung,
      mandant_email, behoerde, behoerde_plz,
      checklist_states, tasks, relevant_paragraphs,
      created_at, updated_at
    ) VALUES (
      ${raw.id},
      ${tenantUuid}::uuid,
      ${raw.aktenzeichen ?? ''},
      ${raw.mandantName ?? ''},
      ${raw.description ?? null},
      ${normalizeStatus(raw.status)},
      ${normalizeCaseStatus(raw.caseStatus)}::case_status,
      ${raw.mandatsartId ?? null},
      ${raw.fristDatum ?? null},
      ${raw.fristBezeichnung ?? null},
      ${raw.mandantEmail ?? null},
      ${raw.behoerde ?? null},
      ${raw.behoerdePLZ ?? null},
      ${JSON.stringify(raw.checklistStates ?? {})}::jsonb,
      ${JSON.stringify(raw.tasks ?? [])}::jsonb,
      ${JSON.stringify(raw.relevantParagraphs ?? [])}::jsonb,
      ${createdAt}::timestamptz,
      ${updatedAt}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      aktenzeichen        = EXCLUDED.aktenzeichen,
      mandant_name        = EXCLUDED.mandant_name,
      description         = EXCLUDED.description,
      status              = EXCLUDED.status,
      case_status         = EXCLUDED.case_status,
      mandatsart_id       = EXCLUDED.mandatsart_id,
      frist_datum         = EXCLUDED.frist_datum,
      frist_bezeichnung   = EXCLUDED.frist_bezeichnung,
      mandant_email       = EXCLUDED.mandant_email,
      behoerde            = EXCLUDED.behoerde,
      behoerde_plz        = EXCLUDED.behoerde_plz,
      checklist_states    = EXCLUDED.checklist_states,
      tasks               = EXCLUDED.tasks,
      relevant_paragraphs = EXCLUDED.relevant_paragraphs,
      updated_at          = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at >= cases.updated_at
  `
}

// ── 3. Case Documents ─────────────────────────────────────────────────────────
// Nur Metadaten — dataUrl bleibt in Redis (Vault). storage_ref zeigt zurück.

async function migrateCaseDocuments(slugToUuid: Map<string, string>): Promise<void> {
  console.log('\n[3/6] Case Documents...')
  let total = 0

  for (const [slug, tenantUuid] of slugToUuid) {
    for await (const key of scanKeys(`proEntity:${slug}:cases:*`)) {
      const raw = await redis.get<StoredCase>(key)
      if (!raw?.documents?.length) continue
      for (const doc of raw.documents) {
        await upsertDocument(doc, raw.id, tenantUuid)
        total++
      }
    }
    const bulkData = await redis.get<{ items?: StoredCase[] }>(`proEntity:${slug}:cases`)
    if (bulkData?.items) {
      for (const c of bulkData.items) {
        if (!c?.documents?.length) continue
        for (const doc of c.documents) {
          await upsertDocument(doc, c.id, tenantUuid)
          total++
        }
      }
    }
  }

  console.log(`  ok ${total} Dokumente`)
}

async function upsertDocument(doc: StoredDocument, caseId: string, tenantUuid: string): Promise<void> {
  // dataUrl bleibt in Redis — wird nie nach Postgres geschrieben.
  // storage_ref verweist auf Redis-Key oder Blob-URL.
  const storageRef = doc.serverDocumentId
    ?? (doc.storageMode === 'server_vault' ? `proDoc:${doc.id}` : null)
  const storageProvider = storageRef ? 'upstash_redis' : null

  await sql`
    INSERT INTO case_documents (
      id, case_id, tenant_id, original_name, internal_name,
      mime_type, size_bytes, uploaded_at, uploaded_by,
      kind, checklist_item_id, photo_slot_id,
      storage_provider, storage_ref, checksum_sha256,
      ocr_text, translated_text_de, translation_reviewed
    ) VALUES (
      ${doc.id},
      ${caseId},
      ${tenantUuid}::uuid,
      ${doc.originalName ?? ''},
      ${doc.internalName ?? null},
      ${doc.mimeType ?? null},
      ${doc.sizeBytes ?? null},
      ${toTs(doc.uploadedAt)}::timestamptz,
      ${doc.uploadedBy ?? null},
      ${doc.kind ?? 'standard'},
      ${doc.checklistItemId ?? null},
      ${doc.photoSlotId ?? null},
      ${storageProvider}::storage_provider_type,
      ${storageRef},
      ${doc.checksumSha256 ?? null},
      ${doc.ocrText ?? null},
      ${doc.translatedTextDe ?? null},
      ${doc.translationReviewed ?? false}
    )
    ON CONFLICT (id) DO NOTHING
  `
}

// ── 4. Case Research ─────────────────────────────────────────────────────────

async function migrateCaseResearch(slugToUuid: Map<string, string>): Promise<void> {
  console.log('\n[4/6] Case Research...')
  let total = 0

  for (const [slug, tenantUuid] of slugToUuid) {
    for await (const key of scanKeys(`proEntity:${slug}:research:*`)) {
      const raw = await redis.get<StoredResearch>(key)
      if (!raw?.id) continue
      await upsertResearch(raw, tenantUuid)
      total++
    }
    const bulk = await redis.get<{ items?: StoredResearch[] }>(`proEntity:${slug}:research`)
    if (bulk?.items) {
      for (const raw of bulk.items) {
        if (!raw?.id) continue
        await upsertResearch(raw, tenantUuid)
        total++
      }
    }
  }

  console.log(`  ok ${total} Research-Einträge`)
}

async function upsertResearch(raw: StoredResearch, tenantUuid: string): Promise<void> {
  await sql`
    INSERT INTO case_research (
      id, case_id, tenant_id, question, answer,
      citations, reviewed, approved_answer, created_at
    ) VALUES (
      ${raw.id},
      ${raw.caseId ?? null},
      ${tenantUuid}::uuid,
      ${raw.question ?? ''},
      ${raw.answer ?? ''},
      ${JSON.stringify(raw.citations ?? [])}::jsonb,
      ${raw.reviewed ?? false},
      ${raw.approvedAnswer ?? null},
      ${toTs(raw.createdAt)}::timestamptz
    )
    ON CONFLICT (id) DO NOTHING
  `
}

// ── 5. Case Letters ───────────────────────────────────────────────────────────

async function migrateCaseLetters(slugToUuid: Map<string, string>): Promise<void> {
  console.log('\n[5/6] Case Letters...')
  let total = 0

  for (const [slug, tenantUuid] of slugToUuid) {
    for await (const key of scanKeys(`proEntity:${slug}:letters:*`)) {
      const raw = await redis.get<StoredLetter>(key)
      if (!raw?.id) continue
      await upsertLetter(raw, tenantUuid)
      total++
    }
    const bulk = await redis.get<{ items?: StoredLetter[] }>(`proEntity:${slug}:letters`)
    if (bulk?.items) {
      for (const raw of bulk.items) {
        if (!raw?.id) continue
        await upsertLetter(raw, tenantUuid)
        total++
      }
    }
  }

  console.log(`  ok ${total} Briefe`)
}

async function upsertLetter(raw: StoredLetter, tenantUuid: string): Promise<void> {
  const allowedStatus = new Set(['draft', 'finalized', 'sent'])
  const letterStatus = raw.letterStatus && allowedStatus.has(raw.letterStatus)
    ? raw.letterStatus
    : 'draft'

  await sql`
    INSERT INTO case_letters (
      id, case_id, tenant_id, template_id, template_title,
      fields, body, letter_status, created_at
    ) VALUES (
      ${raw.id},
      ${raw.caseId ?? null},
      ${tenantUuid}::uuid,
      ${raw.templateId ?? ''},
      ${raw.templateTitle ?? ''},
      ${JSON.stringify(raw.fields ?? {})}::jsonb,
      ${raw.body ?? ''},
      ${letterStatus}::letter_status,
      ${toTs(raw.createdAt)}::timestamptz
    )
    ON CONFLICT (id) DO NOTHING
  `
}

// ── 6. Mandant Invitations ────────────────────────────────────────────────────

async function migrateMandantInvitations(slugToUuid: Map<string, string>): Promise<void> {
  console.log('\n[6/6] Mandant Invitations...')
  let total = 0

  for await (const key of scanKeys('mandantInvite:*')) {
    const token = key.slice('mandantInvite:'.length)
    if (!token) continue

    const raw = await redis.get<StoredMandantInvite>(key)
    if (!raw?.tenantId || !raw?.caseId) continue

    const tenantUuid = slugToUuid.get(raw.tenantId)
    if (!tenantUuid) {
      console.warn(`  ! Tenant "${raw.tenantId}" unbekannt — Invite übersprungen`)
      continue
    }

    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(raw.expiresAt * 1000).toISOString()

    await sql`
      INSERT INTO mandant_invitations (
        tenant_id, case_id, token_hash, lang,
        created_by, created_at, expires_at
      ) VALUES (
        ${tenantUuid}::uuid,
        ${raw.caseId},
        ${tokenHash},
        ${raw.lang ?? 'de'},
        ${raw.createdBy ?? 'migration'},
        ${toTs(raw.createdAt)}::timestamptz,
        ${expiresAt}::timestamptz
      )
      ON CONFLICT (token_hash) DO NOTHING
    `
    total++
  }

  console.log(`  ok ${total} Invitations`)
}

// ── Haupt-Entry-Point ─────────────────────────────────────────────────────────

async function main() {
  console.log('GitLaw Pro — Redis -> Postgres Migration')
  console.log('=========================================')
  console.log(`Ziel: ${dbUrl!.replace(/:[^@]+@/, ':***@')}`)

  try {
    const slugToUuid = await migrateTenants()
    await migrateCases(slugToUuid)
    await migrateCaseDocuments(slugToUuid)
    await migrateCaseResearch(slugToUuid)
    await migrateCaseLetters(slugToUuid)
    await migrateMandantInvitations(slugToUuid)

    console.log('\nMigration abgeschlossen.')
    console.log('Prüfen: psql "$DATABASE_URL" -c "SELECT count(*) FROM cases;"')
  } catch (err) {
    console.error('\nMigration fehlgeschlagen:', err)
    process.exit(1)
  }
}

main()
