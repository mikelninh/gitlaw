/**
 * Tools for the GitLaw Pro Behörden-Korrespondenz-Agent.
 *
 * Use case: a migration-law firm receives 30+ Briefe per day from LEA / BAMF /
 * Verwaltungsgerichten. Each one means a chain of work — match against the
 * right Akte, classify what's being asked, list required documents, draft a
 * Mandant-notification in the right language, draft a response letter, set
 * a new Frist. Today this is 5-10 minutes of paralegal work per letter.
 * With the agent: 30 seconds of pre-work, then a 2-minute Anwält:in review.
 *
 * All tools are read-only or LLM-drafting. No DB writes happen here — the
 * agent only PROPOSES updates. The endpoint that invokes the agent decides
 * whether to persist them after human review.
 */

import * as crypto from 'node:crypto'
import { getSql } from './_db'
import { chatJSON } from './_llm'
import { logger } from './_log'
import type { ToolDef } from './_agent'
import { z } from 'zod'

// ── Reference: 5 letter types that cover 95% of LEA/BAMF correspondence ─

export const LETTER_TYPES = [
  'nachforderung_dokumente',
  'anhoerung',
  'bescheid_positiv',
  'bescheid_negativ',
  'terminladung',
  'zwischennachricht',
  'sonstiges',
] as const

export type LetterType = (typeof LETTER_TYPES)[number]

const LETTER_TYPE_LABELS_DE: Record<LetterType, string> = {
  nachforderung_dokumente: 'Nachforderung von Unterlagen',
  anhoerung: 'Anhörung (§ 28 VwVfG)',
  bescheid_positiv: 'Bescheid (positiv)',
  bescheid_negativ: 'Bescheid (ablehnend)',
  terminladung: 'Termin-/Vorladung',
  zwischennachricht: 'Zwischennachricht / Verfahrensstand',
  sonstiges: 'Sonstiges',
}

// ── Tool 1: extract_aktenzeichen + sender ────────────────────────────────

const ExtractMetaSchema = z.object({
  aktenzeichen: z.union([z.string(), z.null()]),
  absender_behoerde: z.union([z.string(), z.null()]),
  betreff: z.union([z.string(), z.null()]),
  datum_brief: z.union([z.string(), z.null()]),
  mandant_name_erwaehnt: z.union([z.string(), z.null()]),
})

async function extractMeta(args: { letter_text: string }) {
  const system = `Du extrahierst Meta-Daten aus einem Behörden-Brief (LEA, BAMF,
Verwaltungsgericht, BAföG-Amt). Antwort als JSON-Objekt mit den Feldern
{aktenzeichen, absender_behoerde, betreff, datum_brief, mandant_name_erwaehnt}.

REGELN
- aktenzeichen: das Aktenzeichen der absendenden Behörde (z.B. "AZ 234.5/24" oder
  "ABH-12345-2025"). Wenn nicht eindeutig → null.
- absender_behoerde: Name der Behörde (z.B. "Landesamt für Einwanderung Berlin").
- betreff: 1-zeiliger Betreff aus dem Brief.
- datum_brief: das Datum AUF DEM BRIEF im ISO-Format YYYY-MM-DD. Nicht das heutige Datum.
- mandant_name_erwaehnt: der NAME der Mandant:in auf den der Brief sich bezieht.
- Erfinde NICHTS — bei fehlender Info → null.`

  try {
    const { data } = await chatJSON(ExtractMetaSchema, [
      { role: 'system', content: system },
      { role: 'user', content: args.letter_text.slice(0, 8000) },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'extract_meta failed', err: String(e) })
    return {
      aktenzeichen: null,
      absender_behoerde: null,
      betreff: null,
      datum_brief: null,
      mandant_name_erwaehnt: null,
      error: String(e),
    }
  }
}

// ── Tool 2: find_matching_case ───────────────────────────────────────────

async function findMatchingCase(args: {
  tenant_id: string
  aktenzeichen?: string | null
  mandant_name?: string | null
}) {
  if (!args.tenant_id) {
    return { error: 'tenant_id is required to scope case search' }
  }
  try {
    const sql = getSql()
    // 1. Exakter Aktenzeichen-Match (häufigster Fall — Behörde verwendet
    //    ggf. dasselbe AZ, das die Kanzlei nutzt, oder umgekehrt)
    if (args.aktenzeichen) {
      const exact = (await sql`
        SELECT id, aktenzeichen, mandant_name, case_status, mandatsart_id, behoerde, frist_datum
          FROM cases
         WHERE tenant_id = ${args.tenant_id}::uuid
           AND deleted_at IS NULL
           AND aktenzeichen = ${args.aktenzeichen}
         LIMIT 1
      `) as Array<Record<string, unknown>>
      if (exact.length > 0) {
        return { matched: 'exact_aktenzeichen', case: exact[0] }
      }
    }

    // 2. Mandant-Name fuzzy. ILIKE %name% covers small spelling variants
    //    from OCR ("Nguyen Tran" → "Nguyễn Trần" etc.); for production a
    //    proper Levenshtein/trigram match would help but is overkill at MVP.
    if (args.mandant_name) {
      const cleaned = args.mandant_name.trim().split(/\s+/).slice(0, 3).join(' ')
      const byName = (await sql`
        SELECT id, aktenzeichen, mandant_name, case_status, mandatsart_id, behoerde, frist_datum
          FROM cases
         WHERE tenant_id = ${args.tenant_id}::uuid
           AND deleted_at IS NULL
           AND mandant_name ILIKE ${'%' + cleaned + '%'}
         ORDER BY updated_at DESC
         LIMIT 5
      `) as Array<Record<string, unknown>>
      if (byName.length === 1) {
        return { matched: 'unique_name', case: byName[0] }
      }
      if (byName.length > 1) {
        return {
          matched: 'ambiguous_name',
          candidates: byName,
          hint: 'Mehrere Akten passen — Anwält:in muss manuell wählen.',
        }
      }
    }

    return {
      matched: 'none',
      hint: 'Keine Akte mit diesem Aktenzeichen oder Namen gefunden. Eventuell neu anzulegen.',
    }
  } catch (e) {
    logger.warn({ msg: 'find_matching_case failed', err: String(e) })
    return { error: String(e) }
  }
}

// ── Tool 3: classify_letter_type ─────────────────────────────────────────

const ClassifyTypeSchema = z.object({
  letter_type: z.enum(LETTER_TYPES),
  reasoning_de: z.string(),
  urgency: z.enum(['niedrig', 'mittel', 'hoch']),
})

async function classifyLetterType(args: { letter_text: string }) {
  const types = LETTER_TYPES.map(
    (t) => `- ${t}: ${LETTER_TYPE_LABELS_DE[t]}`,
  ).join('\n')

  const system = `Du klassifizierst einen Behörden-Brief in der ausländerrechtlichen
Praxis (LEA, BAMF, Verwaltungsgericht). Antwort als JSON-Objekt
{letter_type, reasoning_de, urgency}.

TYPEN:
${types}

URGENCY
- hoch: Frist ≤ 14 Tage, Anhörung, Termin, ablehnender Bescheid
- mittel: Standard-Nachforderung, Zwischenstand
- niedrig: rein informative Schreiben

REGELN
- Genau EINEN Typ wählen, der das Hauptanliegen des Briefs erfasst.
- reasoning_de: 1 Satz, woran du es erkennst (Zitat aus Brief okay).`

  try {
    const { data } = await chatJSON(ClassifyTypeSchema, [
      { role: 'system', content: system },
      { role: 'user', content: args.letter_text.slice(0, 8000) },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'classify_letter_type failed', err: String(e) })
    return {
      letter_type: 'sonstiges' as LetterType,
      reasoning_de: 'Klassifikation fehlgeschlagen — manuell prüfen.',
      urgency: 'mittel' as const,
      error: String(e),
    }
  }
}

// ── Tool 4: extract_demanded_documents ───────────────────────────────────

const ExtractDocsSchema = z.object({
  required_documents: z.array(
    z.object({
      name_de: z.string(),
      reason: z.string().nullable().optional(),
    }),
  ),
  notes: z.string().nullable().optional(),
})

async function extractDemandedDocuments(args: { letter_text: string }) {
  const system = `Du extrahierst aus einem Behörden-Brief alle Dokumente, die die
Behörde von der Mandant:in einfordert. Antwort als JSON-Objekt mit
{required_documents: [{name_de, reason}], notes}.

REGELN
- Jedes geforderte Dokument einzeln auflisten (z.B. "Reisepass", "Geburtsurkunde",
  "Verdienstbescheinigung der letzten 6 Monate").
- reason: warum dieses Dokument gefordert wird (wenn der Brief das sagt) — sonst null.
- notes: Hinweise zur Form (Original, beglaubigte Übersetzung, etc.).
- Wenn KEINE Dokumente gefordert werden (z.B. bei reinem Bescheid):
  required_documents = [], notes = null.
- Erfinde NICHTS — nur was explizit im Brief gefordert wird.`

  try {
    const { data } = await chatJSON(ExtractDocsSchema, [
      { role: 'system', content: system },
      { role: 'user', content: args.letter_text.slice(0, 8000) },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'extract_demanded_documents failed', err: String(e) })
    return {
      required_documents: [],
      notes: null,
      error: String(e),
    }
  }
}

// ── Tool 5: extract_behoerden_frist ──────────────────────────────────────

const ExtractFristSchema = z.object({
  deadline_iso: z.string().nullable(),
  raw_text: z.string().nullable(),
  type: z.enum(['behoerden_frist', 'anhoerungs_frist', 'klage_frist', 'sonstige', 'keine']),
  notes: z.string().nullable().optional(),
})

async function extractBehoerdenFrist(args: { letter_text: string }) {
  const system = `Du findest die FRIST in einem Behörden-Brief, die die Mandant:in
einhalten muss. Antwort als JSON {deadline_iso, raw_text, type, notes}.

REGELN
- deadline_iso: ISO-Datum YYYY-MM-DD wenn explizit im Brief genannt, sonst null.
- raw_text: das wörtliche Zitat aus dem Brief ("bis spätestens 15. Juni 2026",
  "innerhalb von 4 Wochen"), oder null.
- type: behoerden_frist (Nachforderung/Anhörung), klage_frist (Bescheid → Widerspruch/Klage),
  sonstige, oder keine wenn nicht erkennbar.
- KEINE Frist erfinden. Bei "innerhalb von 4 Wochen" ohne klares Startdatum:
  deadline_iso = null, raw_text einfügen, in notes das Problem erklären.`

  try {
    const { data } = await chatJSON(ExtractFristSchema, [
      { role: 'system', content: system },
      { role: 'user', content: args.letter_text.slice(0, 8000) },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'extract_behoerden_frist failed', err: String(e) })
    return {
      deadline_iso: null,
      raw_text: null,
      type: 'keine' as const,
      notes: null,
      error: String(e),
    }
  }
}

// ── Tool 6: draft_mandant_notification ───────────────────────────────────

const DraftMandantSchema = z.object({
  subject: z.string(),
  body: z.string(),
  language: z.enum(['de', 'vi', 'tr', 'ar', 'en']),
})

async function draftMandantNotification(args: {
  mandant_name: string
  language: 'de' | 'vi' | 'tr' | 'ar' | 'en'
  letter_type: LetterType
  required_documents: Array<{ name_de: string }>
  frist_text: string | null
  kanzlei_name?: string
}) {
  const langLabel = {
    de: 'Deutsch',
    vi: 'Vietnamesisch',
    tr: 'Türkisch',
    ar: 'Arabisch',
    en: 'Englisch',
  }[args.language]

  const docsList =
    args.required_documents.length > 0
      ? args.required_documents.map((d) => `- ${d.name_de}`).join('\n')
      : '(keine spezifischen Dokumente angefordert)'

  const system = `Du draftst eine Email an die Mandant:in einer Migrationskanzlei.
Antwort als JSON-Objekt {subject, body, language}.

STIL
- Sprache: ${langLabel} (language="${args.language}")
- Warm, klar, kurz — die Mandant:in ist möglicherweise gestresst und
  hat keinen juristischen Hintergrund.
- KEINE juristischen Fachbegriffe in der Mandant-Sprache erklären.
- Direkte Anrede mit dem Namen.
- Ende mit "Bei Fragen einfach antworten" + Kanzlei-Name.
- NIE eine konkrete rechtliche Empfehlung — nur Aufforderung Unterlagen zu
  schicken oder zum Termin zu erscheinen.

INHALT
Brief-Typ: ${args.letter_type}
Mandant: ${args.mandant_name}
Erforderliche Dokumente:
${docsList}
Frist: ${args.frist_text ?? 'keine konkrete Frist im Brief'}
Kanzlei: ${args.kanzlei_name ?? 'Ihre Kanzlei'}`

  try {
    const { data } = await chatJSON(DraftMandantSchema, [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Schreibe die Email in ${langLabel}.`,
      },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_mandant_notification failed', err: String(e) })
    return {
      subject: '',
      body: '',
      language: args.language,
      error: String(e),
    }
  }
}

// ── Tool 7: draft_anwalt_response ────────────────────────────────────────

const DraftResponseSchema = z.object({
  subject: z.string(),
  body: z.string(),
  remaining_placeholders: z.array(z.string()).optional().default([]),
})

async function draftAnwaltResponse(args: {
  letter_text: string
  letter_type: LetterType
  aktenzeichen: string | null
  behoerde: string | null
  kanzlei_name?: string
  mandant_name: string
}) {
  const system = `Du draftst ein professionelles Anwalts-Antwortschreiben an eine
deutsche Behörde (LEA/BAMF/VG). Antwort als JSON {subject, body, remaining_placeholders}.

STIL
- Förmlich, präzise, knapp.
- Aktenzeichen + Bezugnahme auf das eingegangene Schreiben oben.
- KEINE Empfehlungen — nur Sachstand + nächste Schritte ankündigen.
- Bei Nachforderungen: bestätigen + Frist nennen wann Unterlagen kommen.
- Bei Anhörung: Stellungnahme ankündigen.
- Bei Bescheid: kurz reagieren + Widerspruchsfrist im Auge behalten.
- [PLATZHALTER] für unklare Daten stehen lassen + in remaining_placeholders auflisten.
- NIE erfinden — lieber Platzhalter.

INPUT
Aktenzeichen Behörde: ${args.aktenzeichen ?? 'unbekannt'}
Behörde: ${args.behoerde ?? 'unbekannt'}
Brief-Typ: ${args.letter_type}
Mandant: ${args.mandant_name}
Kanzlei: ${args.kanzlei_name ?? '[KANZLEI-NAME]'}`

  try {
    const { data } = await chatJSON(DraftResponseSchema, [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Eingegangener Behörden-Brief:\n${args.letter_text.slice(0, 6000)}`,
      },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_anwalt_response failed', err: String(e) })
    return {
      subject: '',
      body: '',
      remaining_placeholders: [],
      error: String(e),
    }
  }
}

// ── Tool registry export ─────────────────────────────────────────────────

export function buildBehoerdenTools(opts: {
  tenant_id: string
  kanzlei_name?: string
}): ToolDef[] {
  return [
    {
      name: 'extract_meta',
      description:
        'Extrahiere aus dem Behörden-Brief: Aktenzeichen, Absender-Behörde, Betreff, Brief-Datum, erwähnter Mandant-Name. IMMER zuerst aufrufen.',
      schema: {
        type: 'object',
        properties: {
          letter_text: { type: 'string', description: 'Vollständiger OCR-Text des Briefs.' },
        },
        required: ['letter_text'],
        additionalProperties: false,
      },
      handler: (a) => extractMeta(a as { letter_text: string }),
    },
    {
      name: 'find_matching_case',
      description:
        'Suche in der Kanzlei-Akten-DB nach einem passenden Mandat. Versuche zuerst Aktenzeichen-Match, dann fuzzy Mandant-Name. Gibt zurück: exact_aktenzeichen | unique_name | ambiguous_name | none.',
      schema: {
        type: 'object',
        properties: {
          aktenzeichen: { type: 'string', nullable: true },
          mandant_name: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
      handler: (a) =>
        findMatchingCase({
          tenant_id: opts.tenant_id,
          aktenzeichen: (a as { aktenzeichen?: string }).aktenzeichen,
          mandant_name: (a as { mandant_name?: string }).mandant_name,
        }),
    },
    {
      name: 'classify_letter_type',
      description:
        'Klassifiziere den Brief in einen von 7 Typen (Nachforderung, Anhörung, Bescheid positiv/negativ, Termin, Zwischennachricht, Sonstiges) + Dringlichkeit.',
      schema: {
        type: 'object',
        properties: { letter_text: { type: 'string' } },
        required: ['letter_text'],
        additionalProperties: false,
      },
      handler: (a) => classifyLetterType(a as { letter_text: string }),
    },
    {
      name: 'extract_demanded_documents',
      description:
        'Liste alle Dokumente auf, die die Behörde im Brief von der Mandant:in einfordert. Bei Bescheiden ohne Doc-Anforderung: leere Liste.',
      schema: {
        type: 'object',
        properties: { letter_text: { type: 'string' } },
        required: ['letter_text'],
        additionalProperties: false,
      },
      handler: (a) => extractDemandedDocuments(a as { letter_text: string }),
    },
    {
      name: 'extract_behoerden_frist',
      description:
        'Finde die im Brief genannte Frist (Datum + Typ: behoerden_frist | anhoerungs_frist | klage_frist | keine).',
      schema: {
        type: 'object',
        properties: { letter_text: { type: 'string' } },
        required: ['letter_text'],
        additionalProperties: false,
      },
      handler: (a) => extractBehoerdenFrist(a as { letter_text: string }),
    },
    {
      name: 'draft_mandant_notification',
      description:
        'Draftet eine Email an die Mandant:in in deren Sprache. NUR aufrufen wenn letter_type Action der Mandant:in erfordert (Nachforderung, Anhörung, Termin).',
      schema: {
        type: 'object',
        properties: {
          mandant_name: { type: 'string' },
          language: { type: 'string', enum: ['de', 'vi', 'tr', 'ar', 'en'] },
          letter_type: { type: 'string' },
          required_documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name_de: { type: 'string' }, reason: { type: 'string', nullable: true } },
              required: ['name_de'],
              additionalProperties: false,
            },
          },
          frist_text: { type: 'string', nullable: true },
        },
        required: ['mandant_name', 'language', 'letter_type', 'required_documents'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftMandantNotification({
          ...(a as Parameters<typeof draftMandantNotification>[0]),
          kanzlei_name: opts.kanzlei_name,
        }),
    },
    {
      name: 'draft_anwalt_response',
      description:
        'Draftet ein professionelles Antwortschreiben an die Behörde — Bezugnahme + nächste Schritte. NIE inhaltliche Position einnehmen — nur Sachstands-Meldung.',
      schema: {
        type: 'object',
        properties: {
          letter_text: { type: 'string' },
          letter_type: { type: 'string' },
          aktenzeichen: { type: 'string', nullable: true },
          behoerde: { type: 'string', nullable: true },
          mandant_name: { type: 'string' },
        },
        required: ['letter_text', 'letter_type', 'mandant_name'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftAnwaltResponse({
          ...(a as Parameters<typeof draftAnwaltResponse>[0]),
          kanzlei_name: opts.kanzlei_name,
        }),
    },
  ]
}

// Export internals for unit testing.
export const _internals = {
  extractMeta,
  findMatchingCase,
  classifyLetterType,
  extractDemandedDocuments,
  extractBehoerdenFrist,
  draftMandantNotification,
  draftAnwaltResponse,
}

// Stable cache-buster tag.
export const _modulePresenceTag = crypto
  .createHash('sha1')
  .update('behoerden-tools-v1')
  .digest('hex')
  .slice(0, 8)
