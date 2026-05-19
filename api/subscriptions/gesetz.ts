/**
 * POST   /api/subscriptions/gesetz — abonniert Themen für den Wochen-Digest
 * DELETE /api/subscriptions/gesetz?token=...  — Unsubscribe via mailto-Token
 *
 * Public endpoint. Rate-limited. Email wird nie im Klartext gespeichert —
 * nur als sha256-Hash. Unsubscribe geht über mintbaren Token (kein Auth-Header).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'node:crypto'
import { getSql } from '../_db'
import { applyRateLimit, RATE_WRITE } from '../_ratelimit'
import { DIFF_TOPICS } from '../_diff_watcher_tools'

const VALID_TOPICS = new Set<string>(DIFF_TOPICS as readonly string[])

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function mintToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await applyRateLimit(req, res, RATE_WRITE))) return

  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = (req.body ?? {}) as { email?: string; topics?: string[]; language?: string }
  const email = (body.email ?? '').trim()
  const topics = Array.isArray(body.topics) ? body.topics.filter((t) => VALID_TOPICS.has(t)) : []
  const language = body.language === 'en' ? 'en' : 'de'

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Ungültige Email.' })
  }
  if (topics.length === 0) {
    return res.status(400).json({ error: 'Mindestens ein gültiges Thema erforderlich.', valid_topics: Array.from(VALID_TOPICS) })
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'Datenbank nicht konfiguriert.' })
  }

  try {
    const sql = getSql()
    const emailHash = hashEmail(email)
    const id = crypto.randomUUID()
    const unsubscribeToken = mintToken()
    const emailToken = mintToken()

    await sql`
      INSERT INTO gesetz_subscriptions
        (id, email_hash, email_token, topics, language, unsubscribe_token)
      VALUES
        (${id}, ${emailHash}, ${emailToken}, ${topics}::text[], ${language}, ${unsubscribeToken})
    `

    return res.status(201).json({
      ok: true,
      id,
      topics,
      language,
      unsubscribe_token: unsubscribeToken,
      hint: 'Bewahre den Unsubscribe-Token sicher auf — damit kannst du jederzeit abmelden.',
    })
  } catch (err) {
    console.error('[subscriptions/gesetz POST]', (err as Error).message)
    return res.status(500).json({ error: 'Abo konnte nicht angelegt werden.' })
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const token = (req.query.token as string | undefined) ?? ''
  if (!token) return res.status(400).json({ error: 'token query-parameter required' })

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'Datenbank nicht konfiguriert.' })
  }

  try {
    const sql = getSql()
    const rows = (await sql`
      DELETE FROM gesetz_subscriptions
       WHERE unsubscribe_token = ${token}
       RETURNING id
    `) as Array<{ id: string }>
    if (rows.length === 0) return res.status(404).json({ error: 'Token unbekannt oder bereits abgemeldet.' })
    return res.status(200).json({ ok: true, deleted: rows[0].id })
  } catch (err) {
    console.error('[subscriptions/gesetz DELETE]', (err as Error).message)
    return res.status(500).json({ error: 'Abmeldung fehlgeschlagen.' })
  }
}
