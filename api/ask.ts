/**
 * Vercel Serverless Function — RAG endpoint
 *
 * OpenAI key stays server-side (secure).
 * Free on Vercel Hobby plan (100K invocations/month).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI key not configured' })
  }

  const { question, persona, history } = req.body

  if (!question) {
    return res.status(400).json({ error: 'Question required' })
  }

  // Build persona context
  const personas: Record<string, string> = {
    student: 'Student/in, jung, wenig Einkommen',
    arbeitnehmer: 'Angestellt, Vollzeit',
    selbststaendig: 'Selbstständig/Freelancer',
    elternteil: 'Verheiratet mit Kindern',
    alleinerziehend: 'Alleinerziehend',
    rentner: 'Im Ruhestand, 65+',
    mieter: 'Mieter/in einer Wohnung',
    vermieter: 'Vermieter/in',
    azubi: 'In der Berufsausbildung',
    migrant: 'Nicht-deutsche Staatsangehörigkeit, lebt in DE',
    schwanger: 'Schwanger oder Mutter',
    arbeitslos: 'Arbeitsuchend, Bürgergeld',
  }

  const personaText = persona && personas[persona]
    ? `\n\nDie Person: ${personas[persona]}. Beziehe dich auf ihre Situation.`
    : ''

  // Load relevant pre-cached explanations based on keywords
  // (Serverless can't use FAISS, so we use keyword matching + OpenAI)
  const messages: Array<{role: string; content: string}> = [
    {
      role: 'system',
      content: `Du bist ein freundlicher Rechtsberater für deutsches Recht.

REGELN:
- Antworte basierend auf deinem Wissen über deutsche Bundesgesetze
- Nenne immer die relevanten Paragraphen (Gesetz + §)
- Erkläre einfach und verständlich
- Gib ein konkretes Alltagsbeispiel
- Max 5-6 Sätze
- Sage ehrlich wenn du dir unsicher bist
- Dies ist KEINE Rechtsberatung${personaText}`
    }
  ]

  // Add conversation history
  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-6)) { // Last 6 messages for context
      messages.push({ role: msg.role, content: msg.content || msg.text })
    }
  }

  messages.push({ role: 'user', content: question })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 400,
        temperature: 0.2,
      }),
    })

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || 'Keine Antwort möglich.'

    return res.status(200).json({
      answer,
      sources: [], // Serverless version doesn't have FAISS — sources come from the AI's knowledge
    })
  } catch (error) {
    return res.status(500).json({ error: 'OpenAI request failed' })
  }
}
