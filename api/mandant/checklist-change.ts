import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'
import { resolveMandantInvite } from './_invite-resolver'

const REAL_CLIENT_MODE_ENABLED = process.env.GITLAW_REAL_CLIENT_UPLOADS_ENABLED === 'true'
const redis = Redis.fromEnv()
const TTL_SECONDS = 60 * 60 * 24 * 90
const MAX_MESSAGE = 1200
const ACTIONS = new Set(['not_applicable', 'add_document', 'question'])

interface ChangeRequest {
  id: string
  caseId: string
  checklistItemId?: string
  action: 'not_applicable' | 'add_document' | 'question'
  message?: string
  createdAt: string
  status: 'pending'
  source: 'mandant_portal'
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!REAL_CLIENT_MODE_ENABLED) {
    return res.status(503).json({
      error: 'Real-Client-Mode ist noch nicht freigegeben.',
      code: 'REAL_CLIENT_MODE_DISABLED',
      hint: 'Die öffentliche Demo speichert Änderungswünsche nur lokal und überträgt keine Mandantendaten.',
    })
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Datenzugriff nicht verfügbar.' })
  }

  const token = req.method === 'GET'
    ? (typeof req.query.token === 'string' ? req.query.token.trim() : '')
    : (typeof req.body?.token === 'string' ? req.body.token.trim() : '')
  if (!token) return res.status(401).json({ error: 'Token fehlt' })

  const invite = await resolveMandantInvite(token)
  if (!invite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })

  const key = `mandantChecklistChange:${invite.tenantId}:${invite.caseId}`

  if (req.method === 'GET') {
    const rows = await redis.get<ChangeRequest[]>(key)
    return res.status(200).json({ ok: true, requests: rows ?? [] })
  }

  if (req.method === 'POST') {
    const rlOk = await applyRateLimit(req, res, RATE_WRITE)
    if (!rlOk) return

    const action = String(req.body?.action ?? '')
    const checklistItemId = typeof req.body?.checklistItemId === 'string'
      ? req.body.checklistItemId.trim().slice(0, 160)
      : undefined
    const message = typeof req.body?.message === 'string'
      ? req.body.message.trim().slice(0, MAX_MESSAGE)
      : undefined

    if (!ACTIONS.has(action)) return res.status(400).json({ error: 'Ungültige Aktion' })
    if (action === 'not_applicable' && !checklistItemId) return res.status(400).json({ error: 'checklistItemId fehlt' })
    if ((action === 'add_document' || action === 'question') && !message) return res.status(400).json({ error: 'Bitte kurze Nachricht angeben' })

    const row: ChangeRequest = {
      id: uid(),
      caseId: invite.caseId,
      checklistItemId,
      action: action as ChangeRequest['action'],
      message,
      createdAt: new Date().toISOString(),
      status: 'pending',
      source: 'mandant_portal',
    }

    const current = await redis.get<ChangeRequest[]>(key) ?? []
    await redis.set(key, [...current, row].slice(-100), { ex: TTL_SECONDS })
    return res.status(200).json({ ok: true, request: row })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
