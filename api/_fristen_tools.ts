/**
 * Tools for the GitLaw Pro Fristen-Monitor + Untätigkeitsklage-Agent.
 *
 * Use case: a daily cron walks every open Pro-Akte. For each Frist:
 * - T-14 before deadline → draft a Mandant reminder (their language)
 * - T-3 before deadline → draft a Mahnschreiben for Anwalt review
 * - T+0 if behoerden_frist § 75 VwGO and Behörde still hasn't decided →
 *   draft a full Untätigkeitsklage with VG-Zuständigkeit, Sachstand, Antrag
 *
 * Read-only or LLM-drafting. No DB writes. Output is queued for the
 * "Heute"-Widget of the Anwält:in. Never auto-sent.
 *
 * Why this matters: § 75 VwGO is the only real lever against LEA/BAMF
 * inaction. Manual tracking is tedious; agentic is alleinstellig. DeepLaw
 * and Advoware do not have this.
 */

import * as crypto from 'node:crypto'
import { getSql } from './_db'
import { chatJSON } from './_llm'
import { logger } from './_log'
import type { ToolDef } from './_agent'
import { z } from 'zod'

// ── Reference data ──────────────────────────────────────────────────────

// 16 Verwaltungsgerichte (eines pro Bundesland — vereinfachtes Mapping;
// in DE gibt es de facto mehrere VGs pro BL, aber für Migration ist die
// erste Anlaufstelle das VG am Sitz der Behörde). Stand 2026.
const VG_BY_PLZ_PREFIX: Array<{ prefix: string; vg: string; bundesland: string }> = [
  { prefix: '0', vg: 'Verwaltungsgericht Dresden', bundesland: 'Sachsen' },
  { prefix: '1', vg: 'Verwaltungsgericht Berlin', bundesland: 'Berlin' },
  { prefix: '2', vg: 'Verwaltungsgericht Hamburg', bundesland: 'Hamburg' },
  { prefix: '30', vg: 'Verwaltungsgericht Hannover', bundesland: 'Niedersachsen' },
  { prefix: '31', vg: 'Verwaltungsgericht Hannover', bundesland: 'Niedersachsen' },
  { prefix: '32', vg: 'Verwaltungsgericht Minden', bundesland: 'NRW' },
  { prefix: '33', vg: 'Verwaltungsgericht Minden', bundesland: 'NRW' },
  { prefix: '34', vg: 'Verwaltungsgericht Kassel', bundesland: 'Hessen' },
  { prefix: '35', vg: 'Verwaltungsgericht Gießen', bundesland: 'Hessen' },
  { prefix: '36', vg: 'Verwaltungsgericht Gießen', bundesland: 'Hessen' },
  { prefix: '37', vg: 'Verwaltungsgericht Göttingen', bundesland: 'Niedersachsen' },
  { prefix: '38', vg: 'Verwaltungsgericht Braunschweig', bundesland: 'Niedersachsen' },
  { prefix: '39', vg: 'Verwaltungsgericht Magdeburg', bundesland: 'Sachsen-Anhalt' },
  { prefix: '4', vg: 'Verwaltungsgericht Düsseldorf', bundesland: 'NRW' },
  { prefix: '5', vg: 'Verwaltungsgericht Köln', bundesland: 'NRW' },
  { prefix: '6', vg: 'Verwaltungsgericht Frankfurt am Main', bundesland: 'Hessen' },
  { prefix: '7', vg: 'Verwaltungsgericht Stuttgart', bundesland: 'Baden-Württemberg' },
  { prefix: '8', vg: 'Verwaltungsgericht München', bundesland: 'Bayern' },
  { prefix: '9', vg: 'Verwaltungsgericht Bayreuth', bundesland: 'Bayern' },
]

// ── Tool 1: walk_open_cases ─────────────────────────────────────────────

interface OpenCase {
  id: string
  aktenzeichen: string
  mandant_name: string
  description: string | null
  case_status: string
  frist_datum: string | null
  frist_bezeichnung: string | null
  behoerde: string | null
  behoerde_plz: string | null
  mandant_email: string | null
  tasks: unknown
  days_left: number | null
  bucket: 't_minus_14' | 't_minus_3' | 't_zero_or_overdue' | 'future'
}

function daysBetween(isoFrom: string, isoTo: string): number {
  const a = new Date(isoFrom + 'T00:00:00Z').getTime()
  const b = new Date(isoTo + 'T00:00:00Z').getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function bucketize(daysLeft: number | null): OpenCase['bucket'] {
  if (daysLeft === null) return 'future'
  if (daysLeft <= 0) return 't_zero_or_overdue'
  if (daysLeft <= 3) return 't_minus_3'
  if (daysLeft <= 14) return 't_minus_14'
  return 'future'
}

async function walkOpenCases(args: { tenant_id: string; horizon_days?: number }) {
  if (!args.tenant_id) return { error: 'tenant_id required' }
  const horizon = args.horizon_days ?? 30
  try {
    const sql = getSql()
    const rows = (await sql`
      SELECT id, aktenzeichen, mandant_name, description, case_status::text AS case_status,
             frist_datum, frist_bezeichnung, behoerde, behoerde_plz, mandant_email, tasks
        FROM cases
       WHERE tenant_id = ${args.tenant_id}::uuid
         AND deleted_at IS NULL
         AND status = 'aktiv'
         AND case_status <> 'verfahren_abgeschlossen'
         AND frist_datum IS NOT NULL
    `) as Array<Record<string, unknown>>

    const today = todayIso()
    const cases: OpenCase[] = []
    for (const r of rows) {
      const frist = (r.frist_datum as string | null) ?? null
      const daysLeft = frist ? daysBetween(today, frist) : null
      if (daysLeft !== null && daysLeft > horizon) continue
      cases.push({
        id: String(r.id),
        aktenzeichen: String(r.aktenzeichen ?? ''),
        mandant_name: String(r.mandant_name ?? ''),
        description: (r.description as string | null) ?? null,
        case_status: String(r.case_status ?? ''),
        frist_datum: frist,
        frist_bezeichnung: (r.frist_bezeichnung as string | null) ?? null,
        behoerde: (r.behoerde as string | null) ?? null,
        behoerde_plz: (r.behoerde_plz as string | null) ?? null,
        mandant_email: (r.mandant_email as string | null) ?? null,
        tasks: r.tasks ?? [],
        days_left: daysLeft,
        bucket: bucketize(daysLeft),
      })
    }
    return {
      today,
      tenant_id: args.tenant_id,
      total_open: cases.length,
      cases,
    }
  } catch (e) {
    logger.warn({ msg: 'walk_open_cases failed', err: String(e) })
    return { error: String(e), cases: [] }
  }
}

// ── Tool 2: compute_days_left (pure) ────────────────────────────────────

function computeDaysLeft(args: { frist_iso: string; today_iso?: string }) {
  try {
    const today = args.today_iso ?? todayIso()
    const days = daysBetween(today, args.frist_iso)
    return {
      days_left: days,
      today_iso: today,
      frist_iso: args.frist_iso,
      bucket: bucketize(days),
      overdue: days < 0,
    }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Tool 3: determine_zustaendig_vg ─────────────────────────────────────

function determineZustaendigVg(args: { behoerde_plz: string | null; behoerde?: string | null }) {
  if (!args.behoerde_plz) {
    return {
      vg: null,
      bundesland: null,
      hint: 'Keine PLZ — Anwält:in muss VG manuell setzen.',
    }
  }
  const plz = args.behoerde_plz.trim()
  // BAMF: Sitz Nürnberg → VG Ansbach normalerweise, aber Verfahren oft am
  // VG des Mandant-Wohnsitzes. Hier conservativ: nimm Behörden-PLZ.
  const matches = VG_BY_PLZ_PREFIX
    .filter((e) => plz.startsWith(e.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)
  if (matches.length === 0) {
    return {
      vg: null,
      bundesland: null,
      hint: `Keine VG-Zuordnung für PLZ ${plz} — manuell prüfen.`,
    }
  }
  const m = matches[0]
  return { vg: m.vg, bundesland: m.bundesland, plz_prefix: m.prefix }
}

// ── Tool 4: draft_mandant_reminder (T-14) ───────────────────────────────

const ReminderSchema = z.object({
  subject: z.string().optional().default(''),
  body: z.string().optional().default(''),
  language: z.enum(['de', 'vi', 'tr', 'ar', 'en']).optional().default('de'),
})

async function draftMandantReminder(args: {
  mandant_name: string
  language: 'de' | 'vi' | 'tr' | 'ar' | 'en'
  frist_bezeichnung: string | null
  frist_datum: string
  days_left: number
  kanzlei_name?: string
}) {
  const langLabel = {
    de: 'Deutsch',
    vi: 'Vietnamesisch',
    tr: 'Türkisch',
    ar: 'Arabisch',
    en: 'Englisch',
  }[args.language]

  const system = `Du draftst eine freundliche Erinnerungs-Email (json) an die Mandant:in einer
deutschen Migrationskanzlei, ca. 14 Tage vor einer Frist. Antwort als JSON
{subject, body, language}.

STIL
- Sprache: ${langLabel} (language="${args.language}")
- Warm, kurz, keine Drohung — die Mandant:in soll sich erinnert, nicht bedroht fühlen.
- Konkret nennen: was die Frist ist, wann sie abläuft, was zu tun ist.
- Direkte Anrede mit Namen.
- Ende: "Bei Fragen einfach antworten" + Kanzlei.
- Keine juristischen Fachbegriffe ohne Erklärung in der Mandant-Sprache.

INHALT
Mandant: ${args.mandant_name}
Frist: ${args.frist_bezeichnung ?? 'Frist'} — ${args.frist_datum} (in ${args.days_left} Tagen)
Kanzlei: ${args.kanzlei_name ?? 'Ihre Kanzlei'}`

  try {
    const { data } = await chatJSON(ReminderSchema, [
      { role: 'system', content: system },
      { role: 'user', content: `Schreibe die Erinnerungs-Email in ${langLabel}.` },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_mandant_reminder failed', err: String(e) })
    return { subject: '', body: '', language: args.language, error: String(e) }
  }
}

// ── Tool 5: draft_mahnschreiben (T-3) ───────────────────────────────────

const MahnschreibenSchema = z.object({
  subject: z.string().optional().default(''),
  body: z.string().optional().default(''),
  remaining_placeholders: z
    .preprocess(
      (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v as object).map(String) : []),
      z.array(z.string()),
    )
    .optional()
    .default([]),
})

async function draftMahnschreiben(args: {
  mandant_name: string
  aktenzeichen: string
  frist_bezeichnung: string | null
  frist_datum: string
  days_left: number
  behoerde: string | null
  kanzlei_name?: string
}) {
  const system = `Du draftst ein förmliches Mahnschreiben (json) an die Mandant:in, 3 Tage
vor Ablauf einer Frist, das in der Akte abgelegt und ggf. versendet wird.
Antwort als JSON {subject, body, remaining_placeholders}.

STIL
- Förmlich, präzise, mit klarer Konsequenz-Beschreibung wenn die Frist
  verstreicht (z.B. Rechtsverlust, Bescheid-Bestandskraft, Verzug).
- Aktenzeichen + Frist konkret nennen.
- Auf Deutsch.
- [PLATZHALTER] für unklare Daten + in remaining_placeholders auflisten.

INPUT
Mandant: ${args.mandant_name}
Aktenzeichen: ${args.aktenzeichen}
Frist: ${args.frist_bezeichnung ?? 'Frist'} — ${args.frist_datum} (nur noch ${args.days_left} Tage)
Behörde: ${args.behoerde ?? 'unbekannt'}
Kanzlei: ${args.kanzlei_name ?? '[KANZLEI-NAME]'}`

  try {
    const { data } = await chatJSON(MahnschreibenSchema, [
      { role: 'system', content: system },
      { role: 'user', content: 'Bitte das Mahnschreiben formulieren.' },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_mahnschreiben failed', err: String(e) })
    return { subject: '', body: '', remaining_placeholders: [], error: String(e) }
  }
}

// ── Tool 6: draft_untaetigkeitsklage (T+0, § 75 VwGO) ───────────────────

const KlageSchema = z.object({
  rubrum: z.string().optional().default(''),
  klage_antrag: z.string().optional().default(''),
  begruendung: z.string().optional().default(''),
  zustaendiges_vg: z.string().optional().default(''),
  remaining_placeholders: z
    .preprocess(
      (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v as object).map(String) : []),
      z.array(z.string()),
    )
    .optional()
    .default([]),
})

async function draftUntaetigkeitsklage(args: {
  mandant_name: string
  aktenzeichen: string
  behoerde: string
  zustaendiges_vg: string
  bundesland: string | null
  sachstand: string
  antrag_datum_iso: string | null
  monate_seit_antrag: number | null
  kanzlei_name?: string
}) {
  const system = `Du draftst eine Untätigkeitsklage gemäß § 75 VwGO (json) gegen eine
deutsche Behörde, die seit mindestens 3 Monaten nicht entschieden hat.
Antwort als JSON {rubrum, klage_antrag, begruendung, zustaendiges_vg, remaining_placeholders}.

VORLAGE / RECHTSRAHMEN
- § 75 VwGO: Untätigkeitsklage zulässig, wenn die Behörde über einen
  Antrag oder Widerspruch ohne zureichenden Grund in angemessener Frist
  (i.d.R. 3 Monate) nicht sachlich entschieden hat.
- Klage-Antrag muss die begehrte Verpflichtung der Behörde enthalten
  (Verpflichtungsklage in Verbindung mit § 75 VwGO).

STRUKTUR
- rubrum: Parteien (Kläger:in [Name] vertreten durch [Kanzlei]; Beklagte:
  ${args.behoerde}); Verfahrensgegenstand kurz.
- klage_antrag: konkrete Antragsformulierung "Die Beklagte wird verpflichtet, ..."
- begruendung: Sachverhalt + rechtliche Würdigung. Konkret eingehen auf:
  Antragsdatum, Dauer der Untätigkeit, fehlender zureichender Grund.
  4–8 Absätze, juristisch sauber, ohne Floskeln.
- zustaendiges_vg: ${args.zustaendiges_vg}
- [PLATZHALTER] für fehlende Daten + remaining_placeholders.
- NIE Fakten erfinden — bei Unklarheit Platzhalter.

INPUT
Mandant: ${args.mandant_name}
Aktenzeichen (Behörde): ${args.aktenzeichen}
Behörde: ${args.behoerde}
Zuständiges VG: ${args.zustaendiges_vg}${args.bundesland ? ' (' + args.bundesland + ')' : ''}
Antragsdatum: ${args.antrag_datum_iso ?? '[ANTRAGSDATUM]'}
Monate seit Antrag: ${args.monate_seit_antrag ?? '[MONATE]'}
Sachstand:
${args.sachstand}
Kanzlei: ${args.kanzlei_name ?? '[KANZLEI]'}`

  try {
    const { data } = await chatJSON(KlageSchema, [
      { role: 'system', content: system },
      { role: 'user', content: 'Bitte den Klage-Entwurf vollständig ausarbeiten.' },
    ])
    return data
  } catch (e) {
    const err = e as { issues?: unknown; raw?: string; message?: string }
    logger.warn({
      msg: 'draft_untaetigkeitsklage failed',
      err: String(e),
      issues: err.issues,
      raw: err.raw?.slice(0, 800),
    })
    return {
      rubrum: '',
      klage_antrag: '',
      begruendung: '',
      zustaendiges_vg: args.zustaendiges_vg,
      remaining_placeholders: [],
      error: String(e),
    }
  }
}

// ── Tool registry ───────────────────────────────────────────────────────

export function buildFristenTools(opts: {
  tenant_id: string
  kanzlei_name?: string
}): ToolDef[] {
  return [
    {
      name: 'walk_open_cases',
      description:
        'Walkt alle offenen Akten der Kanzlei mit Frist innerhalb der nächsten 30 Tage oder überfällig. Liefert pro Akte: days_left + bucket (t_minus_14 | t_minus_3 | t_zero_or_overdue | future). IMMER zuerst aufrufen.',
      schema: {
        type: 'object',
        properties: {
          horizon_days: { type: 'number', description: 'Standard 30.' },
        },
        additionalProperties: false,
      },
      handler: (a) =>
        walkOpenCases({
          tenant_id: opts.tenant_id,
          horizon_days: (a as { horizon_days?: number }).horizon_days,
        }),
    },
    {
      name: 'compute_days_left',
      description: 'Reine Date-Math: Tage zwischen heute (oder today_iso) und frist_iso.',
      schema: {
        type: 'object',
        properties: {
          frist_iso: { type: 'string' },
          today_iso: { type: 'string', nullable: true },
        },
        required: ['frist_iso'],
        additionalProperties: false,
      },
      handler: (a) => computeDaysLeft(a as { frist_iso: string; today_iso?: string }),
    },
    {
      name: 'determine_zustaendig_vg',
      description:
        'Bestimmt das zuständige Verwaltungsgericht anhand der Behörden-PLZ. Liefert vg + bundesland oder hint wenn keine eindeutige Zuordnung.',
      schema: {
        type: 'object',
        properties: {
          behoerde_plz: { type: 'string', nullable: true },
          behoerde: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
      handler: (a) =>
        determineZustaendigVg(a as { behoerde_plz: string | null; behoerde?: string | null }),
    },
    {
      name: 'draft_mandant_reminder',
      description:
        'Draftet eine freundliche Erinnerungs-Email an die Mandant:in ~14 Tage vor einer Frist. Mandant-Sprache.',
      schema: {
        type: 'object',
        properties: {
          mandant_name: { type: 'string' },
          language: { type: 'string', enum: ['de', 'vi', 'tr', 'ar', 'en'] },
          frist_bezeichnung: { type: 'string', nullable: true },
          frist_datum: { type: 'string' },
          days_left: { type: 'number' },
        },
        required: ['mandant_name', 'language', 'frist_datum', 'days_left'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftMandantReminder({
          ...(a as Parameters<typeof draftMandantReminder>[0]),
          kanzlei_name: opts.kanzlei_name,
        }),
    },
    {
      name: 'draft_mahnschreiben',
      description:
        'Draftet ein förmliches Mahnschreiben an die Mandant:in 3 Tage vor Ablauf einer Frist. Deutsch, mit Konsequenz-Hinweis.',
      schema: {
        type: 'object',
        properties: {
          mandant_name: { type: 'string' },
          aktenzeichen: { type: 'string' },
          frist_bezeichnung: { type: 'string', nullable: true },
          frist_datum: { type: 'string' },
          days_left: { type: 'number' },
          behoerde: { type: 'string', nullable: true },
        },
        required: ['mandant_name', 'aktenzeichen', 'frist_datum', 'days_left'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftMahnschreiben({
          ...(a as Parameters<typeof draftMahnschreiben>[0]),
          kanzlei_name: opts.kanzlei_name,
        }),
    },
    {
      name: 'draft_untaetigkeitsklage',
      description:
        'Draftet eine Untätigkeitsklage gem. § 75 VwGO. NUR aufrufen wenn Behörde seit ≥ 3 Monaten nicht entschieden hat. Liefert rubrum + klage_antrag + begruendung + zustaendiges_vg.',
      schema: {
        type: 'object',
        properties: {
          mandant_name: { type: 'string' },
          aktenzeichen: { type: 'string' },
          behoerde: { type: 'string' },
          zustaendiges_vg: { type: 'string' },
          bundesland: { type: 'string', nullable: true },
          sachstand: { type: 'string' },
          antrag_datum_iso: { type: 'string', nullable: true },
          monate_seit_antrag: { type: 'number', nullable: true },
        },
        required: ['mandant_name', 'aktenzeichen', 'behoerde', 'zustaendiges_vg', 'sachstand'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftUntaetigkeitsklage({
          ...(a as Parameters<typeof draftUntaetigkeitsklage>[0]),
          kanzlei_name: opts.kanzlei_name,
        }),
    },
  ]
}

export const _internals = {
  walkOpenCases,
  computeDaysLeft,
  determineZustaendigVg,
  draftMandantReminder,
  draftMahnschreiben,
  draftUntaetigkeitsklage,
  daysBetween,
  bucketize,
}

export const _modulePresenceTag = crypto
  .createHash('sha1')
  .update('fristen-tools-v1')
  .digest('hex')
  .slice(0, 8)
