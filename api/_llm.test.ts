/**
 * Unit tests for the multi-provider LLM gateway.
 *
 * Run with: `npx vitest run api/_llm.test.ts`
 *
 * Strategy: we monkey-patch `__providers` so no real network call happens.
 * Each provider entry is replaced with a vi.fn() that returns either a
 * canned ChatResult or throws a TransientLLMError / auth error. This keeps
 * the tests purely about *routing behaviour* — fallback, no-fallback-on-401,
 * logging — independent of any SDK version.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  __providers,
  chat,
  chatJSON,
  estimateCostUsd,
  LLMValidationError,
  TransientLLMError,
  type ChatResult,
} from './_llm'
import { logger } from './_log'

const ORIGINAL = { ...__providers }
const ORIGINAL_ENV = { ...process.env }

function ok(provider: ChatResult['provider'], content = 'hello'): ChatResult {
  return {
    content,
    model: `${provider}-test-model`,
    provider,
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    request_id: 'rid-test',
  }
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test-openai'
  process.env.ANTHROPIC_API_KEY = 'sk-test-anthropic'
  delete process.env.GEMINI_API_KEY
  vi.spyOn(logger, 'info').mockImplementation(() => {})
  vi.spyOn(logger, 'warn').mockImplementation(() => {})
  vi.spyOn(logger, 'error').mockImplementation(() => {})
})

afterEach(() => {
  __providers.openai = ORIGINAL.openai
  __providers.anthropic = ORIGINAL.anthropic
  __providers.gemini = ORIGINAL.gemini
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

describe('chat() — auto failover', () => {
  it('falls back from OpenAI 429 to Anthropic', async () => {
    __providers.openai = vi
      .fn()
      .mockRejectedValue(new TransientLLMError('rate limited', 429, 'openai'))
    __providers.anthropic = vi.fn().mockResolvedValue(ok('anthropic', 'from-claude'))

    const result = await chat([{ role: 'user', content: 'hi' }], { provider: 'auto' })

    expect(result.provider).toBe('anthropic')
    expect(result.content).toBe('from-claude')
    expect(__providers.openai).toHaveBeenCalledTimes(1)
    expect(__providers.anthropic).toHaveBeenCalledTimes(1)
  })

  it('does NOT fall back on auth error (401)', async () => {
    const authErr = Object.assign(new Error('Invalid API key'), { status: 401 })
    __providers.openai = vi.fn().mockRejectedValue(authErr)
    __providers.anthropic = vi.fn().mockResolvedValue(ok('anthropic'))

    await expect(
      chat([{ role: 'user', content: 'hi' }], { provider: 'auto' }),
    ).rejects.toThrow('Invalid API key')

    expect(__providers.anthropic).not.toHaveBeenCalled()
  })

  it('logs provider choice with correct fallback_from', async () => {
    __providers.openai = vi
      .fn()
      .mockRejectedValue(new TransientLLMError('502', 502, 'openai'))
    __providers.anthropic = vi.fn().mockResolvedValue(ok('anthropic'))

    await chat([{ role: 'user', content: 'hi' }], { provider: 'auto', route: 't' })

    const infoCalls = (logger.info as unknown as vi.Mock).mock.calls.map((c) => c[0])
    const selected = infoCalls.filter((o) => o.event === 'provider_selected')
    expect(selected).toHaveLength(2)
    expect(selected[0]).toMatchObject({ provider: 'openai', attempt: 1 })
    expect(selected[0].fallback_from).toBeUndefined()
    expect(selected[1]).toMatchObject({
      provider: 'anthropic',
      attempt: 2,
      fallback_from: 'openai',
    })

    const warnCalls = (logger.warn as unknown as vi.Mock).mock.calls.map((c) => c[0])
    expect(warnCalls.some((o) => o.event === 'provider_failover')).toBe(true)
  })

  it('skips Gemini in auto chain when GEMINI_API_KEY is missing', async () => {
    __providers.openai = vi
      .fn()
      .mockRejectedValue(new TransientLLMError('503', 503, 'openai'))
    __providers.anthropic = vi
      .fn()
      .mockRejectedValue(new TransientLLMError('503', 503, 'anthropic'))
    __providers.gemini = vi.fn().mockResolvedValue(ok('gemini'))

    await expect(
      chat([{ role: 'user', content: 'hi' }], { provider: 'auto' }),
    ).rejects.toThrow()

    expect(__providers.gemini).not.toHaveBeenCalled()
  })
})

describe('chat() — explicit provider override', () => {
  it('does NOT fall back when provider="anthropic" fails', async () => {
    __providers.anthropic = vi
      .fn()
      .mockRejectedValue(new TransientLLMError('overloaded', 529, 'anthropic'))
    __providers.openai = vi.fn().mockResolvedValue(ok('openai'))

    await expect(
      chat([{ role: 'user', content: 'hi' }], { provider: 'anthropic' }),
    ).rejects.toThrow('overloaded')

    expect(__providers.openai).not.toHaveBeenCalled()
  })

  it('routes provider="anthropic" directly to Anthropic', async () => {
    __providers.anthropic = vi.fn().mockResolvedValue(ok('anthropic', 'direct'))
    __providers.openai = vi.fn()

    const result = await chat([{ role: 'user', content: 'hi' }], {
      provider: 'anthropic',
    })

    expect(result.provider).toBe('anthropic')
    expect(result.content).toBe('direct')
    expect(__providers.openai).not.toHaveBeenCalled()
  })
})

describe('estimateCostUsd', () => {
  it('computes cost for Anthropic claude-haiku-4-5', () => {
    // 1M input @ $1.00 + 1M output @ $5.00 = $6.00
    const cost = estimateCostUsd('claude-haiku-4-5', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    })
    expect(cost).toBeCloseTo(6.0, 5)
  })

  it('computes cost for Gemini gemini-flash', () => {
    // 1M input @ $0.075 + 1M output @ $0.30 = $0.375
    const cost = estimateCostUsd('gemini-flash', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    })
    expect(cost).toBeCloseTo(0.375, 5)
  })

  it('falls back to default model pricing for unknown model', () => {
    const cost = estimateCostUsd('made-up-model', {
      prompt_tokens: 1000,
      completion_tokens: 1000,
    })
    // default gpt-4o-mini: (1000 * 0.15 + 1000 * 0.6) / 1e6
    expect(cost).toBeCloseTo((1000 * 0.15 + 1000 * 0.6) / 1_000_000, 8)
  })
})

describe('chatJSON()', () => {
  it('parses Anthropic JSON output and validates against schema', async () => {
    const schema = z.object({ foo: z.string(), n: z.number() })
    __providers.anthropic = vi
      .fn()
      .mockResolvedValue(ok('anthropic', '{"foo":"bar","n":42}'))

    const result = await chatJSON(
      schema,
      [{ role: 'user', content: 'give me json' }],
      { provider: 'anthropic' },
    )

    expect(result.data).toEqual({ foo: 'bar', n: 42 })
    expect(result.provider).toBe('anthropic')
  })

  it('strips ```json fences before parsing', async () => {
    const schema = z.object({ ok: z.boolean() })
    __providers.anthropic = vi
      .fn()
      .mockResolvedValue(ok('anthropic', '```json\n{"ok":true}\n```'))

    const result = await chatJSON(schema, [{ role: 'user', content: 'x' }], {
      provider: 'anthropic',
    })
    expect(result.data).toEqual({ ok: true })
  })

  it('throws LLMValidationError on schema mismatch', async () => {
    const schema = z.object({ foo: z.string() })
    __providers.anthropic = vi.fn().mockResolvedValue(ok('anthropic', '{"foo":123}'))

    await expect(
      chatJSON(schema, [{ role: 'user', content: 'x' }], { provider: 'anthropic' }),
    ).rejects.toBeInstanceOf(LLMValidationError)
  })
})
