/**
 * Tool implementations for the Lebenslagen-Assistent agent.
 *
 * Six tools, all pure TS — no Python/RAG sidecar, no FAISS at runtime.
 * The curated lookup data lives in `_lebenslagen_data.ts`; the GitLaw
 * citizen tier already proves that this narrow-but-deep approach beats
 * generic retrieval for the top-90% of bürger questions.
 *
 * detect_lebenslage + draft_letter are LLM-backed; the rest are pure
 * lookups + a date-math helper.
 */

import * as crypto from 'node:crypto'
import { chatJSON } from './_llm'
import { logger } from './_log'
import type { ToolDef } from './_agent'
import {
  LEBENSLAGEN,
  LETTER_TEMPLATES,
  PARAGRAPHS,
  type LebenslageId,
  type LetterTemplate,
} from './_lebenslagen_data'
import { z } from 'zod'

// ── Tool 1: detect_lebenslage ────────────────────────────────────────────

const DetectLebenslageSchema = z.object({
  lebenslage: z.enum([
    'mietrecht',
    'arbeitsrecht',
    'familienrecht',
    'verbraucherrecht',
    'sozialrecht',
    'verkehrsrecht',
    'strafrecht',
    'asyl_aufenthalt',
    'erbrecht',
    'datenschutz',
    'gesundheit',
    'sonstiges',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning_de: z.string(),
})

async function detectLebenslage(args: { description: string }) {
  const catalogue = LEBENSLAGEN.map(
    (l) => `- ${l.id}: ${l.label_de} (z.B. ${l.examples_de})`,
  ).join('\n')

  const system = `Du klassifizierst eine Bürger-Anfrage in eine Lebenslage.
Gib deine Antwort als JSON-Objekt mit Feldern {lebenslage, confidence, reasoning_de} zurück.

KATEGORIEN:
${catalogue}

REGELN
- Genau EINE Kategorie wählen.
- Wenn nichts klar passt → "sonstiges".
- confidence ehrlich angeben (0.0 = geraten, 1.0 = eindeutig).
- reasoning_de: 1 Satz, warum diese Lebenslage.`

  try {
    const { data } = await chatJSON(DetectLebenslageSchema, [
      { role: 'system', content: system },
      { role: 'user', content: args.description.slice(0, 4000) },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'detect_lebenslage failed', err: String(e) })
    return {
      lebenslage: 'sonstiges' as LebenslageId,
      confidence: 0,
      reasoning_de:
        'Klassifikation fehlgeschlagen — Fallback "sonstiges". Bitte prüfen.',
    }
  }
}

// ── Tool 2: search_relevant_paragraphs ───────────────────────────────────

/**
 * Filters the curated paragraph table by lebenslage. Optionally narrows by
 * keyword (substring match on title + short text). Returns the matched
 * entries with their full short-text — these are LLM-friendly grounding
 * for the agent's final summary.
 *
 * For the top-30 §§ this gives us ~90% recall on the kind of citizen
 * questions GitLaw sees. For long-tail (specialised tax / IP) the agent
 * should call lookup_paragraph_by_code directly if it knows the §.
 */
function searchRelevantParagraphs(args: {
  lebenslage: LebenslageId
  keyword?: string | null
}) {
  const all = Object.values(PARAGRAPHS).filter(
    (p) => p.category === args.lebenslage,
  )
  if (!args.keyword) {
    return {
      lebenslage: args.lebenslage,
      paragraphs: all.map((p) => ({
        ref: `${p.law} § ${p.section}`,
        law: p.law,
        section: p.section,
        title: p.title,
        short: p.short,
      })),
    }
  }
  const kw = args.keyword.toLowerCase()
  const matched = all.filter(
    (p) =>
      p.title.toLowerCase().includes(kw) ||
      p.short.toLowerCase().includes(kw) ||
      p.section.includes(kw),
  )
  return {
    lebenslage: args.lebenslage,
    keyword: args.keyword,
    paragraphs: matched.map((p) => ({
      ref: `${p.law} § ${p.section}`,
      law: p.law,
      section: p.section,
      title: p.title,
      short: p.short,
    })),
  }
}

// ── Tool 3: lookup_paragraph_by_code ─────────────────────────────────────

function lookupParagraphByCode(args: { law: string; section: string }) {
  // Tolerate "§ 573" or "573" or "573 Abs. 2" in section.
  const cleanedSection = (args.section || '')
    .replace(/§/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[\s,]/)[0] // first token, drop Absätze for lookup
  const cleanedLaw = (args.law || '').toUpperCase().replace(/\s+/g, '_')

  // Try direct lookup against the curated table.
  const direct = PARAGRAPHS[`${args.law}:${cleanedSection}`] ??
    PARAGRAPHS[`${cleanedLaw}:${cleanedSection}`]
  if (direct) {
    return {
      verified: true,
      ref: `${direct.law} § ${direct.section}`,
      law: direct.law,
      section: direct.section,
      title: direct.title,
      short: direct.short,
      source: 'curated_paragraph_table',
    }
  }
  return {
    verified: false,
    requested: { law: args.law, section: args.section },
    reason: 'not_in_curated_table',
    hint: 'Paragraph nicht in der kurzen kuratierten Tabelle. Für seltene §§ ist die Antwort möglicherweise unsicher — kennzeichne entsprechend.',
  }
}

// ── Tool 4: compute_frist ────────────────────────────────────────────────

/**
 * Parse a natural-language deadline expression OR a structured spec, and
 * return an ISO date + days-left from today.
 *
 * Accepts either:
 *   { days: 21, anchor_iso?: "2026-05-19" }                — preset
 *   { weeks: 3 }                                            — preset
 *   { months: 1 }                                           — preset
 *   { iso: "2026-06-15" }                                   — explicit date
 *   { text: "in 3 Wochen" }                                 — NL via LLM
 *
 * For NL parsing we use a tiny zod schema instead of a full LLM call when
 * the pattern is obvious (e.g. "in N Tagen|Wochen|Monaten|Jahren"). Only
 * unmatched expressions fall back to LLM, keeping cost ~ free.
 */
async function computeFrist(args: {
  days?: number
  weeks?: number
  months?: number
  years?: number
  iso?: string
  text?: string
  anchor_iso?: string
}) {
  const anchor = args.anchor_iso ? new Date(args.anchor_iso) : new Date()
  if (Number.isNaN(anchor.getTime())) {
    return { error: `unparseable anchor_iso: ${args.anchor_iso}` }
  }

  let deadline: Date | null = null
  let source: string

  if (args.iso) {
    deadline = new Date(args.iso)
    source = 'explicit_iso'
  } else if (
    args.days !== undefined ||
    args.weeks !== undefined ||
    args.months !== undefined ||
    args.years !== undefined
  ) {
    deadline = new Date(anchor)
    if (args.days) deadline.setDate(deadline.getDate() + args.days)
    if (args.weeks) deadline.setDate(deadline.getDate() + args.weeks * 7)
    if (args.months) deadline.setMonth(deadline.getMonth() + args.months)
    if (args.years) deadline.setFullYear(deadline.getFullYear() + args.years)
    source = 'structured_spec'
  } else if (args.text) {
    const parsed = parseGermanFristText(args.text)
    if (parsed) {
      deadline = new Date(anchor)
      if (parsed.days) deadline.setDate(deadline.getDate() + parsed.days)
      if (parsed.weeks) deadline.setDate(deadline.getDate() + parsed.weeks * 7)
      if (parsed.months) deadline.setMonth(deadline.getMonth() + parsed.months)
      if (parsed.years) deadline.setFullYear(deadline.getFullYear() + parsed.years)
      source = `regex_parsed: ${parsed.matched}`
    } else {
      // Last-resort LLM parse — keep response small + cheap.
      const llmParsed = await parseFristTextViaLLM(args.text)
      if (llmParsed) {
        deadline = new Date(anchor)
        deadline.setDate(deadline.getDate() + llmParsed.totalDays)
        source = `llm_parsed: "${args.text}" → ${llmParsed.totalDays} days`
      }
    }
  }

  if (!deadline || Number.isNaN(deadline.getTime())) {
    return {
      error: 'could not compute deadline from inputs',
      received: args,
    }
  }

  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeft = Math.round((deadline.getTime() - now.getTime()) / msPerDay)
  return {
    anchor_iso: anchor.toISOString().slice(0, 10),
    deadline_iso: deadline.toISOString().slice(0, 10),
    days_left: daysLeft,
    expired: daysLeft < 0,
    urgent: daysLeft >= 0 && daysLeft < 7,
    source,
  }
}

function parseGermanFristText(text: string): {
  days?: number
  weeks?: number
  months?: number
  years?: number
  matched: string
} | null {
  // "in 3 Wochen", "in 14 Tagen", "in 2 Monaten", "in 1 Jahr"
  const m = text.match(
    /in\s+(\d+)\s*(tag|tagen|woche|wochen|monat|monaten|jahr|jahren)/i,
  )
  if (m) {
    const n = parseInt(m[1], 10)
    const unit = m[2].toLowerCase()
    if (unit.startsWith('tag')) return { days: n, matched: m[0] }
    if (unit.startsWith('woche')) return { weeks: n, matched: m[0] }
    if (unit.startsWith('monat')) return { months: n, matched: m[0] }
    if (unit.startsWith('jahr')) return { years: n, matched: m[0] }
  }
  // "bis 15.06.2026" or "bis zum 15.6.2026"
  const d = text.match(/bis(?:\s+zum)?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (d) {
    const [, day, mo, yr] = d
    const iso = `${yr}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`
    const target = new Date(iso)
    if (!Number.isNaN(target.getTime())) {
      const days = Math.round(
        (target.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
      return { days, matched: d[0] }
    }
  }
  return null
}

async function parseFristTextViaLLM(
  text: string,
): Promise<{ totalDays: number } | null> {
  try {
    const schema = z.object({
      total_days_from_today: z.number().int(),
      reasoning: z.string(),
    })
    const { data } = await chatJSON(schema, [
      {
        role: 'system',
        content:
          'Du parsest deutsche Fristen-Angaben. Antworte als JSON {total_days_from_today, reasoning}. Wenn unklar: 0.',
      },
      { role: 'user', content: text.slice(0, 200) },
    ])
    return { totalDays: data.total_days_from_today }
  } catch (e) {
    logger.warn({ msg: 'parseFristTextViaLLM failed', err: String(e) })
    return null
  }
}

// ── Tool 5: find_template ────────────────────────────────────────────────

function findTemplate(args: { lebenslage: LebenslageId; keyword?: string }) {
  let matches = LETTER_TEMPLATES.filter((t) => t.lebenslage === args.lebenslage)
  if (args.keyword) {
    const kw = args.keyword.toLowerCase()
    matches = matches.filter(
      (t) =>
        t.title.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw),
    )
  }
  if (matches.length === 0) {
    return {
      lebenslage: args.lebenslage,
      keyword: args.keyword,
      templates: [],
      hint: 'Keine passende Vorlage gefunden — der Agent muss den Brief frei drafteten.',
    }
  }
  return {
    lebenslage: args.lebenslage,
    keyword: args.keyword,
    templates: matches.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      body: t.body,
      default_frist_days: t.default_frist_days ?? null,
    })),
  }
}

// ── Tool 6: draft_letter ─────────────────────────────────────────────────

// Tolerant schema — the LLM sometimes returns only `draft` or omits the
// arrays. We default the missing fields so a useful letter survives even
// when the model's JSON is incomplete. Strict validation only on `draft`.
const DraftLetterSchema = z.object({
  draft: z.string(),
  filled_placeholders: z.array(z.string()).optional().default([]),
  remaining_placeholders: z.array(z.string()).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
})

async function draftLetter(args: {
  template_id: string
  facts: string
  user_data?: {
    name?: string
    address?: string
    today_iso?: string
  }
}) {
  const tpl = LETTER_TEMPLATES.find((t) => t.id === args.template_id)
  if (!tpl) {
    return {
      error: `unknown template_id '${args.template_id}'`,
      available: LETTER_TEMPLATES.map((t) => t.id),
    }
  }

  const system = `Du füllst eine deutsche Anwalts-/Behörden-Schreiben-Vorlage mit
echten Fakten aus, OHNE den Stil zu ändern. Antworte als JSON-Objekt mit
{draft, filled_placeholders, remaining_placeholders, warnings}.

REGELN
- Übernimm die Vorlage 1:1 wo möglich.
- Ersetze nur [PLATZHALTER] mit konkreten Inhalten aus den Fakten oder user_data.
- Wenn ein Platzhalter aus den Fakten nicht ableitbar ist: stehen lassen UND in
  remaining_placeholders auflisten. Lieber Platzhalter behalten als erfinden.
- Wenn etwas an den Fakten juristisch riskant aussieht (z.B. außerhalb der Frist):
  in warnings notieren.
- Keine Halluzinationen — nichts Inhaltliches dazudichten.

VORLAGE (${tpl.title}):
---
${tpl.body}
---`

  const userMsg = [
    `Fakten (Bürger-Beschreibung):\n${args.facts}`,
    args.user_data
      ? `\nNutzer-Daten:\n${JSON.stringify(args.user_data, null, 2)}`
      : '',
    `\nHeute: ${args.user_data?.today_iso ?? new Date().toISOString().slice(0, 10)}`,
  ].join('\n')

  try {
    const { data } = await chatJSON(DraftLetterSchema, [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ])
    return {
      template_id: tpl.id,
      template_title: tpl.title,
      ...data,
    }
  } catch (e) {
    logger.warn({ msg: 'draft_letter failed', err: String(e) })
    return {
      error: `draft_letter failed: ${String(e)}`,
      template_id: tpl.id,
    }
  }
}

// ── Tool registry export ─────────────────────────────────────────────────

export function buildLebenslagenTools(): ToolDef[] {
  return [
    {
      name: 'detect_lebenslage',
      description:
        'Klassifiziert die Bürger-Beschreibung in eine von 12 Lebenslagen (Mietrecht, Arbeitsrecht, ...). IMMER zuerst aufrufen.',
      schema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Free-text Bürger-Beschreibung des Problems.' },
        },
        required: ['description'],
        additionalProperties: false,
      },
      handler: (a) => detectLebenslage(a as { description: string }),
    },
    {
      name: 'search_relevant_paragraphs',
      description:
        'Holt die für eine Lebenslage kuratierten §§ + Kurztexte aus der Top-30-Tabelle. Optional Keyword zum Filtern (z.B. "Kündigung", "Frist").',
      schema: {
        type: 'object',
        properties: {
          lebenslage: { type: 'string' },
          keyword: { type: 'string', nullable: true },
        },
        required: ['lebenslage'],
        additionalProperties: false,
      },
      handler: (a) =>
        searchRelevantParagraphs(a as { lebenslage: LebenslageId; keyword?: string }),
    },
    {
      name: 'lookup_paragraph_by_code',
      description:
        'Schlägt einen einzelnen Paragraphen direkt in der kuratierten Tabelle nach. Verifizierter Volltext-Kurz. Wenn nicht gefunden: verified=false.',
      schema: {
        type: 'object',
        properties: {
          law: { type: 'string', description: 'Abkürzung, z.B. "BGB", "StGB", "KSchG"' },
          section: { type: 'string', description: 'Paragraph, z.B. "573" oder "§ 573"' },
        },
        required: ['law', 'section'],
        additionalProperties: false,
      },
      handler: (a) => lookupParagraphByCode(a as { law: string; section: string }),
    },
    {
      name: 'compute_frist',
      description:
        'Berechnet ein konkretes Deadline-Datum + days_left. Akzeptiert text="in 3 Wochen"/"bis 15.06.2026", oder strukturiert {days|weeks|months|years}, oder explizites iso="2026-06-15". anchor_iso optional (default heute).',
      schema: {
        type: 'object',
        properties: {
          days: { type: 'number', nullable: true },
          weeks: { type: 'number', nullable: true },
          months: { type: 'number', nullable: true },
          years: { type: 'number', nullable: true },
          iso: { type: 'string', nullable: true },
          text: { type: 'string', nullable: true },
          anchor_iso: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
      handler: (a) => computeFrist(a as Parameters<typeof computeFrist>[0]),
    },
    {
      name: 'find_template',
      description:
        'Findet passende Brief-Vorlagen für eine Lebenslage. 7 kuratierte Templates (Widerspruch Eigenbedarf, Mieterhöhung, Kündigungsschutzklage, Widerruf Online-Kauf, Widerspruch Sozial-Bescheid, Einspruch Bußgeld, DSGVO-Auskunft).',
      schema: {
        type: 'object',
        properties: {
          lebenslage: { type: 'string' },
          keyword: { type: 'string', nullable: true },
        },
        required: ['lebenslage'],
        additionalProperties: false,
      },
      handler: (a) =>
        findTemplate(a as { lebenslage: LebenslageId; keyword?: string }),
    },
    {
      name: 'draft_letter',
      description:
        'Füllt eine Brief-Vorlage mit konkreten Fakten + User-Daten aus. Lässt unbekannte Platzhalter stehen statt zu halluzinieren. Gibt remaining_placeholders + warnings zurück.',
      schema: {
        type: 'object',
        properties: {
          template_id: { type: 'string' },
          facts: { type: 'string' },
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string', nullable: true },
              address: { type: 'string', nullable: true },
              today_iso: { type: 'string', nullable: true },
            },
            additionalProperties: false,
            nullable: true,
          },
        },
        required: ['template_id', 'facts'],
        additionalProperties: false,
      },
      handler: (a) => draftLetter(a as Parameters<typeof draftLetter>[0]),
    },
  ]
}

// Export individual functions for unit testing.
export const _internals = {
  detectLebenslage,
  searchRelevantParagraphs,
  lookupParagraphByCode,
  computeFrist,
  parseGermanFristText,
  findTemplate,
  draftLetter,
}

// Used so the TS compiler doesn't strip `crypto` if I add hashing later.
export const _modulePresenceTag = crypto
  .createHash('sha1')
  .update('lebenslagen-tools-v1')
  .digest('hex')
  .slice(0, 8)
