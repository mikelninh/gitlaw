/**
 * DSGVO Art. 20 — Datenportabilität: Tenant-Export als ZIP.
 *
 * POST /api/pro/gdpr/export
 * Auth: Bearer <ProSessionToken>, Rolle: owner
 *
 * Body (optional):
 *   { scope?: 'tenant' | 'self', mandantUserId?: string }
 *   Default: scope = 'tenant'
 *
 * Gibt ein ZIP zurück mit:
 *   tenant-settings.json, cases.json, research.json, letters.json,
 *   audit.json, documents-metadata.json, README.txt
 *
 * Wichtig: Document-Inhalte (base64) sind NICHT im Export.
 * Dokumente einzeln via GET /api/pro/upload?id=... herunterladen.
 *
 * TODO (Agent P3 / Postgres-Migration):
 *   Wenn DATABASE_URL gesetzt ist, zusätzlich aus Postgres exportieren.
 *   Redis-Daten werden dann redundant — nach Migration Redis-Scan entfernen.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import JSZip from 'jszip'
import { requireProSession } from '../../_auth'
import { applyCors, applySecurityHeaders } from '../../_http'

const redis = Redis.fromEnv()

/** Alle Keys scannen die einem Pattern entsprechen. */
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = []
  let cursor = 0
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 200 })
    keys.push(...batch)
    cursor = Number(next)
  } while (cursor !== 0)
  return keys
}

/** Bulk-Werte für mehrere Keys laden. Gibt Map<key, value> zurück. */
async function mget(keys: string[]): Promise<Map<string, unknown>> {
  const result = new Map<string, unknown>()
  if (keys.length === 0) return result
  // Upstash mget gibt Array in gleicher Reihenfolge zurück
  const values = await redis.mget<unknown[]>(...keys)
  keys.forEach((k, i) => {
    if (values[i] !== null) result.set(k, values[i])
  })
  return result
}

/**
 * Sammelt alle Einträge einer Collection (individual-Keys + bulk-Key-fallback).
 * entities.ts schreibt sowohl `proEntity:{tenantId}:{col}:{id}` (individual)
 * als auch `proEntity:{tenantId}:{col}` (bulk) — wir lesen beide.
 */
async function collectCollection(tenantId: string, collection: string): Promise<unknown[]> {
  const items: unknown[] = []
  const seen = new Set<string>()

  // Individual-Keys
  const individualKeys = await scanKeys(`proEntity:${tenantId}:${collection}:*`)
  if (individualKeys.length > 0) {
    const values = await mget(individualKeys)
    values.forEach((v) => { items.push(v); seen.add(JSON.stringify(v)) })
  }

  // Bulk-Key (debounced Sync-Pfad)
  const bulk = await redis.get<{ items?: unknown[] }>(`proEntity:${tenantId}:${collection}`)
  if (bulk?.items) {
    for (const item of bulk.items) {
      const key = JSON.stringify(item)
      if (!seen.has(key)) {
        items.push(item)
        seen.add(key)
      }
    }
  }

  return items
}

/** Document-Metadaten ohne base64-Inhalt. */
interface DocMeta {
  id: string
  fileName: string
  mimeType?: string
  sizeBytes?: number
  checksumSha256?: string
  caseId?: string
  uploadedAt?: string
  uploadedBy?: string
}

async function collectDocumentMetadata(tenantId: string): Promise<DocMeta[]> {
  const keys = await scanKeys(`proDoc:${tenantId}:*`)
  if (keys.length === 0) return []
  const values = await mget(keys)
  const metas: DocMeta[] = []
  values.forEach((v, k) => {
    const doc = v as Record<string, unknown>
    const id = k.replace(`proDoc:${tenantId}:`, '')
    metas.push({
      id,
      fileName: String(doc.fileName ?? ''),
      mimeType: doc.mimeType != null ? String(doc.mimeType) : undefined,
      sizeBytes: doc.sizeBytes != null ? Number(doc.sizeBytes) : undefined,
      checksumSha256: doc.checksumSha256 != null ? String(doc.checksumSha256) : undefined,
      caseId: doc.caseId != null ? String(doc.caseId) : undefined,
      uploadedAt: doc.uploadedAt != null ? String(doc.uploadedAt) : undefined,
      uploadedBy: doc.uploadedBy != null ? String(doc.uploadedBy) : undefined,
    })
  })
  return metas
}

/** Alle Mandant-Invites für diesen Tenant. */
async function collectMandantInvites(tenantId: string): Promise<unknown[]> {
  // mandantInvite-Keys haben kein Tenant-Präfix — wir müssen alle scannen.
  // TODO (Performance): Bei Wachstum auf ein separates Set `mandantInvites:{tenantId}` umsteigen.
  const allKeys = await scanKeys('mandantInvite:*')
  if (allKeys.length === 0) return []
  const values = await mget(allKeys)
  const result: unknown[] = []
  values.forEach((v, k) => {
    const inv = v as Record<string, unknown>
    if (inv.tenantId === tenantId) {
      result.push({ ...inv, token: k.replace('mandantInvite:', '') })
    }
  })
  return result
}

/** Tenant-Settings aus Redis (optional vorhanden). */
async function collectSettings(tenantId: string): Promise<unknown> {
  return redis.get(`proSettings:${tenantId}`) ?? {}
}

/**
 * Server-seitiger Audit-Log.
 * TODO: Derzeit speichert entities.ts keinen Server-Audit in Redis.
 *   Dieses Feld wird im Export leer sein bis ein Audit-Service aufgebaut wird.
 *   Key-Schema für spätere Implementierung: proAudit:{tenantId}
 */
async function collectAudit(tenantId: string): Promise<unknown[]> {
  const raw = await redis.get<unknown[]>(`proAudit:${tenantId}`)
  return raw ?? []
}

/** Audit-Eintrag für DSGVO-Aktionen schreiben. */
async function appendAuditEntry(tenantId: string, entry: Record<string, unknown>): Promise<void> {
  const existing = await redis.get<unknown[]>(`proAudit:${tenantId}`) ?? []
  const updated = [...existing, entry]
  await redis.set(`proAudit:${tenantId}`, updated, { ex: 5 * 365 * 24 * 60 * 60 })
}

const README_TXT = `GitLaw Pro — DSGVO-Datenexport (Art. 20 DSGVO)
================================================

Dieser Export enthält alle personenbezogenen Daten Ihrer Kanzlei in GitLaw Pro.

Dateien in diesem Archiv:
  tenant-settings.json     Kanzlei-Einstellungen (Name, Adresse, Kontakt)
  cases.json               Alle Akten
  research.json            Alle Rechercheabfragen
  letters.json             Alle generierten Schriftsätze
  documents-metadata.json  Metadaten aller hochgeladenen Dokumente
                           (Dateiname, Größe, Prüfsumme — KEIN Dateiinhalt)
  audit.json               Protokoll serverseitiger DSGVO-Aktionen
  README.txt               Diese Datei

Dokument-Inhalte herunterladen:
  Die tatsächlichen Dateien sind NICHT in diesem ZIP enthalten.
  Einzelne Dokumente können über folgenden Endpunkt heruntergeladen werden:
    GET /api/pro/upload?id={documentId}
  (Bearer-Token der Pro-Session erforderlich)

Rechtlicher Hinweis:
  Dieser Export dient Ihrer Datenportabilität nach Art. 20 DSGVO.
  Bitte bewahren Sie dieses Archiv sicher auf — es enthält Mandantendaten.
`

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
  const scope: string = req.body?.scope ?? 'tenant'

  if (scope !== 'tenant' && scope !== 'self') {
    return res.status(400).json({ error: 'scope muss tenant oder self sein' })
  }

  try {
    const [settings, cases, research, letters, docsMeta, invites, audit] = await Promise.all([
      collectSettings(tenantId),
      collectCollection(tenantId, 'cases'),
      collectCollection(tenantId, 'research'),
      collectCollection(tenantId, 'letters'),
      collectDocumentMetadata(tenantId),
      collectMandantInvites(tenantId),
      collectAudit(tenantId),
    ])

    // Audit-Log-Eintrag für den Export selbst
    await appendAuditEntry(tenantId, {
      action: 'gdpr.export',
      scope,
      performedBy: userId,
      timestamp: new Date().toISOString(),
    })

    const zip = new JSZip()
    zip.file('tenant-settings.json', JSON.stringify(settings, null, 2))
    zip.file('cases.json', JSON.stringify(cases, null, 2))
    zip.file('research.json', JSON.stringify(research, null, 2))
    zip.file('letters.json', JSON.stringify(letters, null, 2))
    zip.file('documents-metadata.json', JSON.stringify(docsMeta, null, 2))
    zip.file('mandant-invites.json', JSON.stringify(invites, null, 2))
    zip.file('audit.json', JSON.stringify(audit, null, 2))
    zip.file('README.txt', README_TXT)

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    const date = new Date().toISOString().slice(0, 10)
    const filename = `gitlaw-export-${tenantId}-${date}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', String(buffer.length))
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[gdpr/export]', err)
    return res.status(500).json({ error: 'Export fehlgeschlagen', detail: String(err) })
  }
}
