/**
 * DSGVO Art. 20 — Datenportabilität für Mandanten.
 *
 * POST /api/mandant/gdpr-export
 * Auth: { token: string } (kein Pro-Session — Mandanten haben keine Pro-Session)
 *
 * Der Token identifiziert den Mandanten über den mandantInvite-Eintrag.
 * Gibt ein ZIP zurück mit Aktendaten (gefiltert, keine internen Notes)
 * und hochgeladenen Mandant-Dokumenten (Metadaten + base64 falls vorhanden).
 *
 * Größengrenze: Wenn base64-Gesamtgröße > 3 MB, werden Dokument-Inhalte
 * weggelassen und nur Metadaten exportiert (README weist darauf hin).
 *
 * TODO (Agent P3 / Postgres-Migration):
 *   Wenn DATABASE_URL gesetzt, Daten zusätzlich aus Postgres exportieren.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import JSZip from 'jszip'
import { applyCors, applySecurityHeaders } from '../_http'
import type { MandantInvite } from '../pro/mandant-invite'

const redis = Redis.fromEnv()

// Maximale Gesamtgröße aller base64-Daten im Export (3 MB)
const MAX_EXPORT_BASE64_BYTES = 3 * 1024 * 1024

interface StoredCase {
  id: string
  aktenzeichen: string
  mandantName: string
  description?: string
  caseStatus?: string
  mandatsartId?: string
  fristDatum?: string
  fristBezeichnung?: string
  updatedAt: string
  createdAt: string
  checklistStates?: Record<string, 'received' | 'pending' | 'problem'>
  documents?: StoredDocument[]
}

interface StoredDocument {
  id: string
  originalName: string
  uploadedAt: string
  uploadedBy?: string
  checklistItemId?: string
  mimeType?: string
  sizeBytes?: number
  storageMode?: string
  serverDocumentId?: string
  checksumSha256?: string
  kind?: 'vollmacht' | 'standard'
}

/** Nur Mandant-relevante Felder — keine internen Anwalt-Notes oder IDs leaken. */
function filterCaseForMandant(raw: StoredCase) {
  return {
    id: raw.id,
    aktenzeichen: raw.aktenzeichen,
    mandantName: raw.mandantName,
    description: raw.description ?? '',
    caseStatus: raw.caseStatus ?? 'unterlagen_fehlen',
    mandatsartId: raw.mandatsartId ?? null,
    fristDatum: raw.fristDatum ?? null,
    fristBezeichnung: raw.fristBezeichnung ?? null,
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    checklistStates: raw.checklistStates ?? {},
    mandantDocuments: (raw.documents ?? [])
      .filter(d => d.uploadedBy === 'mandant')
      .map(d => ({
        id: d.id,
        originalName: d.originalName,
        uploadedAt: d.uploadedAt,
        checklistItemId: d.checklistItemId ?? null,
        mimeType: d.mimeType ?? null,
        sizeBytes: d.sizeBytes ?? null,
        kind: d.kind ?? 'standard',
        serverDocumentId: d.serverDocumentId ?? null,
        checksumSha256: d.checksumSha256 ?? null,
      })),
  }
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
  if (!token) return res.status(401).json({ error: 'Token fehlt' })

  const invite = await resolveInvite(token)
  if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

  const caseData = await loadCase(invite.tenantId, invite.caseId)
  if (!caseData) return res.status(404).json({ error: 'Akte nicht gefunden' })

  const filteredCase = filterCaseForMandant(caseData)

  // Mandant-Dokumente aus dem Document Vault laden
  interface DocEntry { meta: Record<string, unknown>; base64?: string }
  const docEntries: DocEntry[] = []
  let totalBase64Bytes = 0
  let base64Truncated = false

  for (const doc of filteredCase.mandantDocuments) {
    if (!doc.serverDocumentId) continue
    try {
      const stored = await redis.get<Record<string, unknown>>(
        `proDoc:${invite.tenantId}:${doc.serverDocumentId}`,
      )
      if (!stored) continue
      const meta: Record<string, unknown> = {
        id: doc.serverDocumentId,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        uploadedAt: stored.uploadedAt,
      }
      const b64 = typeof stored.base64 === 'string' ? stored.base64 : null
      if (b64 && !base64Truncated && (totalBase64Bytes + b64.length) <= MAX_EXPORT_BASE64_BYTES) {
        docEntries.push({ meta, base64: b64 })
        totalBase64Bytes += b64.length
      } else {
        if (b64) base64Truncated = true
        docEntries.push({ meta })
      }
    } catch {
      // Einzelnes Dokument nicht verfügbar — überspringen
    }
  }

  const readmeTxt = [
    'GitLaw Pro — Ihr persönlicher DSGVO-Datenexport (Art. 20 DSGVO)',
    '=================================================================',
    '',
    'Dieser Export enthält alle Daten, die Sie im Rahmen Ihrer Mandatsakte',
    `hochgeladen haben (Akte: ${filteredCase.aktenzeichen}).`,
    '',
    'Dateien in diesem Archiv:',
    '  akte.json          Ihre Akte (kein internes Anwaltsmaterial)',
    '  documents/         Ihre hochgeladenen Dokumente (falls vorhanden)',
    '  README.txt         Diese Datei',
    '',
    base64Truncated
      ? 'Hinweis: Einige Dokumente konnten wegen der Exportgröße nicht enthalten werden.\n  Bitte wenden Sie sich an Ihre Kanzlei für einen vollständigen Export.'
      : '',
    '',
    'Rechtlicher Hinweis:',
    '  Die Akte selbst verbleibt bei der Kanzlei. Anwält:innen sind',
    '  gesetzlich verpflichtet, Mandatsakten 5 Jahre aufzubewahren (§ 50 BRAO).',
    '  Dieser Export berührt das nicht.',
  ].filter(l => l !== undefined).join('\n')

  try {
    const zip = new JSZip()
    zip.file('akte.json', JSON.stringify(filteredCase, null, 2))
    zip.file('README.txt', readmeTxt)

    const docsFolder = zip.folder('documents')!
    for (const entry of docEntries) {
      const name = String(entry.meta.fileName ?? entry.meta.id ?? 'dokument')
      if (entry.base64) {
        docsFolder.file(name, entry.base64, { base64: true })
      } else {
        docsFolder.file(
          `${name}.meta.json`,
          JSON.stringify(entry.meta, null, 2),
        )
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    const date = new Date().toISOString().slice(0, 10)
    const filename = `gitlaw-mandant-export-${filteredCase.aktenzeichen}-${date}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', String(buffer.length))
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[mandant/gdpr-export]', err)
    return res.status(500).json({ error: 'Export fehlgeschlagen', detail: String(err) })
  }
}
