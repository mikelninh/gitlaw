/**
 * Visa-Kompass → GitLaw Pro Intake-Endpoint.
 *
 * Externe POST-Schnittstelle (HMAC-signiert via INTAKE_SECRET) für
 * vorqualifizierte Lead-Briefings aus visa-kompass.de.
 *
 * Speichert Briefing in Redis unter
 *   gitlaw:intake:vk:{tenantId}:{id}
 * mit TTL 30d. Bao zieht es via /api/pro/intake/server-list im Browser.
 *
 * Tenant-Routing: Default 'kanzlei-nguyen' (Bao). Mehrere Mandate-Empfänger
 * über GITLAW_VK_TENANT_MAP (JSON: { "vi": "kanzlei-nguyen", "tr": "kanzlei-rubin" }).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { Redis } from '@upstash/redis'
import { applyCors, applySecurityHeaders } from '../../_http'
import { applyRateLimit, RATE_WRITE } from '../../_ratelimit'

// Lazy Redis: nur instanzieren wenn Env-Vars gesetzt — sonst Dev-Fallback.
const hasRedis = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
const redis = hasRedis ? Redis.fromEnv() : null

// Globaler Dev-Fallback (process-lokal, persistent über den dev-server-Lauf).
const devStore: Map<string, unknown> =
  ((globalThis as unknown as { __vkDevStore?: Map<string, unknown> }).__vkDevStore ??=
    new Map())

export interface VisaKompassBriefing {
  id: string
  tenantId: string
  receivedAt: string
  client: {
    name: string
    email?: string
    phone?: string
    language: 'de' | 'en' | 'vi'
  }
  caseHint?: {
    visaSlug?: string
    topic?: string
  }
  intake: {
    quizContext?: {
      topVisaSlug?: string
      topVisaName?: string
      matchScore?: number
      answers?: Record<string, unknown>
    }
    triage?: {
      complexity?: string
      urgencyDays?: number
      suggestedFocusArea?: string
      suggestedPriceRange?: string
    }
    germanSummary?: string
    germanTranslation?: string
    replyDraft?: string
    docChecklist?: { label: string; detail?: string; vnSpecificNote?: string }[]
    vnSpecificNotes?: string[]
    originalMessage?: string
    vcJwt?: string
    preUploadedDocs?: {
      url: string
      filename: string
      mime: string
      size: number
    }[]
  }
  reviewed: boolean
}

function verifyHmac(body: string, signature: string | null): boolean {
  const secret = process.env.INTAKE_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

function resolveTenant(language: string): string {
  const raw = process.env.GITLAW_VK_TENANT_MAP
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>
      if (map[language]) return map[language]
      if (map.default) return map.default
    } catch {
      console.warn('GITLAW_VK_TENANT_MAP is not valid JSON')
    }
  }
  return process.env.GITLAW_VK_DEFAULT_TENANT ?? 'kanzlei-nguyen'
}

function eingaengeUrl(req: VercelRequest, intakeId: string): string {
  const configured = process.env.GITLAW_PRO_BASE_URL
  if (configured) return `${configured.replace(/\/$/, '')}/#/pro/eingaenge?vk=${intakeId}`
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
    const isVercelHost = host.endsWith('.vercel.app') || host.endsWith('.vercel.sh')
    const prefix = isVercelHost ? '' : '/gitlaw'
    return `${proto}://${host}${prefix}/#/pro/eingaenge?vk=${intakeId}`
  }
  return `https://mikelninh.github.io/gitlaw/#/pro/eingaenge?vk=${intakeId}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rlOk = await applyRateLimit(req, res, RATE_WRITE)
  if (!rlOk) return

  if (!process.env.INTAKE_SECRET) {
    return res.status(503).json({ error: 'INTAKE_SECRET not configured' })
  }

  const raw =
    typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body)

  if (!verifyHmac(raw, (req.headers['x-signature'] as string) ?? null)) {
    return res.status(401).json({ error: 'invalid signature' })
  }

  let body: any
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(raw)
  } catch {
    return res.status(400).json({ error: 'invalid json' })
  }

  // Minimal-Validierung — Schema-strict ist visa-kompass-Seite.
  const client = body?.client
  if (!client?.name || typeof client.name !== 'string') {
    return res.status(400).json({ error: 'client.name required' })
  }
  const language: 'de' | 'en' | 'vi' =
    client.language === 'vi' || client.language === 'en' || client.language === 'de'
      ? client.language
      : 'de'

  const tenantId = resolveTenant(language)
  const id = `vk_${randomBytes(8).toString('base64url')}`

  const briefing: VisaKompassBriefing = {
    id,
    tenantId,
    receivedAt: new Date().toISOString(),
    client: {
      name: String(client.name).slice(0, 200),
      email: typeof client.email === 'string' ? client.email.slice(0, 200) : undefined,
      phone: typeof client.phone === 'string' ? client.phone.slice(0, 60) : undefined,
      language,
    },
    caseHint: body?.case
      ? {
          visaSlug: typeof body.case.visaSlug === 'string' ? body.case.visaSlug : undefined,
          topic: typeof body.case.topic === 'string' ? body.case.topic : undefined,
        }
      : undefined,
    intake: body?.intake ?? {},
    reviewed: false,
  }

  const key = `gitlaw:intake:vk:${tenantId}:${id}`
  if (redis) {
    await redis.set(key, briefing, { ex: 60 * 60 * 24 * 30 })
  } else {
    devStore.set(key, briefing)
  }

  return res.status(200).json({
    ok: true,
    intakeId: id,
    eingaengeUrl: eingaengeUrl(req, id),
  })
}
