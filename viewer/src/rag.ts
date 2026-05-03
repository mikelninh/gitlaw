/**
 * RAG (Retrieval Augmented Generation) for GitLaw
 *
 * Flow:
 * 1. User asks a question
 * 2. RETRIEVE: Find relevant laws via keyword matching + persona context
 * 3. AUGMENT: Build context from cached explanations
 * 4. GENERATE: OpenAI answers WITH legal context
 */

import OpenAI from 'openai'
import Fuse from 'fuse.js'
import { citizenIntents, detectCitizenIntent, renderCitizenIntentAnswer } from './citizen-intents'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const PUBLIC_BASE = import.meta.env.BASE_URL || '/'

function publicPath(path: string) {
  return `${PUBLIC_BASE}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

interface LawChunk {
  law: string
  section: string
  text: string
}

interface LawIndexEntry {
  id: string
  title: string
  abbreviation: string
  file: string
}

interface SectionHint {
  lawId: string
  terms: string[]
  preferredSections: string[]
}

// Comprehensive keyword → law mapping (multiple synonyms per topic)
const topicMap: Record<string, string[]> = {
  // Miete & Wohnen
  'miete': ['bgb'], 'mietvertrag': ['bgb'], 'vermieter': ['bgb'], 'mieter': ['bgb'],
  'mieterhöhung': ['bgb'], 'mietminderung': ['bgb'], 'eigenbedarf': ['bgb'],
  'kündigung wohnung': ['bgb'], 'nebenkosten': ['bgb'], 'kaution': ['bgb'],
  'wohnung': ['bgb'], 'wohnen': ['bgb'],

  // Arbeit
  'arbeit': ['arbzg', 'kschg', 'bgb'], 'arbeitszeit': ['arbzg'], 'überstunden': ['arbzg'],
  'kündigung': ['kschg', 'bgb'], 'kündigungsschutz': ['kschg'],
  'arbeitsvertrag': ['bgb'], 'gehalt': ['bgb'], 'lohn': ['bgb'],
  'urlaub': ['bgb'], 'pause': ['arbzg'], 'ruhezeit': ['arbzg'],
  'chef': ['kschg', 'arbzg'], 'arbeitgeber': ['kschg', 'arbzg'],
  'homeoffice': ['arbzg', 'bgb'],

  // Versicherung & Gesundheit
  'krankenversicherung': ['sgb_5'], 'krankenkasse': ['sgb_5'], 'versicherung': ['sgb_5'],
  'versichern': ['sgb_5'], 'krankenversicher': ['sgb_5'], 'gesundheit': ['sgb_5'],
  'arzt': ['sgb_5'], 'krankengeld': ['sgb_5'], 'krankschreibung': ['sgb_5'],
  'zuzahlung': ['sgb_5'], 'medikament': ['sgb_5'], 'krankenhaus': ['sgb_5'],
  'krank': ['sgb_5'],

  // Rente
  'rente': ['sgb_6'], 'rentenversicherung': ['sgb_6'], 'altersrente': ['sgb_6'],
  'rentenalter': ['sgb_6'], 'frührente': ['sgb_6'], 'erwerbsminderung': ['sgb_6'],
  'rentenpunkt': ['sgb_6'], 'pension': ['sgb_6'],

  // Soziales
  'bürgergeld': ['sgb_2'], 'hartz': ['sgb_2'], 'arbeitslos': ['sgb_2'],
  'jobcenter': ['sgb_2'], 'grundsicherung': ['sgb_2'], 'sozialhilfe': ['sgb_2'],
  'sanktion': ['sgb_2'], 'regelsatz': ['sgb_2'], 'wohngeld': ['sgb_2'],
  'hinzuverdienst': ['sgb_2'], 'dazuverdienen': ['sgb_2'], 'nebenverdienst': ['sgb_2'],
  'zuverdienst': ['sgb_2'], 'nebenjob': ['sgb_2'], 'minijob': ['sgb_2'],
  'pfändung': ['sgb_2'], 'schulden': ['sgb_2'], 'vermögen': ['sgb_2'],
  'anrechnung': ['sgb_2'], 'freibetrag': ['sgb_2'], 'leistung': ['sgb_2'],
  'antrag': ['sgb_2'], 'bescheid': ['sgb_2'], 'widerspruch': ['sgb_2'],
  'maßnahme': ['sgb_2'], 'eingliederung': ['sgb_2'],
  'umschulung': ['sgb_2'], 'weiterbildung': ['sgb_2'],

  // Steuern
  'steuer': ['estg', 'ao_1977'], 'steuererklärung': ['estg', 'ao_1977'],
  'einkommensteuer': ['estg'], 'lohnsteuer': ['estg'], 'splitting': ['estg'],
  'werbungskosten': ['estg'], 'sonderausgaben': ['estg'],
  'steuerhinterziehung': ['ao_1977'], 'finanzamt': ['ao_1977', 'estg'],
  'freelancer': ['estg', 'ao_1977'], 'gewerbe': ['estg'],
  'freiberufler': ['estg'],

  // Strafrecht
  'beleidigung': ['stgb'], 'stalking': ['stgb'], 'diebstahl': ['stgb'],
  'betrug': ['stgb'], 'körperverletzung': ['stgb'], 'bedrohung': ['stgb'],
  'schwarzfahren': ['stgb'], 'sachbeschädigung': ['stgb'],
  'straftat': ['stgb', 'stpo'], 'anzeige': ['stgb', 'stpo'],
  'polizei': ['stpo', 'stgb'], 'verhaftung': ['stpo'],
  'online beleidigung': ['stgb', 'netzdg'],

  // Familie & Kinder
  'schwangerschaft': ['muschg'], 'mutterschutz': ['muschg'],
  'elternzeit': ['beeg'], 'elterngeld': ['beeg'], 'kindergeld': ['estg'],
  'unterhalt': ['bgb'], 'sorgerecht': ['bgb'], 'scheidung': ['bgb'],
  'kind': ['bgb', 'beeg'], 'familie': ['bgb', 'beeg'],

  // Tierschutz
  'tierschutz': ['tierschg'], 'tier': ['tierschg'], 'hund': ['tierschg'],
  'katze': ['tierschg'], 'tierquälerei': ['tierschg'],

  // Digital
  'internet': ['netzdg'], 'hassrede': ['netzdg', 'stgb'],
  'social media': ['netzdg'], 'online': ['netzdg', 'stgb'],
  'facebook': ['netzdg'], 'instagram': ['netzdg'], 'tiktok': ['netzdg'],

  // Gleichbehandlung
  'diskriminierung': ['agg'], 'gleichbehandlung': ['agg'],
  'benachteiligung': ['agg'], 'rassismus': ['agg', 'stgb'],

  // Aufenthalt & Migration
  'aufenthalt': ['aufenthg_2004'], 'asyl': ['aufenthg_2004', 'gg'],
  'visum': ['aufenthg_2004'], 'abschiebung': ['aufenthg_2004'],
  'aufenthaltstitel': ['aufenthg_2004'], 'migration': ['aufenthg_2004'],
  'staatsbürgerschaft': ['aufenthg_2004'],

  // Grundrechte
  'grundgesetz': ['gg'], 'grundrecht': ['gg'], 'meinungsfreiheit': ['gg'],
  'würde': ['gg'], 'demokratie': ['gg'], 'versammlungsfreiheit': ['gg'],
  'religionsfreiheit': ['gg'],

  // Gebäude
  'heizung': ['geg'], 'wärmepumpe': ['geg'], 'sanierung': ['geg'],

  // Selbstständig — maps to multiple relevant laws
  'selbstständig': ['estg', 'sgb_5', 'sgb_6', 'ao_1977'],
  'selbständig': ['estg', 'sgb_5', 'sgb_6', 'ao_1977'],
  'scheinselbstständig': ['sgb_5', 'bgb'],

  // Kauf & Vertrag
  'kaufvertrag': ['bgb'], 'gewährleistung': ['bgb'], 'reklamation': ['bgb'],
  'umtausch': ['bgb'], 'widerruf': ['bgb'], 'agb': ['bgb'],

  // Erbe
  'erbe': ['bgb'], 'testament': ['bgb'], 'erbschaft': ['bgb', 'erbstg_1974'],
  'vererben': ['bgb'],
}

// Persona → additional relevant laws
const personaLaws: Record<string, string[]> = {
  'student': ['bgb', 'stgb', 'sgb_5'],
  'arbeitnehmer': ['arbzg', 'kschg', 'bgb', 'sgb_6'],
  'selbststaendig': ['estg', 'ao_1977', 'sgb_5', 'sgb_6', 'bgb'],
  'elternteil': ['bgb', 'beeg', 'estg'],
  'alleinerziehend': ['bgb', 'beeg', 'sgb_2'],
  'rentner': ['sgb_6', 'estg', 'sgb_5'],
  'mieter': ['bgb'],
  'vermieter': ['bgb', 'estg'],
  'azubi': ['bgb', 'arbzg'],
  'migrant': ['aufenthg_2004', 'agg', 'sgb_2'],
  'schwanger': ['muschg', 'beeg', 'kschg'],
  'arbeitslos': ['sgb_2', 'sgb_5'],
}

const sectionHints: SectionHint[] = citizenIntents.map(intent => ({
  lawId: intent.sourceLawIds[0] || 'bgb',
  terms: intent.terms,
  preferredSections: intent.preferredSections,
}))

async function findRelevantChunks(question: string, persona?: string): Promise<LawChunk[]> {
  const chunks: LawChunk[] = []
  const q = question.toLowerCase()
  const matchedHints = sectionHints.filter(h => h.terms.some(term => q.includes(term)))

  // Find relevant laws by topic keywords
  const relevantLaws = new Set<string>()

  for (const [keyword, laws] of Object.entries(topicMap)) {
    if (q.includes(keyword)) {
      laws.forEach(l => relevantLaws.add(l))
    }
  }

  // Add persona-specific laws
  if (persona) {
    const pKey = Object.keys(personaLaws).find(k => persona.toLowerCase().includes(k))
    if (pKey) {
      personaLaws[pKey].forEach(l => relevantLaws.add(l))
    }
  }

  matchedHints.forEach(h => relevantLaws.add(h.lawId))

  // If still nothing, try individual words
  if (relevantLaws.size === 0) {
    const words = q.split(/\s+/)
    for (const word of words) {
      if (word.length < 3) continue
      for (const [keyword, laws] of Object.entries(topicMap)) {
        if (keyword.startsWith(word) || word.startsWith(keyword.slice(0, 4))) {
          laws.forEach(l => relevantLaws.add(l))
        }
      }
    }
  }

  // Final fallback based on persona or general
  if (relevantLaws.size === 0) {
    relevantLaws.add('gg')
    relevantLaws.add('bgb')
  }

  // Load explanations for relevant laws
  for (const lawId of relevantLaws) {
    try {
      const resp = await fetch(publicPath(`explanations/${lawId}.json`))
      if (!resp.ok) continue
      const data = await resp.json()
      for (const [section, explanation] of Object.entries(data.explanations)) {
        chunks.push({ law: data.law, section, text: explanation as string })
      }
    } catch { /* skip */ }
  }

  if (chunks.length === 0) {
    const lawIndexResp = await fetch(publicPath('law-index.json'))
    const lawIndex: LawIndexEntry[] = lawIndexResp.ok ? await lawIndexResp.json() : []
    const fallbackChunks: LawChunk[] = []

    for (const lawId of Array.from(relevantLaws).slice(0, 3)) {
      const lawMeta = lawIndex.find(l => l.id === lawId)
      if (!lawMeta) continue
      try {
        const resp = await fetch(publicPath(`laws/${lawMeta.file}`))
        if (!resp.ok) continue
        const text = await resp.text()
        const blocks = text
          .split(/\n### /g)
          .map((block, index) => index === 0 ? block : `### ${block}`)
          .filter(Boolean)
        const hintsForLaw = matchedHints
          .filter(h => h.lawId === lawId)
          .flatMap(h => h.preferredSections)
        const blockDocs = blocks.map(block => {
          const firstLine = block.split('\n')[0]?.trim() || lawMeta.title
          return {
            law: lawMeta.abbreviation || lawMeta.title,
            section: firstLine.replace(/^###\s*/, ''),
            text: block.slice(0, 1200),
          }
        })
        const hintedBlocks = hintsForLaw.length > 0
          ? blockDocs.filter(block =>
              hintsForLaw.some(section => block.section.includes(section)) ||
              matchedHints.some(h => h.lawId === lawId && h.terms.some(term => block.text.toLowerCase().includes(term))),
            )
          : []
        const blockFuse = new Fuse(blockDocs, {
          keys: ['section', 'text'],
          threshold: 0.45,
          ignoreLocation: true,
        })
        const blockMatches = blockFuse.search(question).slice(0, 3).map(r => r.item)
        const preferred = hintedBlocks.length > 0 ? hintedBlocks.slice(0, 3) : []
        const selected = [...preferred, ...blockMatches]
          .filter((item, index, arr) =>
            arr.findIndex(candidate =>
              candidate.section === item.section && candidate.law === item.law,
            ) === index,
          )
          .slice(0, 4)
        fallbackChunks.push(...(selected.length > 0 ? selected : blockDocs.slice(0, 2)))
      } catch {
        // ignore fallback law load failure
      }
    }

    if (fallbackChunks.length > 0) {
      return fallbackChunks.slice(0, 5)
    }
  }

  // Fuzzy search within chunks for most relevant
  if (chunks.length > 5) {
    const fuse = new Fuse(chunks, {
      keys: ['section', 'text'],
      threshold: 0.4,
      ignoreLocation: true,
    })
    const results = fuse.search(question)
    if (results.length > 0) {
      return results.slice(0, 5).map(r => r.item)
    }
  }

  return chunks.slice(0, 5)
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function sanitizeAssistantAnswer(answer: string, question: string): string {
  const cleaned = answer
    .split('\n')
    .filter(line => {
      const normalized = line.trim().toLowerCase()
      if (!normalized) return true
      if (normalized.startsWith('regeln:')) return false
      if (normalized.startsWith('wichtig:')) return false
      if (normalized.startsWith('gesetzliche quellen:')) return false
      if (normalized.startsWith('die person:')) return false
      if (normalized.includes('antworte basierend auf')) return false
      if (normalized.includes('max 5-6 sätze')) return false
      if (normalized.includes('dies ist keine rechtsberatung')) return false
      if (normalized === question.trim().toLowerCase()) return false
      if (normalized === `*${question.trim().toLowerCase()}*`) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return cleaned || 'Dazu habe ich leider gerade keine brauchbare Antwort gefunden. Bitte stelle die Frage etwas konkreter oder pruefe das passende Gesetz.'
}

export async function askLegalQuestion(
  question: string,
  persona?: string,
  history: ChatMessage[] = []
): Promise<{
  answer: string
  sources: { law: string; section: string }[]
}> {
  const detectedIntent = detectCitizenIntent(question)
  if (detectedIntent) {
    return {
      answer: renderCitizenIntentAnswer(detectedIntent),
      sources: detectedIntent.sources,
    }
  }

  // Search using the full conversation context for better retrieval
  const allText = [question, ...history.map(m => m.content)].join(' ')
  const chunks = await findRelevantChunks(allText, persona)
  const context = chunks.map(c =>
    `[${c.law} — ${c.section}]\n${c.text}`
  ).join('\n\n---\n\n')
  const sources = chunks.map(c => ({ law: c.law, section: c.section }))

  // If no local API key, use Vercel serverless API (free, secure)
  if (!API_KEY) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
      const resp = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          persona,
          context,
          sources,
          history: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        return {
          answer: sanitizeAssistantAnswer(data.answer || '', question),
          sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : sources,
        }
      }
    } catch { /* fallback below */ }

    return {
      answer: 'Der Rechts-Chat ist gerade nicht verfügbar. Bitte versuche es später erneut oder nutze die Musterbriefe und Erklärungen.',
      sources: [],
    }
  }

  const client = new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true })

  const personaContext = persona
    ? `\n\nDie Person die fragt: ${persona}. Beziehe dich konkret auf ihre Situation.`
    : ''

  // Build conversation messages
  const messages: {role: 'system' | 'user' | 'assistant'; content: string}[] = [
    {
      role: 'system',
      content: `Du bist ein freundlicher Rechtsberater der Fragen zum deutschen Recht beantwortet.

WICHTIG:
- Antworte NUR basierend auf den bereitgestellten Gesetzestexten
- Wenn die Quellen die Frage nicht beantworten, sag ehrlich: "Dazu habe ich leider keine passenden Gesetzestexte."
- Erfinde KEINE Paragraphen
- Nenne immer die relevanten Paragraphen aus den Quellen
- Erkläre einfach und verständlich
- Bei Folgefragen: beziehe dich auf den bisherigen Gesprächsverlauf
- Maximal 5-6 Sätze${personaContext}

GESETZLICHE QUELLEN:
${context || 'Keine passenden Quellen gefunden.'}`
      },
      // Include conversation history
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: question }
    ]

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 400,
    temperature: 0.2,
  })

  return {
    answer: sanitizeAssistantAnswer(resp.choices[0]?.message?.content || 'Keine Antwort möglich.', question),
    sources,
  }
}
