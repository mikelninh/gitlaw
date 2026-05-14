/**
 * GET /api/cron/backup-db — nächtlicher JSON-Dump aller Tabellen nach Vercel Blob.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Trigger: Vercel Cron (täglich 02:00 UTC) — vercel.json crons-Block (siehe unten).
 *
 * Strategie: @neondatabase/serverless liest alle Tabellen als JSON aus,
 * @vercel/blob speichert das Ergebnis privat. Nach Upload werden alte Backups
 * (>30) gelöscht.
 *
 * Wenn DATABASE_URL_UNPOOLED fehlt, antwortet der Endpoint mit { ok: true, skipped }.
 *
 * --- vercel.json-Snippet (manuell eintragen, da parallel Agents die Datei bearbeiten) ---
 * "crons": [{ "path": "/api/cron/backup-db", "schedule": "0 2 * * *" }]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const KEEP_BACKUPS = 30

// Tabellen die gesichert werden (öffentliche Schemata ohne interne Postgres-System-Tables)
const TABLES = [
  'users',
  'cases',
  'evidence_items',
  'audit_log',
  'sessions',
  'magic_link_tokens',
] as const

async function dumpTables(dbUrl: string): Promise<Record<string, unknown[]>> {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(dbUrl)

  const dump: Record<string, unknown[]> = {}

  for (const table of TABLES) {
    try {
      const rows = await sql(`SELECT * FROM ${table}`)
      dump[table] = rows
    } catch {
      // Tabelle existiert noch nicht (Migration noch nicht gelaufen) — überspringen
      dump[table] = []
    }
  }

  return dump
}

async function uploadToBlob(filename: string, content: string): Promise<string> {
  const { put } = await import('@vercel/blob')
  const blob = await put(filename, content, {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  return blob.url
}

async function pruneOldBackups(): Promise<number> {
  const { list, del } = await import('@vercel/blob')
  const result = await list({ prefix: 'backups/gitlaw-pro-' })
  const blobs = result.blobs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  const toDelete = blobs.slice(KEEP_BACKUPS)
  if (toDelete.length === 0) return 0
  await del(toDelete.map((b) => b.url))
  return toDelete.length
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Nur GET — Vercel Cron triggert mit GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth-Check: CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' })
  }
  const auth = req.headers.authorization
  if (auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Kein Postgres → Stub-Antwort
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!dbUrl) {
    return res.status(200).json({ ok: true, skipped: 'postgres_not_configured' })
  }

  // Blob-Token prüfen
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' })
  }

  try {
    const date = isoDate()
    const filename = `backups/gitlaw-pro-${date}.json`

    const tables = await dumpTables(dbUrl)
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2)

    const blobUrl = await uploadToBlob(filename, payload)
    const deleted = await pruneOldBackups()

    return res.status(200).json({
      ok: true,
      filename,
      blobUrl,
      rowCounts: Object.fromEntries(
        Object.entries(tables).map(([t, rows]) => [t, rows.length]),
      ),
      prunedOldBackups: deleted,
    })
  } catch (err) {
    console.error('[backup-db]', (err as Error).message)
    return res.status(500).json({ ok: false, error: 'Backup fehlgeschlagen' })
  }
}
