import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./_db', () => ({
  getSql: () => {
    throw new Error('db intentionally unavailable in unit test')
  },
}))

import { runAgent, type ToolDef } from './_agent'

const originalFetch = global.fetch

function llmResponse(message: Record<string, unknown>, usage = { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }) {
  return new Response(
    JSON.stringify({ choices: [{ message }], usage }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'unit-test-key'
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('GitLaw agent safety guards', () => {
  it('aborts when the LLM cost exceeds the run budget', async () => {
    global.fetch = vi.fn(async () =>
      llmResponse(
        { role: 'assistant', content: 'would otherwise finish' },
        { prompt_tokens: 100_000, completion_tokens: 100_000, total_tokens: 200_000 },
      ),
    ) as typeof fetch

    const result = await runAgent({
      agentName: 'budget-test',
      systemPrompt: 'test',
      userMessage: 'test',
      tools: [],
      model: 'gpt-4o',
      maxCostUsd: 0.001,
      maxIterations: 3,
    })

    expect(result.status).toBe('aborted_budget')
    expect(result.iterations).toBe(1)
    expect(result.totalCostUsd).toBeGreaterThan(0.001)
    expect(result.error).toContain('budget exceeded')
  })

  it('aborts a repeating tool loop at maxIterations', async () => {
    let n = 0
    global.fetch = vi.fn(async () => {
      n += 1
      return llmResponse({
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: `call-${n}`,
          type: 'function',
          function: { name: 'repeat_tool', arguments: '{"q":"same"}' },
        }],
      })
    }) as typeof fetch

    const handler = vi.fn(async () => ({ ok: true }))
    const tools: ToolDef[] = [{
      name: 'repeat_tool',
      description: 'test',
      schema: { type: 'object' },
      handler,
    }]

    const result = await runAgent({
      agentName: 'iteration-test',
      systemPrompt: 'test',
      userMessage: 'test',
      tools,
      maxIterations: 2,
      maxCostUsd: 100,
    })

    expect(result.status).toBe('aborted_iterations')
    expect(result.iterations).toBe(2)
    expect(result.error).toContain('iteration limit hit (2)')
    expect(handler).toHaveBeenCalledTimes(2)
    expect(result.toolTrace).toHaveLength(2)
  })

  it('records unknown tool calls as bounded trace errors instead of executing arbitrary code', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(llmResponse({
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'bad-call',
          type: 'function',
          function: { name: 'not_allowlisted', arguments: '{}' },
        }],
      }))
      .mockResolvedValueOnce(llmResponse({ role: 'assistant', content: 'done' })) as typeof fetch

    const result = await runAgent({
      agentName: 'allowlist-test',
      systemPrompt: 'test',
      userMessage: 'test',
      tools: [],
      maxIterations: 3,
      maxCostUsd: 100,
    })

    expect(result.status).toBe('completed')
    expect(result.toolTrace).toHaveLength(1)
    expect(result.toolTrace[0].tool).toBe('not_allowlisted')
    expect(result.toolTrace[0].error).toBe('unknown_tool')
  })
})
