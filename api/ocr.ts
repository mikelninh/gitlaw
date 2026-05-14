import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from './_auth'
import { applyCors, applySecurityHeaders } from './_http'
import { chat } from './_llm'
import { applyRateLimit, RATE_LLM, ipUserKey } from './_ratelimit'

const redis = Redis.fromEnv()

function decodePdfEscapes(input: string): string {
  return input
    .replace(/\\([nrtbf()\\])/g, (_m, ch: string) => {
      if (ch === 'n') return '\n'
      if (ch === 'r') return '\r'
      if (ch === 't') return '\t'
      if (ch === 'b') return '\b'
      if (ch === 'f') return '\f'
      return ch
    })
    .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
}

function extractTextFromPdfBase64(base64: string): string {
  const binary = Buffer.from(base64, 'base64').toString('latin1')
  const pieces: string[] = []

  const literalMatches = binary.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)
  for (const match of literalMatches) {
    const decoded = decodePdfEscapes(match[1]).trim()
    if (decoded && /[A-Za-zÄÖÜäöüß0-9]/.test(decoded)) pieces.push(decoded)
  }

  const hexMatches = binary.matchAll(/<([0-9A-Fa-f\s]{6,})>/g)
  for (const match of hexMatches) {
    const hex = match[1].replace(/\s+/g, '')
    if (hex.length % 2 !== 0) continue
    try {
      const decoded = Buffer.from(hex, 'hex').toString('utf8').trim()
      if (decoded && /[A-Za-zÄÖÜäöüß0-9]/.test(decoded)) pieces.push(decoded)
    } catch {
      // ignore malformed hex chunks
    }
  }

  const normalized = pieces
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return normalized
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  // KI-Cost-Schutz per User (RATE_LLM: 20 req/min/IP+user)
  const rlOk = await applyRateLimit(req, res, RATE_LLM, ipUserKey(req, session.userId))
  if (!rlOk) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Document vault not configured' })
  }

  const { caseId, attachmentInternalName, mode, sourceLanguage, targetLanguage, serverDocumentId, sourceText } = req.body || {}
  if (!caseId || !attachmentInternalName || !mode) {
    return res.status(400).json({ error: 'caseId, attachmentInternalName and mode are required' })
  }

  try {
    let mimeType = 'text/plain'
    let base64 = ''
    if (typeof serverDocumentId === 'string' && serverDocumentId.trim()) {
      const key = `proDoc:${session.tenantId}:${serverDocumentId.trim()}`
      const payload = await redis.get<{ mimeType: string; base64: string }>(key)
      if (!payload) return res.status(404).json({ error: 'Server document not found' })
      mimeType = payload.mimeType
      base64 = payload.base64
    }

    if (mode === 'ocr') {
      if (mimeType.startsWith('text/')) {
        const ocrText = Buffer.from(base64, 'base64').toString('utf8')
        return res.status(200).json({ ok: true, status: 'done', provider: 'native-text', ocrText })
      }
      if (mimeType === 'application/pdf') {
        const ocrText = extractTextFromPdfBase64(base64)
        if (ocrText) {
          return res.status(200).json({ ok: true, status: 'done', provider: 'pdf-text-layer', ocrText })
        }
        return res.status(200).json({
          ok: true,
          status: 'needs_render',
          message: 'PDF has no text layer. Client-side rendering to images required before OCR.',
        })
      }
      if (mimeType.startsWith('image/')) {
        const dataUrl = `data:${mimeType};base64,${base64}`
        const { content: ocrText } = await chat([
          {
            role: 'system',
            content: 'You perform OCR for legal documents. Transcribe the document faithfully into plain text. Do not summarize.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please transcribe this legal document exactly into plain text.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ], { max_tokens: 1600, temperature: 0.1 })
        return res.status(200).json({ ok: true, status: 'done', provider: 'openai-vision', ocrText })
      }
      return res.status(501).json({
        ok: false,
        status: 'not_supported_yet',
        message: 'OCR is currently supported for text and image documents. PDF OCR worker is the next step.',
      })
    }

    if (mode === 'translate') {
      const source =
        (typeof sourceText === 'string' && sourceText.trim())
          ? sourceText.trim()
          : mimeType.startsWith('text/')
            ? Buffer.from(base64, 'base64').toString('utf8')
            : ''
      if (!source) {
        return res.status(400).json({
          error: 'No source text available for translation',
          hint: 'Run OCR first or provide sourceText',
        })
      }
      const { content: translatedTextDe } = await chat([
        {
          role: 'system',
          content: 'You translate legal working texts into German. Preserve legal meaning, keep names, dates, and identifiers unchanged where possible. Return only the German working translation.',
        },
        {
          role: 'user',
          content: `Source language: ${sourceLanguage || 'unknown'}\nTarget language: ${targetLanguage || 'de'}\n\nText:\n${source}`,
        },
      ], { max_tokens: 1400, temperature: 0.1 })
      return res.status(200).json({ ok: true, status: 'done', provider: 'openai-translation', translatedTextDe })
    }

    return res.status(400).json({ error: 'Unsupported mode' })
  } catch (err) {
    return res.status(500).json({
      error: 'OCR/translation request failed',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }
}
