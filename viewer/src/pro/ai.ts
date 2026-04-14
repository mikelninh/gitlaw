/**
 * Pro-tier LLM call with *structured outputs*.
 *
 * Lesson from SafeVoice: regex-extracting paragraph citations from free
 * prose is fragile (edge cases: "§ 238 Abs. 1 Nr. 1, 2, 5 StGB",
 * "§§ 543 Abs. 2 Nr. 3, 569 BGB"). Instead we ask the LLM to return a
 * typed JSON object with a structured citation array. OpenAI's JSON
 * Schema mode guarantees the shape.
 *
 *   {
 *     antwort: "...",
 *     zitate: [{ paragraph: "238", gesetz: "StGB", bedeutung: "..." }, ...]
 *   }
 *
 * We then just look up (gesetz → file, paragraph → heading) — no regex
 * for extraction, only for the heading match inside the file.
 *
 * Fallback: if no VITE_OPENAI_API_KEY is set (prod without a Pro API
 * endpoint deployed yet), we call /api/ask-pro which wraps the same
 * schema server-side.
 */

import OpenAI from 'openai'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

export interface ProCitation {
  /** Bare paragraph number including letter suffixes, e.g. "238", "184i". */
  paragraph: string
  /** Law abbreviation, e.g. "StGB", "BGB", "SGB V". */
  gesetz: string
  /** 1-2 sentence relevance for why this § was cited. */
  bedeutung: string
}

export interface ProAnswer {
  antwort: string
  zitate: ProCitation[]
}

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
      antwort: {
        type: 'string',
        description: 'Knappe juristische Analyse, kollegialer Ton, maximal 10 Sätze.',
      },
      zitate: {
        type: 'array',
        description: 'Jeder im Fließtext zitierte Paragraph — strukturiert für maschinelle Verifikation.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            paragraph: {
              type: 'string',
              description: 'Reine §-Nummer inkl. Buchstaben-Suffix, ohne "§"-Zeichen. Beispiele: "238", "184i", "573".',
            },
            gesetz: {
              type: 'string',
              description: 'Gesetzesabkürzung ohne § oder Nummer. Beispiele: "StGB", "BGB", "SGB V", "NetzDG".',
            },
            bedeutung: {
              type: 'string',
              description: '1-2 Sätze: warum dieser Paragraph einschlägig ist.',
            },
          },
          required: ['paragraph', 'gesetz', 'bedeutung'],
        },
      },
    },
    required: ['antwort', 'zitate'],
  },
}

export async function proAsk(question: string): Promise<ProAnswer> {
  // Preferred path: direct OpenAI call with structured outputs.
  if (API_KEY) {
    const client = new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true })
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PRO_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: 'json_schema', json_schema: PRO_JSON_SCHEMA },
    })
    const content = resp.choices[0]?.message?.content
    if (!content) throw new Error('Leere Antwort vom Modell.')
    try {
      return JSON.parse(content) as ProAnswer
    } catch {
      throw new Error('Antwort ist kein valides JSON: ' + content.slice(0, 200))
    }
  }

  // Fallback: serverless /api/ask-pro (same schema enforced server-side).
  const resp = await fetch(`${API_URL}/api/ask-pro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!resp.ok) {
    throw new Error(`KI-Service nicht erreichbar (HTTP ${resp.status}). Bitte später erneut.`)
  }
  return (await resp.json()) as ProAnswer
}

export const EXAMPLE_QUESTIONS = [
  'Welche Tatbestände kommen bei wiederholten Drohnachrichten via Instagram-DM in Betracht?',
  'Wann ist eine fristlose Kündigung des Mietverhältnisses wegen Zahlungsverzugs zulässig?',
  'Welche Verjährungsfristen gelten für Schadensersatzansprüche aus § 823 BGB?',
  'Frist für Widerspruch gegen einen ALG-II-Bescheid und Form?',
  'Welche §§ StGB greifen bei Deepfake-Pornografie ohne Einwilligung?',
  'Pflichten der Arbeitgeberin bei Kündigung während der Schwangerschaft?',
]
