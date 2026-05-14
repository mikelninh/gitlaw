/**
 * Liest ein Mandant-eigenes Dokument aus dem Redis-Vault.
 *
 * GET /api/mandant/document?token=XXX&id=YYY
 *
 * Auth: Token-Hash-Lookup (Postgres-first, Redis-Fallback).
 * Berechtigung:
 *   - Dokument muss zur Akte des Tokens gehören
 *   - uploaded_by muss 'mandant' sein (keine Anwalts-Drafts)
 *
 * Response: Binary mit korrektem Content-Type (Image / PDF).
 * Cache-Control: private, no-store (PII).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_PUBLIC } from '../_ratelimit'
import type { MandantInvite } from '../pro/mandant-invite'
import { getSql } from '../_db'
import crypto from 'node:crypto'

const redis = Redis.fromEnv()

// ── Invite-Lookup: Postgres-first, Redis-Fallback ──────────────────────────

async function resolveInviteFromPostgres(
  token: string,
): Promise<{ tenantId: string; caseId: string } | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const sql = getSql()
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const rows = await sql`
      SELECT mi.case_id, t.slug AS tenant_slug
      FROM mandant_invitations mi
      JOIN tenants t ON t.id = mi.tenant_id
      WHERE mi.token_hash = ${tokenHash}
        AND mi.expires_at > now()
        AND mi.revoked_at IS NULL
      LIMIT 1
    `
    if (!rows[0]) return null
    return {
      tenantId: rows[0].tenant_slug as string,
      caseId: rows[0].case_id as string,
    }
  } catch (err) {
    console.warn('[mandant/document] Postgres-Invite-Lookup fehlgeschlagen:', err)
    return null
  }
}

async function resolveInviteFromRedis(token: string): Promise<MandantInvite | null> {
  const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
  if (!invite) return null
  const now = Math.floor(Date.now() / 1000)
  if (invite.expiresAt < now) return null
  return invite
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const rlOk = await applyRateLimit(req, res, RATE_PUBLIC)
  if (!rlOk) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
  const documentId = typeof req.query.id === 'string' ? req.query.id.trim() : ''

  if (!token) return res.status(401).json({ error: 'Token fehlt' })
  if (!documentId) return res.status(400).json({ error: 'id fehlt' })

  // Invite resolven
  let tenantId: string
  let caseId: string

  const pgInvite = await resolveInviteFromPostgres(token)
  if (pgInvite) {
    tenantId = pgInvite.tenantId
    caseId = pgInvite.caseId
  } else {
    const redisInvite = await resolveInviteFromRedis(token)
    if (!redisInvite) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
    tenantId = redisInvite.tenantId
    caseId = redisInvite.caseId
  }

  // Aus Redis-Vault laden
  const vaultKey = `proDoc:${tenantId}:${documentId}`
  const entry = await redis.get<{
    caseId: string
    uploadedBy?: string
    mimeType: string
    base64: string
  }>(vaultKey)

  if (!entry) {
    return res.status(404).json({ error: 'Dokument nicht gefunden oder abgelaufen' })
  }

  // Berechtigung: muss zur Akte gehören + vom Mandanten hochgeladen
  if (entry.caseId !== caseId) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }
  if (entry.uploadedBy !== 'mandant') {
    return res.status(403).json({ error: 'Nur eigene Dokumente können abgerufen werden' })
  }

  const buffer = Buffer.from(entry.base64, 'base64')

  res.setHeader('Content-Type', entry.mimeType)
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.status(200).send(buffer)
}
