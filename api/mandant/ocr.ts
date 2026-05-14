/**
 * OCR-Endpoint für das Mandanten-Portal.
 *
 * Kein Pro-Auth — Mandanten haben nur ein Invite-Token, keine Pro-Session.
 * Payload: { token, fileName, mimeType, base64 }
 * Response (ok): { ok: true, status: 'done'|'needs_render', ocrText? }
 * Response (err): { ok: false, status: 'error', error: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors, applySecurityHeaders } from '../_http'
import { chat } from '../_llm'
import { applyRateLimit, RATE_LLM } from '../_ratelimit'
import { resolveMandantInvite } from './_invite-resolver'

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

  return pieces
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ ok: false, status: 'error', error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, status: 'error', error: 'Method not allowed' })

  // Rate-Limit per IP (kein userId bekannt)
  const rlOk = await applyRateLimit(req, res, RATE_LLM)
  if (!rlOk) return

  const { token, mimeType, base64 } = req.body || {}

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ ok: false, status: 'error', error: 'Token fehlt' })
  }

  const invite = await resolveMandantInvite(token.trim())
  if (!invite) {
    return res.status(401).json({ ok: false, status: 'error', error: 'Token ungültig oder abgelaufen' })
  }

  if (!mimeType || !base64) {
    return res.status(400).json({ ok: false, status: 'error', error: 'mimeType und base64 sind erforderlich' })
  }

  if (typeof base64 !== 'string' || base64.length > 2_000_000) {
    return res.status(413).json({ ok: false, status: 'error', error: 'Datei zu groß für OCR' })
  }

  try {
    if (typeof mimeType === 'string' && mimeType.startsWith('text/')) {
      const ocrText = Buffer.from(base64, 'base64').toString('utf8')
      return res.status(200).json({ ok: true, status: 'done', provider: 'native-text', ocrText })
    }

    if (typeof mimeType === 'string' && mimeType === 'application/pdf') {
      const ocrText = extractTextFromPdfBase64(base64)
      if (ocrText && ocrText.trim().length > 10) {
        return res.status(200).json({ ok: true, status: 'done', provider: 'pdf-text-layer', ocrText })
      }
      return res.status(200).json({
        ok: true,
        status: 'needs_render',
        message: 'PDF hat keine Textebene — bitte als Foto hochladen.',
      })
    }

    if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ ok: false, status: 'error', error: 'OCR gerade nicht verfügbar' })
      }
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

    return res.status(200).json({
      ok: true,
      status: 'needs_render',
      message: 'Dieses Dateiformat unterstützt kein OCR — bitte als Foto (JPG/PNG) hochladen.',
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      error: err instanceof Error ? err.message : 'OCR fehlgeschlagen',
    })
  }
}
