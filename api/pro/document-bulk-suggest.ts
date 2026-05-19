/**
 * POST /api/pro/document-bulk-suggest
 *
 * AI-Vorprüfung aller pending Mandant-Uploads einer Akte. Bao bekommt pro Doc
 * eine Empfehlung (approve / review-manually / reject) + Confidence + Reason.
 * Reduziert 11 Einzel-Klicks auf "Alle KI ≥80% übernehmen" + manuelle Reste.
 *
 * Body:   { caseId: string }
 * Auth:   requireProSession(req, res, 'assistenz')
 * Rate:   RATE_WRITE  — ein Call = bis zu N Anthropic-Requests
 *
 * Modell: claude-haiku-4-5 (per fetch, kein SDK)
 * Fallback: wenn ANTHROPIC_API_KEY fehlt → alle Items als 'review-manually'
 *           mit confidence=0 zurückgeben statt 500.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from '../_auth'
import { requireDb } from '../_db'
import { applyRateLimit, RATE_WRITE, ipUserKey } from '../_ratelimit'
import { applyCors, applySecurityHeaders } from '../_http'

const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const CONCURRENCY = 6

interface PendingDoc {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checklistItemId: string | null
}

interface Suggestion {
  docId: string
  suggestedAction: 'approve' | 'review-manually' | 'reject'
  confidence: number
  reason: string
  matchesChecklist: boolean
  checklistLabel: string | null
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ matchesChecklist: boolean; confidence: number; suggestedAction: 'approve' | 'review-manually' | 'reject'; reason: string } | null> {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt + '\n\nAntworte AUSSCHLIESSLICH mit gültigem JSON, kein Markdown, kein Prosa. Schema: {"matchesChecklist": boolean, "confidence": number zwischen 0 und 1, "suggestedAction": "approve" | "review-manually" | "reject", "reason": string (max 200 Zeichen, deutsch)}',
          },
        ],
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.warn('[bulk-suggest] Anthropic-Fehler:', res.status, txt.slice(0, 200))
      return null
    }
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(c => c.type === 'text')?.text ?? ''
    // JSON aus dem Text extrahieren (auch wenn Modell Markdown-Fences einfügt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0
    const action = parsed.suggestedAction
    const validAction = (action === 'approve' || action === 'reject' || action === 'review-manually')
      ? action
      : 'review-manually'
    return {
      matchesChecklist: Boolean(parsed.matchesChecklist),
      confidence,
      suggestedAction: validAction,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 240) : '',
    }
  } catch (err) {
    console.warn('[bulk-suggest] Call fehlgeschlagen:', (err as Error).message)
    return null
  }
}

async function processInChunks<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size)
    const results = await Promise.all(chunk.map(fn))
    out.push(...results)
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const allowed = await applyRateLimit(req, res, RATE_WRITE, ipUserKey(req, session.userId))
  if (!allowed) return

  const sql = requireDb(res)
  if (!sql) return

  const { caseId } = (req.body ?? {}) as { caseId?: string }
  if (!caseId || typeof caseId !== 'string') {
    return res.status(400).json({ error: 'caseId fehlt' })
  }

  // Tenant-Guard: Akte gehört zur Kanzlei
  const caseRows = await sql`
    SELECT c.id, c.mandatsart_id AS "mandatsartId"
    FROM cases c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = ${caseId}
      AND t.slug = ${session.tenantId}
      AND c.deleted_at IS NULL
    LIMIT 1
  `
  if (caseRows.length === 0) {
    return res.status(404).json({ error: 'Akte nicht gefunden' })
  }
  const caseRow = caseRows[0] as { id: string; mandatsartId: string | null }

  // Pending Mandant-Uploads laden
  const docs = await sql`
    SELECT
      id,
      original_name AS "originalName",
      mime_type AS "mimeType",
      size_bytes AS "sizeBytes",
      checklist_item_id AS "checklistItemId"
    FROM case_documents
    WHERE case_id = ${caseId}
      AND deleted_at IS NULL
      AND uploaded_by = 'mandant'
      AND (review_status IS NULL OR review_status = 'pending')
    ORDER BY uploaded_at ASC
  ` as unknown as PendingDoc[]

  if (docs.length === 0) {
    return res.status(200).json({ items: [], count: 0, hasAi: Boolean(process.env.ANTHROPIC_API_KEY) })
  }

  // Checklist-Labels aus Postgres holen falls vorhanden (für besseren Prompt-Context)
  // Note: Labels sind im Frontend in mandatsart-checklists.ts hardcoded; im Backend
  // haben wir sie nicht. Wir nutzen checklistItemId als Hint und das Frontend füllt
  // den Label-Text vor Anzeige selbst nach.
  const labelByItemId = new Map<string, string>()
  // Falls Frontend Labels mitschickt, könnten wir die hier auflösen — aktuell nicht.

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Graceful fallback — kein Server-500, UI zeigt manuell-prüfen
    const items: Suggestion[] = docs.map(d => ({
      docId: d.id,
      suggestedAction: 'review-manually',
      confidence: 0,
      reason: 'KI-Vorprüfung nicht konfiguriert (ANTHROPIC_API_KEY fehlt). Bitte alle Docs manuell prüfen.',
      matchesChecklist: false,
      checklistLabel: d.checklistItemId ? (labelByItemId.get(d.checklistItemId) ?? null) : null,
    }))
    return res.status(200).json({ items, count: items.length, hasAi: false })
  }

  const system =
    'Du bist juristische Assistenz für Bao, einen Migrationsanwalt in Berlin. ' +
    'Du bewertest, ob ein vom Mandant hochgeladenes Dokument plausibel zu einem Checklist-Item gehört. ' +
    'Du kannst die Datei NICHT inhaltlich sehen — bewerte nur aus Filename, Mime-Type und Größe. ' +
    'Sei vorsichtig: bei Unsicherheit "review-manually". Nur "approve" wenn Filename SEHR klar passt ' +
    'und Mime+Size plausibel (z.B. Bild >50KB, PDF >10KB). "reject" nur bei klarem Mismatch ' +
    '(z.B. Bewerbungsfoto-Item aber 5MB-PDF, oder Filename völlig off-topic). ' +
    'Antworte auf Deutsch, knapp, fachlich.'

  const items: Suggestion[] = await processInChunks(docs, CONCURRENCY, async (d) => {
    const label = d.checklistItemId
      ? `Pflicht-Checkliste-Item-ID: '${d.checklistItemId}'`
      : 'Kein Checkliste-Item zugeordnet (Mandant hat freihändig hochgeladen)'
    const user =
      `${label}\n` +
      `Filename: '${d.originalName}'\n` +
      `Mime-Type: '${d.mimeType}'\n` +
      `Größe: ${d.sizeBytes} bytes (${Math.round(d.sizeBytes / 1024)} KB)\n\n` +
      `Passt dieses Dokument vermutlich zum Checklist-Item?`
    const result = await callAnthropic(apiKey, system, user)
    if (!result) {
      return {
        docId: d.id,
        suggestedAction: 'review-manually' as const,
        confidence: 0,
        reason: 'KI-Antwort konnte nicht geparst werden — bitte manuell prüfen.',
        matchesChecklist: false,
        checklistLabel: null,
      }
    }
    return {
      docId: d.id,
      suggestedAction: result.suggestedAction,
      confidence: result.confidence,
      reason: result.reason,
      matchesChecklist: result.matchesChecklist,
      checklistLabel: null,
    }
  })

  // Hint für Audit-Trail (nicht persistiert, nur Log)
  console.warn('[bulk-suggest] Akte:', caseId, 'Tenant:', session.tenantId, 'User:', session.userId,
    'Suggestions:', items.map(i => `${i.docId.slice(0,8)}=${i.suggestedAction}@${i.confidence.toFixed(2)}`).join(','),
    'Mandatsart:', caseRow.mandatsartId ?? 'unset')

  return res.status(200).json({ items, count: items.length, hasAi: true })
}
