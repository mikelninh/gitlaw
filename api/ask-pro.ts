/**
 * Vercel Serverless Function — Pro-Tier RAG endpoint with structured output.
 *
 * OpenAI key stays server-side so the Pro frontend doesn't need VITE_OPENAI_API_KEY
 * in the browser bundle.
 *
 * Returns: { antwort: string, zitate: Array<{paragraph, gesetz, bedeutung}> }
 *
 * Dynamic prompt context (optional):
 *   - `lawyerProfile.practiceArea`   — e.g. "Mietrecht", "Familienrecht", "Steuerrecht"
 *   - `lawyerProfile.jurisdictionFocus` — e.g. "BY", "NRW", or omitted for nationwide
 *   - `lawyerProfile.citationStyle`  — "knapp" (default) | "ausführlich"
 *   - `lawyerProfile.firmContext`    — one-line extra context ("Kanzlei für Opferhilfe")
 *
 * Absent `lawyerProfile`, the prompt reduces to the legacy generic lawyer prompt —
 * so existing clients keep working unchanged.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from './_auth'
import { applyCors, applySecurityHeaders } from './_http'

// ── Base (static) prompt ─────────────────────────────────────

const BASE_PRO_PROMPT = `Du bist juristische Recherche-Assistenz für eine deutsche Rechtsanwältin oder einen deutschen Rechtsanwalt.

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

// ── Dynamic-prompt types + builder ────────────────────────────

export type LawyerProfile = {
  practiceArea?: string       // freie Textangabe: "Mietrecht", "Familienrecht", ...
  jurisdictionFocus?: string  // ISO-Länder- oder Bundesland-Kürzel ("DE", "BY", "NRW")
  citationStyle?: 'knapp' | 'ausführlich'
  firmContext?: string        // eine Zeile, z.B. "Kanzlei für Migrationsrecht seit 2012"
}

type ApprovedAnswerMemory = {
  question: string
  approvedAnswer: string
}

/**
 * Build the system prompt for a specific lawyer. Falls through to the base
 * prompt when no profile fields are set — preserves legacy behaviour.
 */
export function buildProSystemPrompt(profile?: LawyerProfile | null): string {
  if (!profile) return BASE_PRO_PROMPT

  const hints: string[] = []

  if (profile.practiceArea) {
    hints.push(`• Schwerpunkt der Anfragenden: ${profile.practiceArea}. Priorisiere diese Perspektive.`)
  }
  if (profile.jurisdictionFocus && profile.jurisdictionFocus !== 'DE') {
    hints.push(`• Regionaler Fokus: ${profile.jurisdictionFocus} — erwähne länder-/Bundesland-spezifische Besonderheiten.`)
  }
  if (profile.citationStyle === 'ausführlich') {
    hints.push('• Zitier-Stil: ausführlich — pro Paragraph 2–3 Sätze Relevanz im "bedeutung"-Feld.')
  } else {
    hints.push('• Zitier-Stil: knapp — im "bedeutung"-Feld höchstens ein Halbsatz pro Paragraph.')
  }
  if (profile.firmContext) {
    hints.push(`• Kontext: ${sanitize(profile.firmContext)}`)
  }

  if (hints.length === 0) return BASE_PRO_PROMPT
  return `${BASE_PRO_PROMPT}\n\nKONTEXT DIESES PROFILS\n${hints.join('\n')}`
}

function buildMemoryPrompt(memory?: ApprovedAnswerMemory[]): string {
  if (!memory || memory.length === 0) return ''
  return '\n\nKANZLEI-INTERNER ERFAHRUNGSSCHATZ\n' +
    memory.slice(0, 3).map((m, i) =>
      `Beispiel ${i + 1}\nFrage: ${sanitize(m.question)}\nFreigegebene Antwort: ${sanitize(m.approvedAnswer)}`
    ).join('\n\n') +
    '\n\nNutze diese Beispiele nur wenn sie sachlich zur aktuellen Frage passen.'
}

/** Strip newlines + collapse whitespace so injected user-strings can't split the prompt structure. */
function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

// ── JSON Schema (unchanged) ───────────────────────────────────

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

// ── Handler ───────────────────────────────────────────────────

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

  const { question, lawyerProfile } = req.body as {
    question?: unknown
    lawyerProfile?: LawyerProfile
    approvedMemory?: ApprovedAnswerMemory[]
  }

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question (string) required' })
  }

  const systemPrompt =
    buildProSystemPrompt(lawyerProfile) +
    `\n\nTENANT-KONTEXT\n• tenantId: ${session.tenantId}\n• role: ${session.role}` +
    buildMemoryPrompt(req.body?.approvedMemory)

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
