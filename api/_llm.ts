/**
 * Central LLM gateway for all Vercel serverless functions.
 *
 * Multi-provider: OpenAI (default), Anthropic, Gemini.
 * Failover: `provider: 'auto'` → OpenAI primary, Anthropic fallback on
 * transient errors (408/429/5xx + network), Gemini secondary fallback.
 *
 * Existing callers (`chat(messages, opts)` without `provider`) keep
 * OpenAI/gpt-4o-mini behaviour — no change for them.
 */

import crypto from 'node:crypto'
import type { VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { logger } from './_log'

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'auto'

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
  provider?: Provider
}

export type ChatUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type ChatResult = {
  content: string
  model: string
  provider: Exclude<Provider, 'auto'>
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

/**
 * Marker for transient errors thrown out of a provider call. The router
 * uses `instanceof TransientLLMError` to decide whether to fall back to the
 * next provider in `auto` mode. Anything else (auth, bad request, schema
 * errors) bubbles up immediately — failing fast on 401 is better than
 * silently double-billing two providers.
 */
export class TransientLLMError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly provider: Exclude<Provider, 'auto'>,
  ) {
    super(message)
    this.name = 'TransientLLMError'
  }
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const OPENAI_BASE = 'https://api.openai.com/v1'

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 6
const BASE_BACKOFF_MS = 3000
const MAX_BACKOFF_MS = 20000

/**
 * USD pro 1M Token. Provider-Preise Stand 2026-05-18.
 *   - OpenAI:    https://openai.com/api/pricing
 *   - Anthropic: https://www.anthropic.com/pricing
 *   - Google:    https://ai.google.dev/pricing
 */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  // Anthropic
  'claude-haiku-4-5': { input: 1.00, output: 5.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  // Gemini
  'gemini-flash': { input: 0.075, output: 0.30 },
  'gemini-flash-lite': { input: 0.05, output: 0.20 },
  'gemini-pro': { input: 1.25, output: 5.00 },
}

const DEFAULT_MODEL_BY_PROVIDER: Record<Exclude<Provider, 'auto'>, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  gemini: 'gemini-flash',
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

// -----------------------------------------------------------------------------
// Provider: OpenAI
// -----------------------------------------------------------------------------

async function callOpenAI(
  messages: ChatMessage[],
  options: ChatOptions,
  request_id: string,
): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI key not configured')

  const {
    model = DEFAULT_MODEL_BY_PROVIDER.openai,
    max_tokens,
    temperature = 0.2,
    response_format,
    route,
  } = options

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
        const wait = retryAfter ?? jitter(Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS))
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
          provider: 'openai',
          model,
          attempts,
          latency_ms: Date.now() - started,
          http_status: response.status,
          error: msg,
        })
        if (RETRY_STATUS.has(response.status)) {
          throw new TransientLLMError(msg, response.status, 'openai')
        }
        throw new Error(msg)
      }

      const usage: ChatUsage | undefined = data.usage
      logger.info({
        request_id,
        route,
        provider: 'openai',
        model,
        attempts,
        latency_ms: Date.now() - started,
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: usage?.total_tokens ?? 0,
        cost_usd: estimateCostUsd(model, usage),
      })

      return {
        content: String(content).trim(),
        model,
        provider: 'openai',
        usage,
        request_id,
      }
    } catch (err) {
      lastErr = err
      if (err instanceof TransientLLMError) throw err
      const isFetchError = err instanceof TypeError || (err as { name?: string })?.name === 'FetchError'
      if (isFetchError && attempt < MAX_ATTEMPTS) {
        await sleep(jitter(Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS)))
        continue
      }
      if (isFetchError) {
        throw new TransientLLMError(String((err as Error).message || err), null, 'openai')
      }
      throw err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('OpenAI call failed')
}

// -----------------------------------------------------------------------------
// Provider: Anthropic
// -----------------------------------------------------------------------------

/**
 * Convert OpenAI-style messages (system + user/assistant interleaved) into
 * Anthropic shape: a single `system` string + `messages` array of user/assistant.
 */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
} {
  const systemParts: string[] = []
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of messages) {
    const text =
      typeof m.content === 'string'
        ? m.content
        : m.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n')
    if (m.role === 'system') systemParts.push(text)
    else out.push({ role: m.role, content: text })
  }
  return { system: systemParts.join('\n\n'), messages: out }
}

async function callAnthropic(
  messages: ChatMessage[],
  options: ChatOptions,
  request_id: string,
): Promise<ChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Anthropic key not configured')

  // Lazy-load the SDK so missing dep doesn't break OpenAI-only deployments.
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const {
    model = DEFAULT_MODEL_BY_PROVIDER.anthropic,
    max_tokens = 1024,
    temperature = 0.2,
    route,
  } = options

  const { system, messages: anthMessages } = toAnthropicMessages(messages)
  const started = Date.now()

  try {
    const resp = await client.messages.create({
      model,
      max_tokens,
      temperature,
      system: system || undefined,
      messages: anthMessages,
    })

    const content = resp.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: string; text?: string }) => b.text ?? '')
      .join('')
      .trim()

    if (!content) {
      throw new Error('Anthropic returned empty content')
    }

    const usage: ChatUsage = {
      prompt_tokens: resp.usage?.input_tokens,
      completion_tokens: resp.usage?.output_tokens,
      total_tokens:
        (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0),
    }

    logger.info({
      request_id,
      route,
      provider: 'anthropic',
      model,
      attempts: 1,
      latency_ms: Date.now() - started,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      cost_usd: estimateCostUsd(model, usage),
    })

    return { content, model, provider: 'anthropic', usage, request_id }
  } catch (err) {
    const status = (err as { status?: number })?.status ?? null
    const msg = (err as Error)?.message || 'Anthropic call failed'
    logger.error({
      request_id,
      route,
      provider: 'anthropic',
      model,
      latency_ms: Date.now() - started,
      http_status: status,
      error: msg,
    })
    if (status !== null && RETRY_STATUS.has(status)) {
      throw new TransientLLMError(msg, status, 'anthropic')
    }
    throw err
  }
}

// -----------------------------------------------------------------------------
// Provider: Gemini
// -----------------------------------------------------------------------------

function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction?: string
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
} {
  const systemParts: string[] = []
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  for (const m of messages) {
    const text =
      typeof m.content === 'string'
        ? m.content
        : m.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n')
    if (m.role === 'system') systemParts.push(text)
    else
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      })
  }
  return {
    systemInstruction: systemParts.length ? systemParts.join('\n\n') : undefined,
    contents,
  }
}

async function callGemini(
  messages: ChatMessage[],
  options: ChatOptions,
  request_id: string,
): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini key not configured')

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)

  const {
    model = DEFAULT_MODEL_BY_PROVIDER.gemini,
    max_tokens,
    temperature = 0.2,
    route,
  } = options

  const { systemInstruction, contents } = toGeminiContents(messages)
  const generationConfig: Record<string, unknown> = { temperature }
  if (max_tokens !== undefined) generationConfig.maxOutputTokens = max_tokens

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction,
    generationConfig,
  })

  const started = Date.now()

  try {
    const result = await geminiModel.generateContent({ contents })
    const text = (result.response?.text?.() ?? '').trim()
    if (!text) throw new Error('Gemini returned empty content')

    const meta = result.response?.usageMetadata
    const usage: ChatUsage = {
      prompt_tokens: meta?.promptTokenCount,
      completion_tokens: meta?.candidatesTokenCount,
      total_tokens: meta?.totalTokenCount,
    }

    logger.info({
      request_id,
      route,
      provider: 'gemini',
      model,
      attempts: 1,
      latency_ms: Date.now() - started,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      cost_usd: estimateCostUsd(model, usage),
    })

    return { content: text, model, provider: 'gemini', usage, request_id }
  } catch (err) {
    const status = (err as { status?: number })?.status ?? null
    const msg = (err as Error)?.message || 'Gemini call failed'
    logger.error({
      request_id,
      route,
      provider: 'gemini',
      model,
      latency_ms: Date.now() - started,
      http_status: status,
      error: msg,
    })
    if (status !== null && RETRY_STATUS.has(status)) {
      throw new TransientLLMError(msg, status, 'gemini')
    }
    throw err
  }
}

// -----------------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------------

/**
 * Test-seam: providers are looked up via this table so unit tests can
 * monkey-patch `__providers.openai = vi.fn(...)` without going near `fetch`
 * or the real SDKs.
 */
export const __providers = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
}

function autoChain(): Array<Exclude<Provider, 'auto'>> {
  const chain: Array<Exclude<Provider, 'auto'>> = ['openai']
  if (process.env.ANTHROPIC_API_KEY) chain.push('anthropic')
  if (process.env.GEMINI_API_KEY) chain.push('gemini')
  return chain
}

/**
 * Call chat completions through the configured provider.
 *
 * - `provider: 'openai' | 'anthropic' | 'gemini'` — single provider, no fallback.
 *   Transient errors retry inside the provider's own loop and then bubble up.
 * - `provider: 'auto'` — OpenAI primary, fall back to Anthropic on
 *   TransientLLMError, then Gemini if also configured. Auth/4xx errors
 *   short-circuit immediately; we don't want to double-bill on a bad key.
 *
 * Default `provider` is `'openai'` to preserve behaviour for existing callers.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const request_id = crypto.randomUUID()
  const provider: Provider = options.provider ?? 'openai'

  if (provider !== 'auto') {
    const fn = __providers[provider]
    return fn(messages, options, request_id)
  }

  const chain = autoChain()
  let lastErr: unknown
  let fallback_from: Exclude<Provider, 'auto'> | undefined

  for (let i = 0; i < chain.length; i++) {
    const p = chain[i]
    logger.info({
      request_id,
      route: options.route,
      provider: p,
      attempt: i + 1,
      ...(fallback_from ? { fallback_from } : {}),
      event: 'provider_selected',
    })
    try {
      return await __providers[p](messages, options, request_id)
    } catch (err) {
      lastErr = err
      if (err instanceof TransientLLMError && i < chain.length - 1) {
        fallback_from = p
        logger.warn({
          request_id,
          route: options.route,
          provider: p,
          event: 'provider_failover',
          reason: err.message,
          status: err.status,
        })
        continue
      }
      throw err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('all providers failed')
}

/**
 * Strict JSON variant — forces response_format=json_object on OpenAI; for
 * Anthropic/Gemini we instruct the model via system prompt instead since
 * neither speaks OpenAI's response_format dialect.
 */
export async function chatJSON<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<{
  data: T
  usage?: ChatUsage
  model: string
  provider: Exclude<Provider, 'auto'>
  request_id: string
}> {
  const provider = options.provider ?? 'openai'
  let effectiveOpts: ChatOptions = options
  let effectiveMessages: ChatMessage[] = messages

  if (provider === 'openai') {
    effectiveOpts = {
      ...options,
      response_format: options.response_format ?? { type: 'json_object' },
    }
  } else {
    // Anthropic + Gemini: prepend a system message asking for raw JSON.
    const jsonHint: ChatMessage = {
      role: 'system',
      content:
        'You must respond with a single valid JSON object that matches the requested schema. No prose, no markdown, no code fences.',
    }
    effectiveMessages = [jsonHint, ...messages]
  }

  const result = await chat(effectiveMessages, effectiveOpts)

  let parsed: unknown
  const raw = stripJsonFence(result.content)
  try {
    parsed = JSON.parse(raw)
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

  return {
    data: validated.data,
    usage: result.usage,
    model: result.model,
    provider: result.provider,
    request_id: result.request_id,
  }
}

function stripJsonFence(s: string): string {
  const trimmed = s.trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  }
  return trimmed
}

/** Exposed for tests + readiness checks. */
export function _configuredProviders(): Array<Exclude<Provider, 'auto'>> {
  return autoChain()
}

/** Backwards-compat: some callers expect a res-aware key check. */
export function _assertOpenAIConfigured(res?: VercelResponse): void {
  if (!process.env.OPENAI_API_KEY) {
    if (res) res.status(500).json({ error: 'OpenAI key not configured' })
    throw new Error('OpenAI key not configured')
  }
}
