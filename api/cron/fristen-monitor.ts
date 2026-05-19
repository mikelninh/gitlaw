/**
 * GET /api/cron/fristen-monitor — daily Fristen-Walker + Untätigkeitsklage-Agent.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Trigger: Vercel Cron (06:00 UTC) — vercel.json crons-Block:
 *   "crons": [{ "path": "/api/cron/fristen-monitor", "schedule": "0 6 * * *" }]
 *
 * Strategie: für jeden aktiven Tenant alle offenen Akten durchgehen.
 * Für jede Frist in den nächsten 30 Tagen oder überfällig:
 *   - T-14 → draft Mandant-Reminder (Mandant-Sprache)
 *   - T-3  → draft Mahnschreiben (DE, formell, mit Konsequenz)
 *   - T+0 mit behoerden_frist + § 75-Tatbestand → draft Untätigkeitsklage
 *
 * Output: Liste von Draft-Einträgen pro Akte → "Heute"-Widget der Anwält:in.
 * NIE auto-send. Nie DB-Mutation.
 *
 * Why this matters: Manuelles Fristen-Tracking + Klage-Drafting kostet
 * pro Akte 30-45 Minuten. Agent macht es in < 60 Sekunden.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_db'
import { _internals } from '../_fristen_tools'
import { logger } from '../_log'

interface DraftEntry {
  case_id: string
  aktenzeichen: string
  mandant_name: string
  bucket: 't_minus_14' | 't_minus_3' | 't_zero_or_overdue' | 'future'
  days_left: number | null
  frist_datum: string | null
  frist_bezeichnung: string | null
  action: 'reminder' | 'mahnschreiben' | 'untaetigkeitsklage' | 'noop'
  draft: unknown
  error?: string
}

function isUntaetigkeitsCandidate(args: {
  bucket: string
  case_status: string
  frist_bezeichnung: string | null
  behoerde: string | null
}): boolean {
  if (args.bucket !== 't_zero_or_overdue') return false
  if (!args.behoerde) return false
  // Wenn case_status auf wartende behördliche Rückmeldung steht und Frist
  // überschritten ist → § 75 VwGO einschlägig.
  if (
    args.case_status === 'behoerdliche_rueckmeldung_ausstehend' ||
    args.case_status === 'antrag_eingereicht'
  ) {
    return true
  }
  // Oder wenn frist_bezeichnung explizit auf § 75 verweist.
  const fb = (args.frist_bezeichnung ?? '').toLowerCase()
  if (fb.includes('§ 75') || fb.includes('untätig') || fb.includes('behoerden_frist')) {
    return true
  }
  return false
}

async function processTenant(tenantId: string): Promise<{
  tenant_id: string
  total_open: number
  drafts: DraftEntry[]
  errors: string[]
}> {
  const errors: string[] = []
  const walked = await _internals.walkOpenCases({ tenant_id: tenantId, horizon_days: 30 })
  if ('error' in walked && walked.error) {
    errors.push(`walk_open_cases: ${walked.error}`)
    return { tenant_id: tenantId, total_open: 0, drafts: [], errors }
  }
  const cases = (walked as { cases: Array<Record<string, unknown>> }).cases ?? []
  const drafts: DraftEntry[] = []

  for (const c of cases) {
    const bucket = String(c.bucket)
    const base: Omit<DraftEntry, 'action' | 'draft'> = {
      case_id: String(c.id),
      aktenzeichen: String(c.aktenzeichen),
      mandant_name: String(c.mandant_name),
      bucket: bucket as DraftEntry['bucket'],
      days_left: (c.days_left as number | null) ?? null,
      frist_datum: (c.frist_datum as string | null) ?? null,
      frist_bezeichnung: (c.frist_bezeichnung as string | null) ?? null,
    }

    try {
      if (bucket === 't_minus_14') {
        const draft = await _internals.draftMandantReminder({
          mandant_name: base.mandant_name,
          language: 'de',
          frist_bezeichnung: base.frist_bezeichnung,
          frist_datum: base.frist_datum!,
          days_left: base.days_left!,
        })
        drafts.push({ ...base, action: 'reminder', draft })
      } else if (bucket === 't_minus_3') {
        const draft = await _internals.draftMahnschreiben({
          mandant_name: base.mandant_name,
          aktenzeichen: base.aktenzeichen,
          frist_bezeichnung: base.frist_bezeichnung,
          frist_datum: base.frist_datum!,
          days_left: base.days_left!,
          behoerde: (c.behoerde as string | null) ?? null,
        })
        drafts.push({ ...base, action: 'mahnschreiben', draft })
      } else if (bucket === 't_zero_or_overdue') {
        if (
          isUntaetigkeitsCandidate({
            bucket,
            case_status: String(c.case_status),
            frist_bezeichnung: base.frist_bezeichnung,
            behoerde: (c.behoerde as string | null) ?? null,
          })
        ) {
          const vg = _internals.determineZustaendigVg({
            behoerde_plz: (c.behoerde_plz as string | null) ?? null,
            behoerde: (c.behoerde as string | null) ?? null,
          })
          const draft = await _internals.draftUntaetigkeitsklage({
            mandant_name: base.mandant_name,
            aktenzeichen: base.aktenzeichen,
            behoerde: String(c.behoerde ?? '[BEHÖRDE]'),
            zustaendiges_vg: vg.vg ?? '[ZUSTÄNDIGES VG]',
            bundesland: vg.bundesland ?? null,
            sachstand: (c.description as string | null) ?? '[SACHSTAND AUS AKTE]',
            antrag_datum_iso: null,
            monate_seit_antrag: null,
          })
          drafts.push({ ...base, action: 'untaetigkeitsklage', draft })
        } else {
          // Überfällige Mandant-Frist → letztes Mahnschreiben
          const draft = await _internals.draftMahnschreiben({
            mandant_name: base.mandant_name,
            aktenzeichen: base.aktenzeichen,
            frist_bezeichnung: base.frist_bezeichnung,
            frist_datum: base.frist_datum!,
            days_left: base.days_left!,
            behoerde: (c.behoerde as string | null) ?? null,
          })
          drafts.push({ ...base, action: 'mahnschreiben', draft })
        }
      }
    } catch (e) {
      drafts.push({ ...base, action: 'noop', draft: null, error: String(e) })
      errors.push(`case ${base.case_id}: ${String(e)}`)
    }
  }

  return {
    tenant_id: tenantId,
    total_open: (walked as { total_open?: number }).total_open ?? cases.length,
    drafts,
    errors,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' })
  }
  const auth = req.headers.authorization
  if (auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = getSql()
    const tenants = (await sql`
      SELECT id::text AS id, slug
        FROM tenants
       WHERE deleted_at IS NULL
    `) as Array<{ id: string; slug: string }>

    const results: Array<Awaited<ReturnType<typeof processTenant>>> = []
    for (const t of tenants) {
      const r = await processTenant(t.id)
      results.push(r)
      logger.info({
        msg: 'fristen.tenant_processed',
        tenant_id: t.id,
        tenant_slug: t.slug,
        total_open: r.total_open,
        drafts: r.drafts.length,
        errors: r.errors.length,
      })
    }

    return res.status(200).json({
      ok: true,
      ran_at: new Date().toISOString(),
      tenants_processed: results.length,
      results,
    })
  } catch (err) {
    logger.error({ msg: 'fristen-monitor.crash', err: String(err) })
    return res.status(500).json({ ok: false, error: 'Fristen-Monitor fehlgeschlagen' })
  }
}
