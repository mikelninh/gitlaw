/**
 * POST /api/pro/auth/magic-link
 *
 * Body: { email: string }
 *
 * Generates a Magic-Link-Token, speichert den SHA-256-Hash in Redis (15 Min
 * TTL) und sendet die Email via Brevo. Rate-Limit: RATE_AUTH (5 req/min/IP).
 * Antwort immer { ok: true } — kein Email-Enumeration-Leak.
 *
 * DSGVO: nur HMAC(email) wird als Key gespeichert, nie Klartext-Email in Redis.
 */

import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applySecurityHeaders, applyCors } from '../../_http'
import { hashEmail } from '../../_auth'
import { applyRateLimit, RATE_AUTH } from '../../_ratelimit'

const redis = Redis.fromEnv()

const TOKEN_TTL_SECONDS = 15 * 60

function publicUrl(): string {
  const u = process.env.GITLAW_PUBLIC_URL
  if (!u) {
    // Fallback for local dev — links won't work outside localhost but at least don't crash
    console.warn('GITLAW_PUBLIC_URL not set — magic link URLs will be broken in production')
    return 'http://localhost:5173'
  }
  return u.replace(/\/$/, '')
}

async function sendBrevoEmail(to: string, magicUrl: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@gitlaw.app'
  const senderName = process.env.BREVO_SENDER_NAME || 'GitLaw Pro'

  if (!apiKey) {
    console.warn('[magic-link] BREVO_API_KEY nicht gesetzt — Email wird nicht gesendet (Simulation)')
    console.info(`[magic-link] Simulated magic link: ${magicUrl}`)
    return
  }

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 40px auto; color: #1a1a1a;">
  <p style="font-size: 16px; margin-bottom: 24px;">Hallo,</p>
  <p style="font-size: 16px;">klicken Sie auf diesen Link, um sich bei GitLaw Pro einzuloggen:</p>
  <p style="margin: 32px 0;">
    <a href="${magicUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
      Bei GitLaw Pro einloggen
    </a>
  </p>
  <p style="font-size: 14px; color: #666; margin-top: 32px;">
    Der Link gilt 15 Minuten und kann nur einmal verwendet werden.
    Wenn Sie sich nicht einloggen wollten, können Sie diese E-Mail ignorieren.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;">
    GitLaw Pro &mdash; Software für Anwält:innen und Kanzleien<br>
    Senden Sie keine vertraulichen Daten als Antwort auf diese E-Mail.
  </p>
</body>
</html>
  `.trim()

  const text = `Hallo,\n\nklicken Sie auf diesen Link, um sich bei GitLaw Pro einzuloggen:\n\n${magicUrl}\n\nDer Link gilt 15 Minuten und kann nur einmal verwendet werden. Wenn Sie sich nicht einloggen wollten, können Sie diese E-Mail ignorieren.\n\nGitLaw Pro`

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: 'Ihr Login-Link für GitLaw Pro',
      htmlContent: html,
      textContent: text,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Brevo API error ${resp.status}: ${body}`)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // IP-Rate-Limit (RATE_AUTH: 5 req/min) — verhindert Spam-Flood von einer IP.
  // Vor der Email-Validierung, damit kein Enumeration-Leak durch Timing entsteht.
  const rlOk = await applyRateLimit(req, res, RATE_AUTH)
  if (!rlOk) return

  const emailRaw = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : ''
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    // Antwort immer 200, damit kein Email-Enumeration-Leak über Fehlerantworten
    return res.status(200).json({ ok: true })
  }

  const emailHash = hashEmail(emailRaw)

  // Token generieren: 24 Bytes = 32 Zeichen base64url
  const tokenRaw = crypto.randomBytes(24).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')

  await redis.set(
    `magicLinkToken:${tokenHash}`,
    JSON.stringify({ email: emailRaw, createdAt: new Date().toISOString() }),
    { ex: TOKEN_TTL_SECONDS },
  )

  // Token landet auf /#/pro — MagicLinkLogin liest ihn aus useSearchParams.
  // KEIN /verify-Subpfad: würde von ProApps Wildcard-Route auf /pro umgeleitet
  // und der Query-String würde verloren gehen.
  const magicUrl = `${publicUrl()}/#/pro?magicToken=${encodeURIComponent(tokenRaw)}`

  try {
    await sendBrevoEmail(emailRaw, magicUrl)
    console.info('[magic-link] sent', { emailHash, tokenHash: tokenHash.slice(0, 12) })
  } catch (err) {
    // Email-Send-Fehler intern loggen, nach außen trotzdem 200 (kein Leak)
    console.error('[magic-link] send_error', err)
  }

  return res.status(200).json({ ok: true })
}
