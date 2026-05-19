/**
 * Central LLM gateway for all Vercel serverless functions.
 *
 * All OpenAI calls go through here. Provider-switch later:
 *   if (process.env.LLM_PROVIDER === 'azure') { ... }
 *
 * Currently wired to OpenAI directly (EU-migration pending AVV with Bao).
 */

import crypto from 'node:crypto'
import type { VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { logger } from './_log'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<Record<string, unknown>>
}

export type ChatOptions = {
  model?: string
  max_tokens?: number
  temperature?: number
  response_format?: Record<string, unknown>
  route?: string
}

export type ChatUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type ChatResult = {
  content: string
  model: string
  usage?: ChatUsage
  request_id: string
}

export class LLMValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
    public readonly raw: string,
    public readonly request_id: string,
  ) {
    super(message)
    this.name = 'LLMValidationError'
  }
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const OPENAI_BASE = 'https://api.openai.com/v1'

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 500

// USD pro 1M Token. Quelle: https://openai.com/api/pricing (Stand 2026-05-18).
// gpt-4o-mini bleibt der Default-Workhorse, andere Modelle werden hier ergänzt
// sobald sie in einem Endpoint tatsächlich verwendet werden.
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
}

export function estimateCostUsd(
  model: string,
  usage?: { prompt_tokens?: number; completion_tokens?: number },
): number {
  const price = PRICE_PER_MTOK[model] ?? PRICE_PER_MTOK[DEFAULT_MODEL]
  const inTok = usage?.prompt_tokens ?? 0
  const outTok = usage?.completion_tokens ?? 0
  return (inTok * price.input + outTok * price.output) / 1_000_000
}

function getApiKey(res?: VercelResponse): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    if (res) res.status(500).json({ error: 'OpenAI key not configured' })
    throw new Error('OpenAI key not configured')
  }
  return key
}

function jitter(ms: number): number {
  const factor = 0.8 + Math.random() * 0.4
  return Math.round(ms * factor)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const secs = Number(header)
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000
  const date = Date.parse(header)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return null
}

/**
 * Call chat completions and return { content, usage, request_id }.
 * Retries transient errors (408/429/5xx + network) with exponential backoff + jitter.
 * Throws on persistent errors or empty content.
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
    route,
  } = options

  const request_id = crypto.randomUUID()
  const body: Record<string, unknown> = { model, messages, temperature }
  if (max_tokens !== undefined) body.max_tokens = max_tokens
  if (response_format !== undefined) body.response_format = response_format

  const started = Date.now()
  let lastErr: unknown
  let attempts = 0

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt
    try {
      const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok && RETRY_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
        const wait = retryAfter ?? jitter(BASE_BACKOFF_MS * 2 ** (attempt - 1))
        await sleep(wait)
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!response.ok || !content) {
        const msg = data?.error?.message || `LLM error (HTTP ${response.status})`
        logger.error({
          request_id,
          route,
          model,
          attempts,
          latency_ms: Date.now() - started,
          http_status: response.status,
          error: msg,
        })
        throw new Error(msg)
      }

      const usage: ChatUsage | undefined = data.usage
      logger.info({
        request_id,
        route,
        model,
        attempts,
        latency_ms: Date.now() - started,
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: usage?.total_tokens ?? 0,
        cost_usd: estimateCostUsd(model, usage),
      })

      return { content: String(content).trim(), model, usage, request_id }
    } catch (err) {
      lastErr = err
      // Network error path: retry if attempts remain.
      const isFetchError = err instanceof TypeError || (err as { name?: string })?.name === 'FetchError'
      if (isFetchError && attempt < MAX_ATTEMPTS) {
        await sleep(jitter(BASE_BACKOFF_MS * 2 ** (attempt - 1)))
        continue
      }
      throw err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('LLM call failed')
}

/**
 * Strict JSON variant — forces response_format=json_object, parses, validates
 * with the supplied Zod schema. Throws LLMValidationError on schema mismatch
 * so call sites can distinguish "LLM returned garbage" from "OpenAI is down".
 */
export async function chatJSON<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<{ data: T; usage?: ChatUsage; model: string; request_id: string }> {
  const result = await chat(messages, {
    ...options,
    response_format: options.response_format ?? { type: 'json_object' },
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(result.content)
  } catch {
    throw new LLMValidationError(
      'LLM returned non-JSON content',
      [],
      result.content,
      result.request_id,
    )
  }

  const validated = schema.safeParse(parsed)
  if (!validated.success) {
    throw new LLMValidationError(
      'LLM JSON did not match schema',
      validated.error.issues,
      result.content,
      result.request_id,
    )
  }

  return { data: validated.data, usage: result.usage, model: result.model, request_id: result.request_id }
}
