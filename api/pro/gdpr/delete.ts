/**
 * DSGVO Art. 17 — Recht auf Löschung: Tenant Soft-Delete.
 *
 * POST /api/pro/gdpr/delete
 * Auth: Bearer <ProSessionToken>, Rolle: owner
 *
 * Body:
 *   { confirmText: string, scope: 'tenant' | 'mandant', mandantToken?: string }
 *
 * confirmText muss exakt "LÖSCHEN-{tenantId}" entsprechen.
 *
 * Soft-Delete-Mechanismus:
 *   Setzt einen Marker `tenantDeletion:{tenantId}` in Redis mit 35-Tage-TTL.
 *   Harter Delete (nach 30 Tagen) muss über einen Cron-Job erfolgen.
 *
 * INTEGRATION-GAP:
 *   Bestehende Endpoints (entities.ts, mandant/case.ts) prüfen den Marker
 *   noch nicht. Bis zur Integration geben sie nach Soft-Delete-Request noch
 *   Daten zurück. Nutze isDeletionPending() aus _deletion.ts für die Prüfung.
 *   Antwort bei positivem Marker: 410 Gone.
 *
 * TODO (Agent P3 / Postgres-Migration):
 *   Wenn DATABASE_URL gesetzt, zusätzlich Postgres-Datensätze als deleted markieren.
 *   Redis-Marker bleibt als Sperr-Layer bestehen.
 *
 * TODO (Cron-Job, noch nicht implementiert):
 *   Nach 30 Tagen: harter Delete aller proEntity:*, proDoc:*, mandantInvite:*
 *   für diesen Tenant. Postgres CASCADE dort wo vorhanden.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../../_auth'
import { applyCors, applySecurityHeaders } from '../../_http'
import { writeDeletionMarker } from './_deletion'

const redis = Redis.fromEnv()

/** Server-seitigen Audit-Eintrag anhängen (gleiche Logik wie in export.ts). */
async function appendAuditEntry(tenantId: string, entry: Record<string, unknown>): Promise<void> {
  const existing = await redis.get<unknown[]>(`proAudit:${tenantId}`) ?? []
  await redis.set(`proAudit:${tenantId}`, [...existing, entry], { ex: 5 * 365 * 24 * 60 * 60 })
}

const RECOVERY_DAYS = 30

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Datenzugriff nicht konfiguriert.' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'owner')
  if (!session) return

  const { tenantId, userId } = session
  const { confirmText, scope, mandantToken } = req.body ?? {}

  if (!confirmText || typeof confirmText !== 'string') {
    return res.status(400).json({ error: 'confirmText fehlt' })
  }
  if (scope !== 'tenant' && scope !== 'mandant') {
    return res.status(400).json({ error: 'scope muss tenant oder mandant sein' })
  }

  // Friction-Check: Der Nutzer muss den exakten Bestätigungstext eintippen
  const expectedText = `LÖSCHEN-${tenantId}`
  if (confirmText !== expectedText) {
    return res.status(422).json({
      error: 'Bestätigungstext stimmt nicht überein',
      hint: `Bitte gib exakt "${expectedText}" ein`,
    })
  }

  if (scope === 'mandant' && (!mandantToken || typeof mandantToken !== 'string')) {
    return res.status(400).json({ error: 'mandantToken ist für scope=mandant erforderlich' })
  }

  try {
    const now = new Date()
    const scheduledFor = new Date(now.getTime() + RECOVERY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    await writeDeletionMarker(redis, {
      tenantId,
      requestedAt: now.toISOString(),
      requestedBy: userId,
      scope,
      mandantToken: scope === 'mandant' ? mandantToken : undefined,
      scheduledFor,
    })

    await appendAuditEntry(tenantId, {
      action: 'gdpr.delete-requested',
      scope,
      performedBy: userId,
      scheduledFor,
      timestamp: now.toISOString(),
    })

    return res.status(200).json({
      ok: true,
      message: `Löschantrag registriert. Daten werden am ${scheduledFor.slice(0, 10)} endgültig gelöscht.`,
      scheduledDeletionAt: scheduledFor,
      note: 'Harter Delete via Cron-Job ist noch nicht implementiert. Bitte manuell nachverfolgen.',
    })
  } catch (err) {
    console.error('[gdpr/delete]', err)
    return res.status(500).json({ error: 'Löschantrag fehlgeschlagen', detail: String(err) })
  }
}
