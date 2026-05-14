/**
 * Central LLM gateway for all Vercel serverless functions.
 *
 * All OpenAI calls go through here. Provider-switch later:
 *   if (process.env.LLM_PROVIDER === 'azure') { ... }
 *
 * Currently wired to OpenAI directly (EU-migration pending AVV with Bao).
 */

import type { VercelResponse } from '@vercel/node'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<Record<string, unknown>>
}

export type ChatOptions = {
  model?: string
  max_tokens?: number
  temperature?: number
  response_format?: Record<string, unknown>
}

export type ChatResult = {
  content: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const OPENAI_BASE = 'https://api.openai.com/v1'

function getApiKey(res?: VercelResponse): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    if (res) res.status(500).json({ error: 'OpenAI key not configured' })
    throw new Error('OpenAI key not configured')
  }
  return key
}

/**
 * Call chat completions and return { content, usage }.
 * Throws on HTTP error or empty response.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const apiKey = getApiKey()
  const {
    model = DEFAULT_MODEL,
    max_tokens,
    temperature = 0.2,
    response_format,
  } = options

  const body: Record<string, unknown> = { model, messages, temperature }
  if (max_tokens !== undefined) body.max_tokens = max_tokens
  if (response_format !== undefined) body.response_format = response_format

  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!response.ok || !content) {
    throw new Error(data?.error?.message || `LLM error (HTTP ${response.status})`)
  }

  return { content: String(content).trim(), usage: data.usage }
}
