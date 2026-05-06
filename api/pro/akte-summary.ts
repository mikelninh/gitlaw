/**
 * Vercel Serverless Function — Akte zusammenfassen (Pro-Tier)
 *
 * Fasst den Fakten-Stand einer Akte in 4-8 Sätzen zusammen.
 * Keine Rechtsberatung, keine Prognosen — nur Fakten aus dem übergebe­nen
 * anonymisierten Kontext.
 *
 * System-Prompt mit expliziten Tabus gem. §14 Piloten-Anforderungen.
 * Anonymisierung läuft client-seitig (viewer/src/pro/anonymize.ts) bevor
 * der Request hier ankommt.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'

const AKTE_SUMMARY_SYSTEM_PROMPT = `Du bist ein Recherche-Assistent für eine deutsche Anwaltskanzlei. Fasse die folgende Akte sachlich in 4-8 Sätzen zusammen.

WICHTIG: Du machst KEINE rechtlichen Erfolgsprognosen, KEINE verbindliche rechtliche Beratung, KEINE Fristenbewertung in komplexen Fällen, KEINE strategischen Verfahrensentscheidungen, KEINE Kommunikation mit Gerichten oder Behörden, KEINE Bewertung strafrechtlicher Risiken.

Du fasst nur den FAKTEN-Stand zusammen — was liegt vor, was fehlt, welcher Status, welche nächste Frist.

Sprache: respektvoll-warm Deutsch.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI key not configured' })
  }

  const { akteContext, kanzleiContext } = req.body as {
    akteContext?: unknown
    kanzleiContext?: unknown
  }

  if (!akteContext || typeof akteContext !== 'string') {
    return res.status(400).json({ error: 'akteContext (string) required' })
  }

  const systemPrompt = kanzleiContext && typeof kanzleiContext === 'string'
    ? `${AKTE_SUMMARY_SYSTEM_PROMPT}\n\nKanzlei-Kontext: ${kanzleiContext.slice(0, 200)}`
    : AKTE_SUMMARY_SYSTEM_PROMPT

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: akteContext },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    })

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      return res.status(502).json({ error: 'Empty LLM response' })
    }

    return res.status(200).json({ summary })
  } catch (err) {
    return res.status(500).json({
      error: 'OpenAI request failed',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }
}
