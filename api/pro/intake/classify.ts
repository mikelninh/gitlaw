/**
 * Vercel Serverless Function — Pro intake document classifier.
 *
 * Pipeline: serverDocumentId → OCR (reusing the same logic shape as /api/ocr)
 * → structured-output LLM classification → returns {doc_type, document_date,
 * parties, sender, recipient, aktenzeichen, summary_de, suggested_filename,
 * confidence, needs_review, ocr_text}.
 *
 * The frontend uploads files via /api/pro/upload, then POSTs each documentId
 * to this endpoint. Frontend parallelism gives streaming per-file progress;
 * server-side fan-out would hide it.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../../_auth'
import { applyCors, applySecurityHeaders } from '../../_http'
import { z } from 'zod'
import { chat, chatJSON, LLMValidationError } from '../../_llm'

const redis = Redis.fromEnv()

// ── OCR helpers (mirror /api/ocr.ts; intentionally duplicated rather than
// extracted into a shared module to keep this endpoint self-contained for the
// MVP — refactor when a third call site appears). ────────────────────────────

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
  for (const match of binary.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)) {
    const decoded = decodePdfEscapes(match[1]).trim()
    if (decoded && /[A-Za-zÄÖÜäöüß0-9]/.test(decoded)) pieces.push(decoded)
  }
  for (const match of binary.matchAll(/<([0-9A-Fa-f\s]{6,})>/g)) {
    const hex = match[1].replace(/\s+/g, '')
    if (hex.length % 2 !== 0) continue
    try {
      const decoded = Buffer.from(hex, 'hex').toString('utf8').trim()
      if (decoded && /[A-Za-zÄÖÜäöüß0-9]/.test(decoded)) pieces.push(decoded)
    } catch {
      // ignore
    }
  }
  return pieces.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}


async function runOcr(mimeType: string, base64: string): Promise<string> {
  if (mimeType.startsWith('text/')) {
    return Buffer.from(base64, 'base64').toString('utf8')
  }
  if (mimeType === 'application/pdf') {
    const text = extractTextFromPdfBase64(base64)
    if (text) return text
    // Scanned PDFs without a text layer aren't supported in MVP — caller
    // surfaces this as needs_review.
    return ''
  }
  if (mimeType.startsWith('image/')) {
    const dataUrl = `data:${mimeType};base64,${base64}`
    const { content } = await chat(
      [
        {
          role: 'system',
          content:
            'Du transkribierst deutsche Dokumente (Briefe, Bescheide, E-Mails, Screenshots). Gib den Text 1:1 wieder, ohne Zusammenfassung. Erhalte Absätze, Datumsangaben und Aktenzeichen exakt.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transkribiere dieses Dokument als reinen Text.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      { max_tokens: 1600, temperature: 0.1 },
    )
    return content
  }
  return ''
}

// ── Classification ───────────────────────────────────────────────────────────

const CLASSIFY_SCHEMA = {
  name: 'dokument_klassifikation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      doc_type: {
        type: 'string',
        enum: [
          'Brief',
          'Email',
          'Bescheid',
          'Mahnung',
          'Klage',
          'Vertrag',
          'Rechnung',
          'Foto',
          'Screenshot',
          'Sonstiges',
        ],
      },
      document_date: { type: ['string', 'null'], description: 'ISO-8601 (YYYY-MM-DD) oder null wenn nicht erkennbar' },
      sender: { type: ['string', 'null'], description: 'Absender (Person, Firma, Behörde) oder null' },
      recipient: { type: ['string', 'null'], description: 'Empfänger oder null' },
      parties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Alle erkennbaren Parteien/Beteiligten (Personen oder Firmen)',
      },
      aktenzeichen: { type: ['string', 'null'], description: 'Aktenzeichen wenn vorhanden, sonst null' },
      summary_de: { type: 'string', description: '1–2 nüchterne Sätze: was ist das Dokument, worum geht es' },
      suggested_filename: {
        type: 'string',
        description:
          'Format: YYYY-MM-DD_Absender-kurz_DocType (ohne Dateiendung, ohne Sonderzeichen außer Bindestrich/Unterstrich). Bei unbekanntem Datum: 0000-00-00.',
      },
      confidence: { type: 'number', description: '0.0 – 1.0' },
      needs_review: {
        type: 'boolean',
        description: 'true wenn Datum/Absender/Typ unsicher oder OCR-Qualität niedrig',
      },
    },
    required: [
      'doc_type',
      'document_date',
      'sender',
      'recipient',
      'parties',
      'aktenzeichen',
      'summary_de',
      'suggested_filename',
      'confidence',
      'needs_review',
    ],
  },
}

const ClassificationSchema = z.object({
  doc_type: z.enum([
    'Brief', 'Email', 'Bescheid', 'Mahnung', 'Klage',
    'Vertrag', 'Rechnung', 'Foto', 'Screenshot', 'Sonstiges',
  ]),
  document_date: z.string().nullable(),
  sender: z.string().nullable(),
  recipient: z.string().nullable(),
  parties: z.array(z.string()),
  aktenzeichen: z.string().nullable(),
  summary_de: z.string(),
  suggested_filename: z.string(),
  confidence: z.number().min(0).max(1),
  needs_review: z.boolean(),
})

const CLASSIFY_SYSTEM_PROMPT = `Du bist Triage-Assistenz für eine deutsche Anwaltskanzlei.

Eingabe: der OCR-Text eines einzelnen Dokuments (Brief, Bescheid, Email, Mahnung, Foto/Screenshot, etc.).

Aufgabe: extrahiere strukturierte Metadaten, damit die Anwält:in das Mandat sofort sortieren kann.

REGELN
- Datum: bevorzuge das Dokumentdatum (oben rechts bei Briefen, Header bei Emails). Format YYYY-MM-DD. Wenn nicht erkennbar: null.
- Absender / Empfänger: vollständiger Name oder Firmenname. Bei Behörden den offiziellen Namen ("Amtsgericht München", nicht "AG München").
- Aktenzeichen: regex-mäßig erkennen (z.B. "12 C 345/24", "AZ: 4711-2024", "VG-2024-001"). Wenn nicht vorhanden: null.
- Parteien: alle Personen/Firmen, die im Dokument als Beteiligte vorkommen — Mandant, Gegner, Gericht, Behörde.
- suggested_filename: knapp und eindeutig. Beispiel: "2024-08-12_Amtsgericht-Muenchen_Bescheid". Title-Case (erster Buchstabe groß, Rest klein), keine Umlaute (ae/oe/ue/ss), keine Leerzeichen (Bindestrich statt), keine Dateiendung. NIEMALS ALL-CAPS.
- doc_type: wähle den präzisesten Wert aus dem Schema. WhatsApp / SMS / iMessage / Telegram / Signal-Chats und Smartphone-Display-Aufnahmen sind IMMER "Screenshot", nicht "Sonstiges". Fotos eines physischen Briefes sind "Brief" (oder spezifischer Bescheid/Mahnung etc.) — der Träger ist egal, der Inhalt zählt. "Sonstiges" nur wenn wirklich unklar.
- summary_de: 1–2 sachliche Sätze. Keine Bewertung, keine juristische Einordnung.
- needs_review = true, wenn (a) Datum oder Absender unsicher, (b) OCR-Text kürzer als ~80 Zeichen, (c) doc_type "Sonstiges", (d) confidence < 0.7.
- confidence: ehrlich. Schlechte Scans / wenig Text → niedrig.

Wenn der OCR-Text leer oder unbrauchbar ist: doc_type="Sonstiges", confidence=0.1, needs_review=true, summary_de="OCR konnte keinen Text extrahieren — bitte manuell prüfen."`

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Document vault not configured' })
  }

  const { serverDocumentId } = (req.body || {}) as { serverDocumentId?: string }
  if (!serverDocumentId || typeof serverDocumentId !== 'string') {
    return res.status(400).json({ error: 'serverDocumentId required' })
  }

  const docKey = `proDoc:${session.tenantId}:${serverDocumentId.trim()}`
  const payload = await redis.get<{ mimeType: string; base64: string; fileName?: string }>(docKey)
  if (!payload) return res.status(404).json({ error: 'Server document not found' })

  try {
    const ocrText = await runOcr(payload.mimeType, payload.base64)

    if (!ocrText || ocrText.trim().length < 5) {
      return res.status(200).json({
        ok: true,
        serverDocumentId,
        fileName: payload.fileName || null,
        mimeType: payload.mimeType,
        ocr_text: ocrText,
        classification: {
          doc_type: 'Sonstiges',
          document_date: null,
          sender: null,
          recipient: null,
          parties: [],
          aktenzeichen: null,
          summary_de:
            payload.mimeType === 'application/pdf'
              ? 'PDF ohne extrahierbare Textebene (vermutlich Scan) — bitte manuell sichten.'
              : 'Kein Text erkannt — bitte manuell sichten.',
          suggested_filename: `0000-00-00_Unbekannt_Sonstiges`,
          confidence: 0.1,
          needs_review: true,
        },
      })
    }

    // Truncate very long OCR to keep token use bounded — first ~6000 chars covers
    // the typical Brief/Bescheid header + body comfortably.
    const trimmed = ocrText.length > 6000 ? ocrText.slice(0, 6000) : ocrText

    try {
      const { data: classification } = await chatJSON(
        ClassificationSchema,
        [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: `Dateiname (Hinweis, kann irreführend sein): ${payload.fileName || 'unbekannt'}\n\nOCR-Text:\n${trimmed}` },
        ],
        {
          max_tokens: 600,
          temperature: 0.1,
          response_format: { type: 'json_schema', json_schema: CLASSIFY_SCHEMA },
          route: 'pro.intake.classify',
        },
      )

      return res.status(200).json({
        ok: true,
        serverDocumentId,
        fileName: payload.fileName || null,
        mimeType: payload.mimeType,
        ocr_text: ocrText,
        classification,
      })
    } catch (err) {
      if (err instanceof LLMValidationError) {
        return res.status(502).json({ error: 'LLM returned invalid JSON', raw: err.raw.slice(0, 200), request_id: err.request_id })
      }
      throw err
    }
  } catch (err) {
    return res.status(500).json({
      error: 'Classification failed',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }
}
