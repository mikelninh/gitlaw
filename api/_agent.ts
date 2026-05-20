/**
 * Generic agent loop for GitLaw — TypeScript twin of SafeVoice's
 * `services/agent_loop.py`.
 *
 * Behaviour-identical: same safety guards (max_iterations, cost cap,
 * idempotency cache, tool-call audit), same DB-shape (agent_runs +
 * tool_calls), so a cross-project cost dashboard can union both.
 *
 * No LangChain — we want the loop debuggable at 2 AM. Tool calls are
 * sequential; if we ever need parallel fan-out, that's a focused change
 * to the inner `for (const call of toolCalls)` block.
 */

import * as crypto from 'node:crypto'
import { getSql } from './_db'
import { estimateCostUsd } from './_llm'
import { logger } from './_log'

// ── Types ────────────────────────────────────────────────────────────────

export type ToolDef<TIn = unknown, TOut = unknown> = {
  name: string
  description: string
  /** OpenAI function-calling JSON schema for `parameters`. */
  schema: Record<string, unknown>
  handler: (input: TIn) => Promise<TOut> | TOut
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type AgentRunResult = {
  agentRunId: string
  status:
    | 'completed'
    | 'failed'
    | 'aborted_budget'
    | 'aborted_iterations'
  iterations: number
  totalCostUsd: number
  finalMessage: string | null
  error: string | null
  toolTrace: Array<{
    tool: string
    input: unknown
    output: unknown
    latencyMs: number
    cached: boolean
    error: string | null
  }>
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_MAX_ITERATIONS = 10
const DEFAULT_MAX_COST_USD = 0.5
const DEFAULT_MODEL = 'gpt-4o-mini'

const OPENAI_BASE = 'https://api.openai.com/v1'

// ── Helpers ─────────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function hashInput(payload: unknown): string {
  return sha256Hex(JSON.stringify(payload ?? null))
}

function isAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

function asOpenAITool(t: ToolDef): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.schema,
    },
  }
}

function safeJson<T = unknown>(s: string | null | undefined): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

// ── OpenAI tool-call request ────────────────────────────────────────────

async function callOpenAI(opts: {
  messages: ChatMessage[]
  tools: Array<Record<string, unknown>>
  model: string
  temperature: number
}): Promise<{
  content: string | null
  toolCalls: OpenAIToolCall[]
  usage: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  model: string
  estimatedCostUsd: number
  requestId: string
  error: string | null
}> {
  const requestId = crypto.randomUUID()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      content: null,
      toolCalls: [],
      usage: {},
      model: opts.model,
      estimatedCostUsd: 0,
      requestId,
      error: 'openai_unavailable',
    }
  }

  // Free-tier OpenAI is 5 RPM. Agent loops can chain 6+ LLM calls in
  // seconds, which trips the limit. Retry the chat call with exponential
  // backoff respecting any Retry-After header from OpenAI. Bounded at 5
  // attempts × max 20s — total worst case ~50s but in practice frees
  // up after one retry cycle.
  const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504])
  const MAX_ATTEMPTS = 5
  const BASE_BACKOFF_MS = 3000
  const MAX_BACKOFF_MS = 20000
  const _sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  const _jitter = (ms: number) => Math.round(ms * (0.8 + Math.random() * 0.4))
  const _parseRetryAfter = (h: string | null): number | null => {
    if (!h) return null
    const n = Number(h)
    if (Number.isFinite(n) && n >= 0) return n * 1000
    const d = Date.parse(h)
    return Number.isNaN(d) ? null : Math.max(0, d - Date.now())
  }

  let lastErrMsg: string | null = null
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model,
          temperature: opts.temperature,
          messages: opts.messages,
          tools: opts.tools,
          tool_choice: 'auto',
        }),
      })

      if (!response.ok && RETRY_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
        const retryAfter = _parseRetryAfter(response.headers.get('retry-after'))
        const backoff = _jitter(Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS))
        const wait = retryAfter ?? backoff
        logger.warn({
          msg: 'agent.openai.retry',
          attempt,
          status: response.status,
          waitMs: wait,
          requestId,
        })
        await _sleep(wait)
        continue
      }

      const data = await response.json()
      if (!response.ok) {
        const msg = data?.error?.message ?? `HTTP ${response.status}`
        lastErrMsg = msg
        return {
          content: null,
          toolCalls: [],
          usage: {},
          model: opts.model,
          estimatedCostUsd: 0,
          requestId,
          error: msg,
        }
      }

      const message = data.choices?.[0]?.message ?? {}
      const usage = data.usage ?? {}
      const estimatedCostUsd = estimateCostUsd(opts.model, usage)

      return {
        content: typeof message.content === 'string' ? message.content : null,
        toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
        usage,
        model: opts.model,
        estimatedCostUsd,
        requestId,
        error: null,
      }
    }
    // Loop ran out of attempts on retryable status codes — return last err.
    return {
      content: null,
      toolCalls: [],
      usage: {},
      model: opts.model,
      estimatedCostUsd: 0,
      requestId,
      error: lastErrMsg ?? `retry budget exhausted after ${MAX_ATTEMPTS} attempts`,
    }
  } catch (err) {
    logger.warn({ requestId, route: 'agent.callOpenAI', err: String(err) })
    return {
      content: null,
      toolCalls: [],
      usage: {},
      model: opts.model,
      estimatedCostUsd: 0,
      requestId,
      error: String(err),
    }
  }
}

// ── DB persistence (best-effort, never fatal to the agent run) ──────────

async function persistRunStart(opts: {
  id: string
  agentName: string
  userHash: string | null
  inputPayload: unknown
}): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      INSERT INTO agent_runs (id, agent_name, user_hash, status, input_json, started_at)
      VALUES (
        ${opts.id},
        ${opts.agentName},
        ${opts.userHash},
        'running',
        ${JSON.stringify(opts.inputPayload ?? {})}::jsonb,
        NOW()
      )
    `
  } catch (e) {
    logger.warn({ msg: 'persistRunStart failed', err: String(e) })
  }
}

async function persistRunUpdate(opts: {
  id: string
  status: AgentRunResult['status'] | 'running'
  iterations: number
  costUsd: number
  outputJson?: unknown
  error?: string | null
  completed?: boolean
}): Promise<void> {
  try {
    const sql = getSql()
    const output = opts.outputJson === undefined
      ? null
      : JSON.stringify(opts.outputJson)
    await sql`
      UPDATE agent_runs
         SET status           = ${opts.status},
             total_iterations = ${opts.iterations},
             total_cost_usd   = ${opts.costUsd},
             output_json      = COALESCE(${output}::jsonb, output_json),
             error            = ${opts.error ?? null},
             completed_at     = CASE WHEN ${opts.completed === true} THEN NOW() ELSE completed_at END
       WHERE id = ${opts.id}
    `
  } catch (e) {
    logger.warn({ msg: 'persistRunUpdate failed', err: String(e) })
  }
}

async function findCachedToolCall(opts: {
  agentRunId: string
  toolName: string
  inputHash: string
}): Promise<unknown | null> {
  try {
    const sql = getSql()
    const rows = (await sql`
      SELECT output_json
        FROM tool_calls
       WHERE agent_run_id = ${opts.agentRunId}
         AND tool_name    = ${opts.toolName}
         AND input_hash   = ${opts.inputHash}
         AND error IS NULL
       LIMIT 1
    `) as Array<{ output_json: unknown }>
    return rows[0]?.output_json ?? null
  } catch (e) {
    logger.warn({ msg: 'findCachedToolCall failed', err: String(e) })
    return null
  }
}

async function persistToolCall(opts: {
  agentRunId: string
  toolName: string
  input: unknown
  output: unknown
  inputHash: string
  latencyMs: number
  cached: boolean
  error: string | null
}): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      INSERT INTO tool_calls (
        id, agent_run_id, tool_name, input_json, output_json,
        input_hash, latency_ms, cached, error, called_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${opts.agentRunId},
        ${opts.toolName},
        ${JSON.stringify(opts.input ?? null)}::jsonb,
        ${JSON.stringify(opts.output ?? null)}::jsonb,
        ${opts.inputHash},
        ${opts.latencyMs},
        ${opts.cached},
        ${opts.error},
        NOW()
      )
    `
  } catch (e) {
    logger.warn({ msg: 'persistToolCall failed', err: String(e) })
  }
}

// ── Core loop ────────────────────────────────────────────────────────────

export async function runAgent(opts: {
  agentName: string
  systemPrompt: string
  userMessage: string
  tools: ToolDef[]
  userHash?: string | null
  maxIterations?: number
  maxCostUsd?: number
  model?: string
  inputPayload?: unknown
}): Promise<AgentRunResult> {
  const agentRunId = crypto.randomUUID()
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS
  const maxCostUsd = opts.maxCostUsd ?? DEFAULT_MAX_COST_USD
  const model = opts.model ?? DEFAULT_MODEL

  if (!isAvailable()) {
    return {
      agentRunId,
      status: 'failed',
      iterations: 0,
      totalCostUsd: 0,
      finalMessage: null,
      error: 'openai_unavailable',
      toolTrace: [],
    }
  }

  await persistRunStart({
    id: agentRunId,
    agentName: opts.agentName,
    userHash: opts.userHash ?? null,
    inputPayload: opts.inputPayload ?? { userMessage: opts.userMessage },
  })

  const toolsByName = new Map(opts.tools.map((t) => [t.name, t]))
  const openaiTools = opts.tools.map(asOpenAITool)

  const messages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    { role: 'user', content: opts.userMessage },
  ]
  const toolTrace: AgentRunResult['toolTrace'] = []
  let totalCost = 0
  let iterations = 0
  let finalMessage: string | null = null
  let status: AgentRunResult['status'] = 'failed'
  let runError: string | null = null

  try {
    for (let i = 0; i < maxIterations; i++) {
      iterations = i + 1

      const chat = await callOpenAI({
        messages,
        tools: openaiTools,
        model,
        temperature: 0.2,
      })

      totalCost += chat.estimatedCostUsd

      logger.info({
        msg: 'agent.llm_call',
        agent_run_id: agentRunId,
        iteration: iterations,
        request_id: chat.requestId,
        usage: chat.usage,
        cost_usd: chat.estimatedCostUsd,
      })

      if (totalCost > maxCostUsd) {
        status = 'aborted_budget'
        runError = `budget exceeded: $${totalCost.toFixed(4)} > $${maxCostUsd.toFixed(2)}`
        break
      }

      if (chat.error) {
        status = 'failed'
        runError = chat.error
        break
      }

      const toolCalls = chat.toolCalls
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: chat.content ?? '',
      }
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls
      }
      messages.push(assistantMsg)

      if (toolCalls.length === 0) {
        finalMessage = chat.content
        status = 'completed'
        break
      }

      for (const call of toolCalls) {
        const toolName = call.function.name
        const argsRaw = call.function.arguments || '{}'
        let args: unknown
        try {
          args = JSON.parse(argsRaw)
        } catch {
          args = { _unparseable: true, raw: argsRaw }
        }

        const tool = toolsByName.get(toolName)
        const startedAt = Date.now()
        let output: unknown
        let err: string | null = null
        let cached = false

        if (!tool) {
          output = {
            error: `unknown tool '${toolName}'`,
            availableTools: Array.from(toolsByName.keys()),
          }
          err = 'unknown_tool'
        } else {
          const inputHash = hashInput(args)
          const prior = await findCachedToolCall({
            agentRunId,
            toolName,
            inputHash,
          })
          if (prior !== null) {
            output = prior
            cached = true
          } else {
            try {
              output = await tool.handler(args as never)
            } catch (e) {
              output = { error: String(e) }
              err = String(e)
            }
          }
        }

        const latencyMs = Date.now() - startedAt
        const inputHash = hashInput(args)

        await persistToolCall({
          agentRunId,
          toolName,
          input: args,
          output,
          inputHash,
          latencyMs,
          cached,
          error: err,
        })

        toolTrace.push({
          tool: toolName,
          input: args,
          output,
          latencyMs,
          cached,
          error: err,
        })

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(output ?? null),
        })
      }

      await persistRunUpdate({
        id: agentRunId,
        status: 'running',
        iterations,
        costUsd: totalCost,
      })
    }

    if (status === 'failed' && iterations >= maxIterations) {
      // Loop ran out without final answer
      status = 'aborted_iterations'
      runError = `iteration limit hit (${maxIterations})`
    }
  } catch (e) {
    status = 'failed'
    runError = `loop crash: ${String(e)}`
    logger.error({ msg: 'agent.loop_crash', agent_run_id: agentRunId, err: String(e) })
  }

  await persistRunUpdate({
    id: agentRunId,
    status,
    iterations,
    costUsd: totalCost,
    outputJson: status === 'completed' ? { finalMessage, toolTrace } : undefined,
    error: runError,
    completed: true,
  })

  return {
    agentRunId,
    status,
    iterations,
    totalCostUsd: totalCost,
    finalMessage,
    error: runError,
    toolTrace,
  }
}
