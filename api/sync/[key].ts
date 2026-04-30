/**
 * GET /api/sync/{key}  → return last snapshot for kanzleiKey, 404 if none
 * PUT /api/sync/{key}  → store snapshot
 *
 * Storage: Upstash Redis (verbunden via Vercel-Marketplace-Integration).
 * Erforderliche Env-Vars (von Upstash automatisch in Vercel injectet):
 *   - KV_REST_API_URL
 *   - KV_REST_API_TOKEN
 * (Upstash setzt zusätzlich KV_URL und REDIS_URL, die wir hier nicht brauchen.)
 *
 * WICHTIG für Beta:
 *   - kanzleiKey ist die einzige "Auth". Wer ihn rät, kann lesen/schreiben.
 *     Für Pilotbetrieb mit handverteilten Keys vertretbar; vor Public-Launch
 *     auf token-basierte Auth (Magic-Link + JWT) umstellen.
 *   - Snapshot-Größe ist begrenzt (~900 KB pro Eintrag).
 *   - DSGVO: Upstash-Region Frankfurt (eu-central-1), AVV mit Upstash
 *     erforderlich für Produktivbetrieb mit Mandant:innen-Daten.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'

const redis = Redis.fromEnv()

const MAX_SNAPSHOT_SIZE = 900_000  // ~900 KB
const TTL_SECONDS = 60 * 60 * 24 * 90  // 90 Tage

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, PUT, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Sanity check: ohne Env-Vars ist Redis nicht initialisierbar
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Cloud-Sync ist serverseitig nicht konfiguriert.',
      hint: 'Admin: Upstash-Integration im Vercel-Dashboard mit Projekt verbinden, dann re-deploy.',
    })
  }

  const { key } = req.query
  if (typeof key !== 'string' || !key.trim() || key.length > 200) {
    return res.status(400).json({ error: 'Invalid key' })
  }

  const namespacedKey = `proSync:${key}`

  if (req.method === 'GET') {
    try {
      const snapshot = await redis.get(namespacedKey)
      if (!snapshot) return res.status(404).json({ error: 'No snapshot for this key' })
      return res.status(200).json(snapshot)
    } catch (err) {
      return res.status(500).json({ error: 'Read failed', detail: String(err) })
    }
  }

  if (req.method === 'PUT') {
    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Body must be a JSON snapshot' })
    }
    const size = JSON.stringify(body).length
    if (size > MAX_SNAPSHOT_SIZE) {
      return res.status(413).json({
        error: 'Snapshot too large',
        sizeBytes: size,
        limitBytes: MAX_SNAPSHOT_SIZE,
        hint: 'Bitte ZIP-Export alter Akten archivieren und lokal löschen.',
      })
    }
    try {
      await redis.set(namespacedKey, body, { ex: TTL_SECONDS })
      return res.status(200).json({ ok: true, sizeBytes: size, ttlDays: TTL_SECONDS / 86400 })
    } catch (err) {
      return res.status(500).json({ error: 'Write failed', detail: String(err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
