import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors, applySecurityHeaders } from './_http'

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.slice(0, max).trim() : ''
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rating = clean(req.body?.rating, 30)
  if (!new Set(['helpful', 'partial', 'missing']).has(rating)) {
    return res.status(400).json({ error: 'Invalid rating' })
  }

  const event = {
    event: 'gitlaw_mietrecht_pilot_feedback',
    timestamp: new Date().toISOString(),
    question: clean(req.body?.question, 2_500),
    rating,
    note: clean(req.body?.note, 2_000),
    retrievalSignal: clean(req.body?.retrievalSignal, 30),
    durationMs: Number.isFinite(Number(req.body?.durationMs)) ? Number(req.body.durationMs) : null,
    sources: Array.isArray(req.body?.sources)
      ? req.body.sources.slice(0, 8).map((source: { law?: unknown; section?: unknown }) => ({
          law: clean(source?.law, 80),
          section: clean(source?.section, 180),
        }))
      : [],
  }

  // Pilot phase: structured runtime log, not a claim of mature analytics.
  // The browser also keeps a local copy for the reviewer.
  console.log(JSON.stringify(event))
  return res.status(200).json({ ok: true, captured: 'pilot-runtime-log' })
}
