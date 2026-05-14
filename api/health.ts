/**
 * GET /api/health — public, kein Auth, kein Rate-Limit.
 *
 * Prüft Redis, LLM-Key, E-Mail-Config und optional Postgres.
 * Kein PII in der Antwort.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applySecurityHeaders, applyCors } from './_http'

type ServiceStatus = 'up' | 'down' | 'configured' | 'missing' | 'not_configured'

interface HealthResponse {
  ok: boolean
  ts: string
  services: {
    redis: 'up' | 'down'
    llm: 'configured' | 'missing'
    email: 'configured' | 'missing'
    postgres: 'up' | 'down' | 'not_configured'
  }
}

async function checkRedis(): Promise<'up' | 'down'> {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return 'down'

  try {
    // Timeout nach 2s — hängende Redis-Verbindung soll die Function nicht blockieren
    const ping = fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    }).then(async (r) => {
      if (!r.ok) return 'down' as const
      const body = await r.text()
      // Upstash REST antwortet mit { result: "PONG" }
      return body.includes('PONG') ? ('up' as const) : ('down' as const)
    })
    return await Promise.race([
      ping,
      new Promise<'down'>((resolve) => setTimeout(() => resolve('down'), 2000)),
    ])
  } catch {
    return 'down'
  }
}

async function checkPostgres(): Promise<'up' | 'down' | 'not_configured'> {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return 'not_configured'

  try {
    // Dynamischer Import um Bundle-Größe zu sparen wenn kein Postgres konfiguriert
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await Promise.race([
      sql`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000),
      ),
    ])
    return 'up'
  } catch {
    return 'down'
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  applyCors(req, res, 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [redis, postgres] = await Promise.all([checkRedis(), checkPostgres()])

  const llm: ServiceStatus = process.env.OPENAI_API_KEY ? 'configured' : 'missing'
  const email: ServiceStatus = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY ? 'configured' : 'missing'

  const body: HealthResponse = {
    ok: redis === 'up',
    ts: new Date().toISOString(),
    services: {
      redis,
      llm,
      email,
      postgres,
    },
  }

  const status = redis === 'up' ? 200 : 503
  // Kurze Cache-Zeit: CDN darf 15s cachen, Client soll frisch holen
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
  return res.status(status).json(body)
}
