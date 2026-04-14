/**
 * Vercel Serverless Function — Pro-Tier RAG endpoint with structured output.
 *
 * Same JSON Schema that the frontend uses. Keeps the OpenAI key server-side
 * so the Pro frontend doesn't need VITE_OPENAI_API_KEY in the browser bundle.
 *
 * Returns: { antwort: string, zitate: Array<{paragraph, gesetz, bedeutung}> }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const PRO_SYSTEM_PROMPT = `Du bist juristische Recherche-Assistenz für eine deutsche Rechtsanwältin oder einen deutschen Rechtsanwalt.

AUFGABE
• Beantworte die Rechtsfrage knapp, präzise, professionell.
• Strukturiere: einschlägige Tatbestände → kurze Prüfung → ggf. prozessuale Hinweise.
• Kollegial, sachlich, ohne Mandant:innen-Ansprache. Maximal 10 Sätze Fließtext.
• Fülle das Feld "zitate" mit jedem Paragraphen, den du im Fließtext genannt hast: reine Paragraphennummer (z. B. "238", "184i", "573"), Gesetzesabkürzung (z. B. "StGB", "BGB", "SGB V"), und eine knappe Relevanzbeschreibung.

WICHTIG
• Zitiere nur Paragraphen, die du sicher kennst. Erfinde keine Normen.
• Wenn unsicher, schreibe im Fließtext "unsicher, mutmaßlich § X" und nimm den Paragraphen trotzdem ins Zitat-Array auf — die Antwort wird anwaltlich gegengeprüft.
• Dies ist KEINE Rechtsberatung, sondern Recherche-Unterstützung.
• Gesetz-Abkürzung in "zitate.gesetz" IMMER ohne "§"-Zeichen und ohne Paragraphennummer — nur die Abkürzung (Beispiel: "StGB", nicht "§ 238 StGB").`

const PRO_JSON_SCHEMA = {
  name: 'rechtsrecherche_antwort',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      antwort: { type: 'string' },
      zitate: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            paragraph: { type: 'string' },
            gesetz: { type: 'string' },
            bedeutung: { type: 'string' },
          },
          required: ['paragraph', 'gesetz', 'bedeutung'],
        },
      },
    },
    required: ['antwort', 'zitate'],
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI key not configured' })
  }

  const { question } = req.body
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question (string) required' })
  }

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
          { role: 'system', content: PRO_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_schema', json_schema: PRO_JSON_SCHEMA },
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return res.status(502).json({ error: 'Empty LLM response' })
    }

    try {
      const parsed = JSON.parse(content)
      return res.status(200).json(parsed)
    } catch {
      return res.status(502).json({ error: 'LLM returned invalid JSON', raw: content.slice(0, 300) })
    }
  } catch (err) {
    return res.status(500).json({
      error: 'OpenAI request failed',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }
}
