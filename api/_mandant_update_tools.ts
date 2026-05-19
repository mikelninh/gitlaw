/**
 * Tools for the GitLaw Pro Mandant-Update-Agent.
 *
 * Use case: a Refa today spends ~4h/Woche writing Sachstand-Updates to 20-50
 * active Mandanten in their language (DE/VI/TR/AR/EN) about what changed in
 * their case since the last update. With this agent: 15 min weekly review by
 * Anwält:in clicking "alle senden".
 *
 * The agent walks aktive cases per tenant, diffs document/status changes
 * since the last update, drafts a warm respektvoll Sachstand-Email in the
 * Mandant's language with LINKS to the mandanten-portal (no blob attachments).
 *
 * All tools are read-only or LLM-drafting. Drafts only — never auto-sends.
 */

import * as crypto from 'node:crypto'
import { getSql } from './_db'
import { chatJSON } from './_llm'
import { logger } from './_log'
import type { ToolDef } from './_agent'
import { z } from 'zod'

export const MANDANT_LANGUAGES = ['de', 'vi', 'tr', 'ar', 'en'] as const
export type MandantLanguage = (typeof MANDANT_LANGUAGES)[number]

// ── Tool 1: list_active_cases ───────────────────────────────────────────

async function listActiveCases(args: {
  tenant_id: string
  since_iso?: string | null
  limit?: number
}) {
  if (!args.tenant_id) {
    return { error: 'tenant_id is required' }
  }
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)
  try {
    const sql = getSql()
    const rows = (await sql`
      SELECT id, aktenzeichen, mandant_name, mandant_email, case_status,
             behoerde, frist_datum, updated_at
        FROM cases
       WHERE tenant_id = ${args.tenant_id}::uuid
         AND deleted_at IS NULL
         AND status = 'aktiv'
       ORDER BY updated_at DESC
       LIMIT ${limit}
    `) as Array<Record<string, unknown>>
    return { cases: rows, count: rows.length }
  } catch (e) {
    logger.warn({ msg: 'list_active_cases failed', err: String(e) })
    return { error: String(e), cases: [], count: 0 }
  }
}

// ── Tool 2: extract_case_changes ─────────────────────────────────────────

async function extractCaseChanges(args: {
  tenant_id: string
  case_id: string
  since_iso: string
}) {
  if (!args.case_id || !args.since_iso) {
    return { error: 'case_id and since_iso required' }
  }
  try {
    const sql = getSql()
    const docs = (await sql`
      SELECT id, original_name, uploaded_at, kind, checklist_item_id
        FROM case_documents
       WHERE case_id = ${args.case_id}
         AND tenant_id = ${args.tenant_id}::uuid
         AND deleted_at IS NULL
         AND uploaded_at > ${args.since_iso}::timestamptz
       ORDER BY uploaded_at DESC
       LIMIT 25
    `) as Array<Record<string, unknown>>

    const caseRow = (await sql`
      SELECT case_status, updated_at, frist_datum, frist_bezeichnung
        FROM cases
       WHERE id = ${args.case_id}
         AND tenant_id = ${args.tenant_id}::uuid
       LIMIT 1
    `) as Array<Record<string, unknown>>

    const statusChanged = caseRow.length > 0 &&
      caseRow[0].updated_at != null &&
      new Date(caseRow[0].updated_at as string).getTime() >
        new Date(args.since_iso).getTime()

    const meaningful = docs.length > 0 || statusChanged

    return {
      new_documents: docs.map((d) => ({
        id: d.id as string,
        name: d.original_name as string,
        uploaded_at: d.uploaded_at as string,
        kind: d.kind as string,
      })),
      status_changed: statusChanged,
      current_status: caseRow[0]?.case_status as string ?? null,
      frist_datum: caseRow[0]?.frist_datum as string ?? null,
      frist_bezeichnung: caseRow[0]?.frist_bezeichnung as string ?? null,
      meaningful_change: meaningful,
    }
  } catch (e) {
    logger.warn({ msg: 'extract_case_changes failed', err: String(e) })
    return { error: String(e), meaningful_change: false }
  }
}

// ── Tool 3: detect_mandant_language ──────────────────────────────────────

const VI_NAME_HINTS = /\b(nguy|tran|trần|le|lê|pham|phạm|hoang|hoàng|vu|vũ|dang|đặng|bui|bùi|do|đỗ|ho|hồ|ngo|ngô|duong|dương|ly|lý|phan|võ|vo|huynh|huỳnh|trinh|trịnh)\b/i
const TR_NAME_HINTS = /\b(yilmaz|yılmaz|kaya|demir|şahin|sahin|celik|çelik|yıldız|yildiz|öztürk|ozturk|aydın|aydin|özdemir|ozdemir|arslan|doğan|dogan)\b/i
const AR_NAME_HINTS = /\b(mohammed|ahmed|ali|hassan|hussein|mahmoud|abdul|fatima|khalid|omar|youssef|yusuf|ibrahim|amin|saleh)\b/i

async function detectMandantLanguage(args: {
  mandant_email?: string | null
  mandant_name?: string | null
  case_data?: Record<string, unknown> | null
}): Promise<{ language: MandantLanguage; reasoning: string }> {
  const name = (args.mandant_name ?? '').toString()
  const email = (args.mandant_email ?? '').toString().toLowerCase()

  if (VI_NAME_HINTS.test(name)) {
    return { language: 'vi', reasoning: 'Vietnamesischer Name erkannt.' }
  }
  if (TR_NAME_HINTS.test(name)) {
    return { language: 'tr', reasoning: 'Türkischer Name erkannt.' }
  }
  if (AR_NAME_HINTS.test(name)) {
    return { language: 'ar', reasoning: 'Arabischer Name erkannt.' }
  }
  if (email.endsWith('.com') && !email.endsWith('.de')) {
    // weak signal; keep DE fallback
  }
  return { language: 'de', reasoning: 'Fallback DE — keine eindeutige Sprach-Heuristik.' }
}

// ── Tool 4: draft_sachstand_email ────────────────────────────────────────

const DraftSachstandSchema = z.object({
  subject: z.string(),
  body: z.string(),
  language: z.enum(MANDANT_LANGUAGES),
})

const STATUS_LABEL_DE: Record<string, string> = {
  unterlagen_fehlen: 'Unterlagen werden zusammengetragen',
  unterlagen_in_pruefung: 'Unterlagen in Prüfung',
  antrag_in_vorbereitung: 'Antrag in Vorbereitung',
  antrag_eingereicht: 'Antrag bei der Behörde eingereicht',
  behoerdliche_rueckmeldung_ausstehend: 'Wir warten auf die Behörde',
  behoerde_nachforderung: 'Behörde fragt zusätzliche Unterlagen an',
  termin_steht_aus: 'Ein Termin steht an',
  verfahren_abgeschlossen: 'Verfahren ist abgeschlossen',
}

async function draftSachstandEmail(args: {
  mandant_name: string
  language: MandantLanguage
  case_aktenzeichen: string
  current_status: string | null
  new_documents: Array<{ id: string; name: string }>
  status_changed: boolean
  frist_datum: string | null
  frist_bezeichnung: string | null
  portal_base_url?: string
  kanzlei_name?: string
}) {
  const langLabel = {
    de: 'Deutsch',
    vi: 'Vietnamesisch',
    tr: 'Türkisch',
    ar: 'Arabisch',
    en: 'Englisch',
  }[args.language]

  const portalBase = args.portal_base_url ?? 'https://pro.gitlaw.de/mandant'
  const docLinks =
    args.new_documents.length > 0
      ? args.new_documents
          .map(
            (d) =>
              `- ${d.name}: ${portalBase}/${args.case_aktenzeichen}/dokumente/${d.id}`,
          )
          .join('\n')
      : '(keine neuen Dokumente in dieser Woche)'

  const statusDe = args.current_status
    ? STATUS_LABEL_DE[args.current_status] ?? args.current_status
    : 'unbekannt'

  const fristLine = args.frist_datum
    ? `Nächste Frist: ${args.frist_datum}${args.frist_bezeichnung ? ' (' + args.frist_bezeichnung + ')' : ''}`
    : 'Aktuell keine offene Frist eingetragen.'

  const system = `Du draftst eine kurze Sachstand-Email an die Mandant:in einer
deutschen Migrationskanzlei. Antwort als JSON-Objekt {subject, body, language}.

STIL — respektvoll-warm
- Sprache: ${langLabel} (language="${args.language}")
- Anrede mit Namen ("Liebe/r [Vorname], hier ist ein kurzer Stand zu Ihrer Sache").
- Kurz, klar, human — NICHT corporate, NICHT "Sehr geehrte/r" formal.
- Maximal 8 Sätze im Body.
- Klare Aufzählung: was hat sich getan, wo steht das Verfahren, was kommt als nächstes.
- Bei neuen Dokumenten: LINKS zum Mandanten-Portal nennen, NICHT als Attachments.
- Bei Frist: Datum klar nennen, ohne Panik-Sprache.
- Ende: "Bei Fragen einfach antworten" + Kanzlei-Name.
- KEINE juristischen Empfehlungen — nur Sachstand.

INHALT
Mandant: ${args.mandant_name}
Aktenzeichen: ${args.case_aktenzeichen}
Aktueller Stand (intern, übersetze sinnvoll): ${statusDe}
Status hat sich geändert: ${args.status_changed ? 'ja' : 'nein'}
Neue Dokumente seit letztem Update:
${docLinks}
${fristLine}
Kanzlei: ${args.kanzlei_name ?? 'Ihre Kanzlei'}

Gib die Email in ${langLabel} aus — Subject + Body im JSON. Halte den Ton menschlich.`

  try {
    const { data } = await chatJSON(DraftSachstandSchema, [
      { role: 'system', content: system },
      { role: 'user', content: `Bitte draftet die Sachstand-Email in ${langLabel}.` },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_sachstand_email failed', err: String(e) })
    return {
      subject: '',
      body: '',
      language: args.language,
      error: String(e),
    }
  }
}

// ── Tool registry export ─────────────────────────────────────────────────

export function buildMandantUpdateTools(opts: {
  tenant_id: string
  since_iso: string
  portal_base_url?: string
  kanzlei_name?: string
}): ToolDef[] {
  return [
    {
      name: 'list_active_cases',
      description:
        'Liste alle aktiven Akten dieser Kanzlei (status=aktiv, deleted_at IS NULL) sortiert nach letzter Änderung. Erster Schritt.',
      schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max Akten (Default 50, Cap 100).' },
        },
        additionalProperties: false,
      },
      handler: (a) =>
        listActiveCases({
          tenant_id: opts.tenant_id,
          since_iso: opts.since_iso,
          limit: (a as { limit?: number }).limit,
        }),
    },
    {
      name: 'extract_case_changes',
      description:
        'Diff einer Akte seit dem letzten Update: welche Dokumente sind neu hochgeladen, hat sich der Status geändert. Gibt meaningful_change=false zurück wenn nichts passiert ist (dann KEIN draft_sachstand_email aufrufen).',
      schema: {
        type: 'object',
        properties: {
          case_id: { type: 'string' },
        },
        required: ['case_id'],
        additionalProperties: false,
      },
      handler: (a) =>
        extractCaseChanges({
          tenant_id: opts.tenant_id,
          case_id: (a as { case_id: string }).case_id,
          since_iso: opts.since_iso,
        }),
    },
    {
      name: 'detect_mandant_language',
      description:
        'Heuristik: erkenne die Sprache der Mandant:in aus Name (VI/TR/AR-Namens-Pattern) und Email. Fallback "de". IMMER vor draft_sachstand_email aufrufen.',
      schema: {
        type: 'object',
        properties: {
          mandant_email: { type: 'string', nullable: true },
          mandant_name: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
      handler: (a) =>
        detectMandantLanguage(
          a as { mandant_email?: string | null; mandant_name?: string | null },
        ),
    },
    {
      name: 'draft_sachstand_email',
      description:
        'Draftet eine kurze Sachstand-Email in der Mandant-Sprache, mit Links (nicht Attachments) auf neue Dokumente im Mandanten-Portal. NUR aufrufen wenn extract_case_changes.meaningful_change=true.',
      schema: {
        type: 'object',
        properties: {
          mandant_name: { type: 'string' },
          language: { type: 'string', enum: ['de', 'vi', 'tr', 'ar', 'en'] },
          case_aktenzeichen: { type: 'string' },
          current_status: { type: 'string', nullable: true },
          new_documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['id', 'name'],
              additionalProperties: false,
            },
          },
          status_changed: { type: 'boolean' },
          frist_datum: { type: 'string', nullable: true },
          frist_bezeichnung: { type: 'string', nullable: true },
        },
        required: [
          'mandant_name',
          'language',
          'case_aktenzeichen',
          'new_documents',
          'status_changed',
        ],
        additionalProperties: false,
      },
      handler: (a) =>
        draftSachstandEmail({
          ...(a as Parameters<typeof draftSachstandEmail>[0]),
          portal_base_url: opts.portal_base_url,
          kanzlei_name: opts.kanzlei_name,
        }),
    },
  ]
}

export const _internals = {
  listActiveCases,
  extractCaseChanges,
  detectMandantLanguage,
  draftSachstandEmail,
}

export const _modulePresenceTag = crypto
  .createHash('sha1')
  .update('mandant-update-tools-v1')
  .digest('hex')
  .slice(0, 8)
