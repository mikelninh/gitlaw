/**
 * GET /api/cron/mandant-update — wöchentlicher Sachstand-Drafts-Job.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Trigger: Vercel Cron (Sonntag 18:00 UTC) — vercel.json crons-Block:
 *   { "path": "/api/cron/mandant-update", "schedule": "0 18 * * 0" }
 *
 * Was passiert
 * - Pro Tenant: alle aktiven Akten holen
 * - Für jede Akte: diff seit dem letzten Update (7 Tage Default)
 * - Wenn meaningful_change → Sachstand-Email in mandant_email-Sprache draften
 * - Drafts in `mandant_update_drafts` (oder Audit-Log) als Queue ablegen
 * - Anwält:in sieht sie im /pro/mandant-updates Panel und klickt "alle senden"
 *
 * NIE auto-send. Drafts only.
 *
 * Soft-Fallback: wenn DB / OPENAI_API_KEY fehlen → 200 + skipped reason.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runAgent } from '../_agent'
import { buildMandantUpdateTools } from '../_mandant_update_tools'
import { logger } from '../_log'

const SYSTEM_PROMPT = `Du bist der Mandant-Update-Agent für eine deutsche Migrationskanzlei.
Wöchentlich Sonntags läufst du pro Anwält:in/Tenant und draftest Sachstand-Emails.

ARBEITSWEISE
1. \`list_active_cases\` — alle aktiven Akten dieses Tenants.
2. Für JEDE Akte (mit max. 8 Tool-Calls insgesamt):
   a. \`extract_case_changes\` — was hat sich seit since_iso getan?
   b. Wenn meaningful_change=false: überspringen.
   c. Sonst: \`detect_mandant_language\` → \`draft_sachstand_email\`.
3. Am Ende: kurze deutsche Zusammenfassung — wie viele Drafts erzeugt, welche Sprachen.

KEINE Emails versenden. Drafts only. Halte den Ton der Drafts respektvoll-warm.`

const DEFAULT_LOOKBACK_DAYS = 7

async function loadTenants(): Promise<Array<{ id: string; slug: string; name: string }>> {
  const { getSql } = await import('../_db')
  const sql = getSql()
  const rows = (await sql`
    SELECT id::text AS id, slug, name
      FROM tenants
     WHERE deleted_at IS NULL
       AND plan IN ('pilot', 'pro', 'beta')
     ORDER BY created_at ASC
     LIMIT 50
  `) as Array<{ id: string; slug: string; name: string }>
  return rows
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

  if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
    return res.status(200).json({ ok: true, skipped: 'postgres_not_configured' })
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ ok: true, skipped: 'openai_not_configured' })
  }

  const sinceIso = new Date(
    Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 3600 * 1000,
  ).toISOString()

  let tenants: Array<{ id: string; slug: string; name: string }>
  try {
    tenants = await loadTenants()
  } catch (e) {
    logger.error({ msg: 'mandant-update: loadTenants failed', err: String(e) })
    return res.status(500).json({ ok: false, error: 'tenants_query_failed' })
  }

  const summary: Array<{
    tenant_slug: string
    status: string
    iterations: number
    cost_usd: number
    final_message: string | null
    drafts_count: number
  }> = []

  for (const t of tenants) {
    const tools = buildMandantUpdateTools({
      tenant_id: t.id,
      since_iso: sinceIso,
      kanzlei_name: t.name,
    })
    try {
      const result = await runAgent({
        agentName: 'mandant_update',
        systemPrompt: SYSTEM_PROMPT,
        userMessage: `Wöchentlicher Sachstand-Run für Kanzlei "${t.name}". Lookback seit ${sinceIso}. Maximal 8 Tool-Calls.`,
        tools,
        maxIterations: 12,
        maxCostUsd: 0.8,
        inputPayload: { tenant_id: t.id, since_iso: sinceIso },
      })
      const drafts = result.toolTrace.filter(
        (c) => c.tool === 'draft_sachstand_email' && !c.error,
      ).length
      summary.push({
        tenant_slug: t.slug,
        status: result.status,
        iterations: result.iterations,
        cost_usd: Number(result.totalCostUsd.toFixed(6)),
        final_message: result.finalMessage,
        drafts_count: drafts,
      })
    } catch (e) {
      logger.error({ msg: 'mandant-update: agent failed', tenant: t.slug, err: String(e) })
      summary.push({
        tenant_slug: t.slug,
        status: 'failed',
        iterations: 0,
        cost_usd: 0,
        final_message: null,
        drafts_count: 0,
      })
    }
  }

  return res.status(200).json({
    ok: true,
    since_iso: sinceIso,
    tenants_processed: summary.length,
    total_drafts: summary.reduce((a, b) => a + b.drafts_count, 0),
    summary,
  })
}
