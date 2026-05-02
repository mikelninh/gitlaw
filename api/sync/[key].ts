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
import { applyCors, applySecurityHeaders } from '../_http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, PUT, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  return res.status(410).json({
    error: 'Deprecated sync route',
    hint: 'GitLaw Pro now uses tenant-bound session sync via /api/pro/sync.',
  })
}
