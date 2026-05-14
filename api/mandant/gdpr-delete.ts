/**
 * DSGVO Art. 17 — Mandanten-Selbstlöschung.
 *
 * POST /api/mandant/gdpr-delete
 * Auth: { token: string, confirmText: string }
 *
 * confirmText muss exakt "LÖSCHEN-{aktenzeichen}" entsprechen.
 *
 * Was gelöscht wird:
 *   - Mandant-Invite-Token (widerrufen — kein weiterer Zugriff mehr)
 *   - Alle Mandant-Uploads in der Akte werden als "mandant_widerruf" markiert
 *     (dataUrl wird gelöscht, Metadaten bleiben für Anwalt sichtbar)
 *
 * Was NICHT gelöscht wird:
 *   - Die Akte selbst (§ 50 BRAO: 5 Jahre Aufbewahrungspflicht)
 *   - Anwalt-interne Notizen und Schriftsätze
 *
 * TODO (Agent P3 / Postgres-Migration):
 *   Wenn DATABASE_URL gesetzt, Mandant-Uploads in Postgres als deleted markieren.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import type { MandantInvite } from '../pro/mandant-invite'

const redis = Redis.fromEnv()

interface StoredCase {
  id: string
  aktenzeichen: string
  mandantName: string
  documents?: Array<{
    id: string
    originalName: string
    uploadedAt: string
    uploadedBy?: string
    serverDocumentId?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

async function resolveInvite(token: string): Promise<MandantInvite | null> {
  const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
  if (!invite) return null
  const now = Math.floor(Date.now() / 1000)
  if (invite.expiresAt < now) return null
  return invite
}

async function loadCase(tenantId: string, caseId: string): Promise<StoredCase | null> {
  const individual = await redis.get<StoredCase>(`proEntity:${tenantId}:cases:${caseId}`)
  if (individual) return individual
  const bulk = await redis.get<{ items?: StoredCase[] }>(`proEntity:${tenantId}:cases`)
  if (bulk?.items) return bulk.items.find(c => c.id === caseId) ?? null
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Datenzugriff nicht konfiguriert.' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  const confirmText = typeof req.body?.confirmText === 'string' ? req.body.confirmText.trim() : ''

  if (!token) return res.status(401).json({ error: 'Token fehlt' })
  if (!confirmText) return res.status(400).json({ error: 'confirmText fehlt' })

  const invite = await resolveInvite(token)
  if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

  const caseData = await loadCase(invite.tenantId, invite.caseId)
  if (!caseData) return res.status(404).json({ error: 'Akte nicht gefunden' })

  // Friction-Check
  const expectedText = `LÖSCHEN-${caseData.aktenzeichen}`
  if (confirmText !== expectedText) {
    return res.status(422).json({
      error: 'Bestätigungstext stimmt nicht überein',
      hint: `Bitte gib exakt "${expectedText}" ein`,
    })
  }

  try {
    const deletedDocIds: string[] = []

    // 1. Mandant-Uploads aus Document Vault löschen (dataUrl entfernen)
    const mandantDocs = (caseData.documents ?? []).filter(d => d.uploadedBy === 'mandant')
    for (const doc of mandantDocs) {
      if (!doc.serverDocumentId) continue
      const key = `proDoc:${invite.tenantId}:${doc.serverDocumentId}`
      const stored = await redis.get<Record<string, unknown>>(key)
      if (!stored) continue
      // base64 entfernen, Metadaten als widerrufen markieren
      const { base64: _base64, ...rest } = stored as { base64?: unknown } & Record<string, unknown>
      await redis.set(key, {
        ...rest,
        widerrufenAt: new Date().toISOString(),
        widerrufenGrund: 'mandant_widerruf_art17_dsgvo',
      }, { ex: 5 * 365 * 24 * 60 * 60 })
      deletedDocIds.push(doc.serverDocumentId)
    }

    // 2. Mandant-Uploads in der Akte als widerrufen markieren
    const updatedDocuments = (caseData.documents ?? []).map(d => {
      if (d.uploadedBy !== 'mandant') return d
      return {
        ...d,
        mandantWiderruf: true,
        widerrufenAt: new Date().toISOString(),
      }
    })

    const updatedCase = { ...caseData, documents: updatedDocuments }
    await redis.set(
      `proEntity:${invite.tenantId}:cases:${invite.caseId}`,
      updatedCase,
      { ex: 5 * 365 * 24 * 60 * 60 },
    )

    // 3. Invite-Token widerrufen — kein weiterer Mandant-Zugriff
    await redis.del(`mandantInvite:${token}`)

    return res.status(200).json({
      ok: true,
      revokedDocumentIds: deletedDocIds,
      message: [
        `${deletedDocIds.length} Ihrer hochgeladenen Dokumente wurden gelöscht.`,
        'Die Akte selbst bleibt aus gesetzlichen Gründen (§ 50 BRAO) bei der Kanzlei erhalten.',
        'Ihr Zugangslink wurde deaktiviert.',
      ].join(' '),
    })
  } catch (err) {
    console.error('[mandant/gdpr-delete]', err)
    return res.status(500).json({ error: 'Löschvorgang fehlgeschlagen', detail: String(err) })
  }
}
