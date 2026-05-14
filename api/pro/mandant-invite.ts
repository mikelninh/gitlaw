import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes } from 'crypto'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'

const redis = Redis.fromEnv()

const DEFAULT_MANDANT_BASE = 'https://mikelninh.github.io/gitlaw/#/mandant'

function mandantBaseUrl(req: VercelRequest): string {
  const configured = process.env.GITLAW_MANDANT_BASE_URL
  if (configured) return configured.replace(/\/$/, '')
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
    // GitHub Pages serviert unter /gitlaw/, Vercel-Hosts unter /. Fall durch:
    const isVercelHost = host.endsWith('.vercel.app') || host.endsWith('.vercel.sh')
    const prefix = isVercelHost ? '' : '/gitlaw'
    return `${proto}://${host}${prefix}/#/mandant`
  }
  return DEFAULT_MANDANT_BASE
}

export interface MandantInvite {
  tenantId: string
  caseId: string
  lang: 'de' | 'vi'
  expiresAt: number  // unix seconds
  createdBy: string
  createdAt: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, DELETE, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Schreiboperationen rate-limitieren (RATE_WRITE: 30 req/min/IP)
  if (req.method === 'POST' || req.method === 'DELETE') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE)
    if (!rlOk) return
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Mandant-Invite-Vault ist nicht konfiguriert.',
      hint: 'Upstash-Integration im Vercel-Dashboard verbinden.',
    })
  }

  // POST — neuen Invite-Token erstellen
  if (req.method === 'POST') {
    const session = requireProSession(req, res, 'assistenz')
    if (!session) return

    const { caseId, lang = 'de', expiresInDays = 30 } = req.body || {}
    if (!caseId || typeof caseId !== 'string') {
      return res.status(400).json({ error: 'caseId ist erforderlich' })
    }
    if (lang !== 'de' && lang !== 'vi') {
      return res.status(400).json({ error: 'lang muss de oder vi sein' })
    }
    const days = Math.min(Math.max(Number(expiresInDays) || 30, 1), 90)

    const token = randomBytes(18).toString('base64url')
    const expiresAt = Math.floor(Date.now() / 1000) + days * 86400

    const invite: MandantInvite = {
      tenantId: session.tenantId,
      caseId,
      lang,
      expiresAt,
      createdBy: session.userId,
      createdAt: new Date().toISOString(),
    }

    const key = `mandantInvite:${token}`
    await redis.set(key, invite, { ex: days * 86400 })

    const base = mandantBaseUrl(req)
    const mandantUrl = `${base}?token=${token}&lang=${lang}`

    return res.status(200).json({
      ok: true,
      token,
      mandantUrl,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    })
  }

  // GET — Token-Metadaten lesen (für UI "Link anzeigen")
  if (req.method === 'GET') {
    const session = requireProSession(req, res, 'assistenz')
    if (!session) return

    const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
    if (!token) return res.status(400).json({ error: 'token query param fehlt' })

    const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
    if (!invite) return res.status(404).json({ error: 'Token nicht gefunden oder abgelaufen' })
    if (invite.tenantId !== session.tenantId) {
      return res.status(403).json({ error: 'Zugriff nicht erlaubt' })
    }

    const base = mandantBaseUrl(req)
    return res.status(200).json({
      ok: true,
      token,
      caseId: invite.caseId,
      lang: invite.lang,
      expiresAt: new Date(invite.expiresAt * 1000).toISOString(),
      createdAt: invite.createdAt,
      mandantUrl: `${base}?token=${token}`,
    })
  }

  // DELETE — Token widerrufen
  if (req.method === 'DELETE') {
    const session = requireProSession(req, res, 'assistenz')
    if (!session) return

    const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
    if (!token) return res.status(400).json({ error: 'token query param fehlt' })

    const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
    if (!invite) return res.status(404).json({ error: 'Token nicht gefunden' })
    if (invite.tenantId !== session.tenantId) {
      return res.status(403).json({ error: 'Zugriff nicht erlaubt' })
    }

    await redis.del(`mandantInvite:${token}`)
    return res.status(200).json({ ok: true, revoked: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
