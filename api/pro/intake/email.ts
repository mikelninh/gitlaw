/**
 * Email auto-ingestion endpoint — SendGrid Inbound Parse compatible.
 *
 * Accepts multipart/form-data with email fields (from, to, subject, text, html)
 * and attachments. Creates an IntakeEntry, auto-classifies, and returns
 * the intake ID for polling.
 *
 * SendGrid Inbound Parse sends:
 *   from, to, subject, text, html, attachments (multipart files)
 *
 * This endpoint is stateless: it stores the intake in Redis (or local dev
 * fallback) and optionally triggers the classify pipeline.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable, { Fields, Files, File as FormidableFile } from 'formidable'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'

// ---------------------------------------------------------------------------
// Minimal Redis / KV stub (mirror of classify.ts pattern)
// ---------------------------------------------------------------------------

let redis: any = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Redis } = await import('@upstash/redis')
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  } catch {
    /* fallback below */
  }
}

async function kvSet(key: string, value: unknown, ttlSeconds = 86400): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
    return
  }
  // Dev fallback: in-memory ephemeral store (not for production)
  devStore.set(key, JSON.stringify(value))
}

const devStore = new Map<string, string>()

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function fieldValue(fields: Fields, name: string): string | undefined {
  const v = fields[name]
  if (!v) return undefined
  if (Array.isArray(v)) return v[0] || undefined
  return v
}

async function parseForm(req: VercelRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25 MB per file
    })
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

async function fileToMeta(file: FormidableFile) {
  const buf = await fs.readFile(file.filepath)
  return {
    originalName: file.originalFilename || 'attachment',
    internalName: `email-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${extFromMime(file.mimetype || 'application/octet-stream')}`,
    mimeType: file.mimetype || 'application/octet-stream',
    sizeBytes: buf.length,
    dataBase64: buf.toString('base64'),
  }
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  }
  return map[mime] || 'bin'
}

function guessCategoryFromMime(mime: string): 'foto' | 'bescheid' | 'vertrag' | 'chat' | 'sonstiges' {
  if (mime.startsWith('image/')) return 'foto'
  if (mime === 'application/pdf') return 'bescheid'
  if (mime.includes('word') || mime.includes('text')) return 'vertrag'
  return 'sonstiges'
}

// ---------------------------------------------------------------------------
// Intake shape (mirrors viewer/src/pro/types.ts)
// ---------------------------------------------------------------------------

interface IntakeEntry {
  id: string
  caseId?: string
  targetSlug?: string
  submittedAt: string
  name: string
  email?: string
  phone?: string
  anliegen: string
  gewuenschterAusgang?: string
  dringlichkeit?: 'niedrig' | 'mittel' | 'hoch' | 'akut'
  fristBekannt?: boolean
  attachments?: Array<{
    originalName: string
    internalName: string
    mimeType: string
    sizeBytes: number
    category?: 'foto' | 'bescheid' | 'vertrag' | 'chat' | 'sonstiges'
    languageHint?: 'de' | 'vi' | 'en' | 'tr' | 'ar' | 'other'
    dataBase64?: string
  }>
  source: 'email'
  senderEmail: string
  reviewed: boolean
}

// ---------------------------------------------------------------------------
// Classification stub (mirrors classify.ts pattern)
// ---------------------------------------------------------------------------

interface ClassificationResult {
  category: string
  urgency: 'niedrig' | 'mittel' | 'hoch' | 'akut'
  summary: string
  suggestedTemplateIds?: string[]
}

async function classifyIntake(intake: IntakeEntry): Promise<ClassificationResult> {
  // In production this would call the LLM classify pipeline.
  // For now we do a lightweight keyword heuristic so the flow is testable.
  const text = (intake.anliegen + ' ' + (intake.gewuenschterAusgang || '')).toLowerCase()

  let urgency: ClassificationResult['urgency'] = 'mittel'
  if (/\bfrist|abgelaufen|morgen|sofort|eilig|notfall\b/.test(text)) urgency = 'akut'
  else if (/\bdringend|wichtig|kündigung|ablehnung|abschiebung\b/.test(text)) urgency = 'hoch'

  let category = 'Allgemein'
  const cats: { rx: RegExp; name: string }[] = [
    { rx: /\bmiete|wohnung|kündigung|vermieter\b/, name: 'Mietrecht' },
    { rx: /\barbeit|arbeitgeber|kündigung.*arbeit|arbeitnehmer\b/, name: 'Arbeitsrecht' },
    { rx: /\bsozial|bürgergeld|alg|jobcenter|rente|krankenkasse\b/, name: 'Sozialrecht' },
    { rx: /\baufenthalt|visa|abschiebung|asyl|ausländer|einbürgerung\b/, name: 'Migrationsrecht' },
    { rx: /\berbe|testament|vorsorgevollmacht|patientenverfügung\b/, name: 'Erbrecht/Vorsorge' },
    { rx: /\bfamilie|scheidung|sorgerecht|unterhalt|ehe\b/, name: 'Familienrecht' },
    { rx: /\bstraf|polizei|staatsanwaltschaft|anzeige\b/, name: 'Strafrecht' },
    { rx: /\bsteuer|finanzamt|einspruch.*steuer\b/, name: 'Steuerrecht' },
  ]
  for (const c of cats) {
    if (c.rx.test(text)) { category = c.name; break }
  }

  return {
    category,
    urgency,
    summary: `E-Mail von ${intake.senderEmail} — ${category} (${urgency})`,
    suggestedTemplateIds: [],
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const { fields, files } = await parseForm(req)

    const from = fieldValue(fields, 'from') || fieldValue(fields, 'sender') || ''
    const to = fieldValue(fields, 'to') || fieldValue(fields, 'recipient') || ''
    const subject = fieldValue(fields, 'subject') || '(kein Betreff)'
    const textBody = fieldValue(fields, 'text') || fieldValue(fields, 'body') || ''
    const htmlBody = fieldValue(fields, 'html') || ''

    // Extract sender email from "Name <email>" or plain email
    const senderEmail = from.match(/<([^>]+)>/)?.[1] || from.match(/[^\s<>]+/)?.[0] || from
    const senderName = from.replace(/<[^>]+>/, '').trim() || senderEmail

    // Build anliegen from subject + body
    const anliegenParts: string[] = []
    if (subject && subject !== '(kein Betreff)') anliegenParts.push(`Betreff: ${subject}`)
    if (textBody) anliegenParts.push(textBody)
    else if (htmlBody) {
      // Strip HTML tags for plaintext anliegen
      anliegenParts.push(htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    }
    if (anliegenParts.length === 0) anliegenParts.push('(Leere E-Mail ohne Text)')

    // Process attachments
    const attachmentMetas: IntakeEntry['attachments'] = []
    const rawAttachments = files.attachments || files.attachment || []
    const attachmentList = Array.isArray(rawAttachments) ? rawAttachments : rawAttachments ? [rawAttachments] : []
    for (const f of attachmentList) {
      if (!f) continue
      const meta = await fileToMeta(f as FormidableFile)
      attachmentMetas.push({
        originalName: meta.originalName,
        internalName: meta.internalName,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        category: guessCategoryFromMime(meta.mimeType),
        languageHint: 'de',
        dataBase64: meta.dataBase64,
      })
      // Cleanup temp file
      try { await fs.unlink((f as FormidableFile).filepath) } catch { /* ignore */ }
    }

    const intake: IntakeEntry = {
      id: `email-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      submittedAt: new Date().toISOString(),
      name: senderName || 'Unbekannt',
      email: senderEmail,
      anliegen: anliegenParts.join('\n\n'),
      attachments: attachmentMetas.length > 0 ? attachmentMetas : undefined,
      source: 'email',
      senderEmail,
      reviewed: false,
    }

    // Auto-classify
    const classification = await classifyIntake(intake)
    intake.dringlichkeit = classification.urgency
    if (classification.summary) {
      intake.gewuenschterAusgang = classification.summary
    }

    // Persist
    await kvSet(`gitlaw:intake:${intake.id}`, intake, 86400 * 7)

    return res.status(200).json({
      ok: true,
      intakeId: intake.id,
      classification,
      attachmentsCount: attachmentMetas.length,
    })
  } catch (err: any) {
    console.error('[email-intake] error:', err)
    return res.status(500).json({ error: 'Internal error', detail: err?.message || String(err) })
  }
}
