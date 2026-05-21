# Multi-Provider LLM Gateway

GitLaw orchestrates GPT-5, Claude, and Gemini behind a single internal API.
This document explains why the gateway exists, how it routes requests, and
what we deliberately chose not to do.

## Why not just call OpenAI directly?

For about a year, every LLM call in GitLaw went straight to OpenAI's
`/v1/chat/completions` from a thin wrapper. That was fine while we were
single-provider. It stopped being fine the day OpenAI's EU region returned
`429` for two minutes during a Bürger-Demo and three serverless functions
timed out at the same time.

Three problems became visible at once:

1. **No graceful degradation.** A `429` from one provider took down a route
   that didn't need a flagship model at all — a Haiku or a Flash would have
   been fine.
2. **Vendor lock-in at the call site.** Every endpoint imported OpenAI shapes
   (`choices[0].message.content`). Swapping providers meant touching every
   file.
3. **No cost transparency across providers.** The cost table lived in
   `_llm.ts` for OpenAI only; we couldn't answer "what if we routed
   classification to Gemini Flash?" without rewriting code.

The gateway addresses all three at the same point in the codebase.

## Design

### Single result shape

Every provider returns the same `ChatResult`:

```ts
type ChatResult = {
  content: string
  model: string
  provider: 'openai' | 'anthropic' | 'gemini'
  usage?: { prompt_tokens, completion_tokens, total_tokens }
  request_id: string
}
```

The call site doesn't care who answered. This is the load-bearing decision —
without it, the rest of the gateway is just three SDKs in a trench coat.

OpenAI gives us this shape almost for free. Anthropic returns
`content: ContentBlock[]` and `usage: { input_tokens, output_tokens }`. Gemini
returns `response.text()` and `usageMetadata: { promptTokenCount, ... }`. The
gateway normalizes all three.

### Routing

```ts
chat(messages, { provider: 'openai' | 'anthropic' | 'gemini' | 'auto' })
```

- **explicit provider** → call exactly that provider, no fallback. Transient
  errors retry inside the provider's own loop, then bubble up. The caller
  asked for Anthropic; if Anthropic is down, the caller wants to know.
- **auto** → OpenAI primary, Anthropic on transient failure, Gemini as third
  hop _only if `GEMINI_API_KEY` is configured_. We don't synthesize a fallback
  chain we can't actually execute.

Default is `'openai'` so existing callers (`chat(messages)` with no provider
arg) keep their current behaviour byte-for-byte.

### What counts as "transient"

```
408 Request Timeout
429 Too Many Requests
500/502/503/504
network errors (TypeError from fetch, SDK timeouts)
```

That's it. Specifically, **we do not fall back on 401, 403, or 400**. Those
are configuration errors (bad key, malformed request) and falling back would:

1. Charge a second provider for the same broken request.
2. Hide the real bug — you'd see the symptom (Anthropic answered) instead
   of the cause (OpenAI key expired).
3. Potentially leak data: if a caller is debugging a key-rotation issue, the
   last thing they want is for "the call mysteriously worked" because it
   silently routed elsewhere.

This is enforced via a `TransientLLMError` marker class. Provider adapters
classify errors before throwing. The router checks `err instanceof
TransientLLMError` — anything else short-circuits.

### Logging

Provider choice and fallback are logged explicitly:

```json
{"level":"info","provider":"openai","attempt":1,"event":"provider_selected"}
{"level":"warn","provider":"openai","event":"provider_failover","reason":"rate limited","status":429}
{"level":"info","provider":"anthropic","attempt":2,"fallback_from":"openai","event":"provider_selected"}
{"level":"info","provider":"anthropic","model":"claude-haiku-4-5","prompt_tokens":312,"completion_tokens":118,"cost_usd":0.000902}
```

Two reasons for the verbosity:

1. **Cost attribution.** We need to know which provider actually served
   request X to assign cost in the monthly review.
2. **Failover audit.** When OpenAI degrades for an hour, we want a single
   query (`event = 'provider_failover'`) to count how many requests we saved.

### Cost table

Hard-coded in `_llm.ts`, USD per 1M tokens. Updated manually when a
provider changes pricing — a stale cost number is more recoverable than a
runtime dependency on three pricing APIs.

| Model              | Provider  | Input ($/MTok) | Output ($/MTok) |
| ------------------ | --------- | -------------- | --------------- |
| gpt-4o-mini        | OpenAI    | 0.15           | 0.60            |
| gpt-4o             | OpenAI    | 2.50           | 10.00           |
| gpt-4.1-mini       | OpenAI    | 0.40           | 1.60            |
| claude-haiku-4-5   | Anthropic | 1.00           | 5.00            |
| claude-sonnet-4-5  | Anthropic | 3.00           | 15.00           |
| claude-opus-4-5    | Anthropic | 15.00          | 75.00           |
| gemini-flash       | Google    | 0.075          | 0.30            |
| gemini-flash-lite  | Google    | 0.05           | 0.20            |
| gemini-pro         | Google    | 1.25           | 5.00            |

`estimateCostUsd(model, usage)` works for any model in the table; unknown
models fall back to `gpt-4o-mini` pricing so we never crash on cost logging.

## What we deliberately didn't build

- **No streaming.** GitLaw routes are synchronous (Vercel serverless,
  classification + JSON output). Streaming adds three SDK surfaces without
  a user-visible win. Re-evaluate when a chat UI lands.
- **No retry-on-content (e.g. "model gave bad JSON, ask again").** The
  gateway retries transport, not semantics. Semantic retries belong in the
  caller — they know what "good output" means for their route.
- **No load balancing.** "Auto" is strictly preference-ordered, not
  round-robin. We have one cheap default and use fallback purely for
  resilience. Real LB needs latency tracking + provider health, which is
  a much bigger feature.
- **No prompt caching abstraction.** Each provider's caching story is
  different enough that pretending it's uniform would mislead callers.
  Anthropic users opt in per-message via the SDK directly when needed.

## Test surface

`api/_llm.test.ts` covers the routing logic, not the provider SDKs. The
provider table is exported as `__providers` so tests monkey-patch it with
`vi.fn()` returning canned `ChatResult`s — fast, hermetic, no network.

What the tests pin down:

- 429 from OpenAI → fall back to Anthropic
- 401 from OpenAI → throw immediately, do not call Anthropic
- `provider_selected` log carries `fallback_from` on the second hop
- Gemini is skipped in `auto` when no `GEMINI_API_KEY` is set
- explicit `provider: 'anthropic'` does not fall back to OpenAI
- cost calc correct for `claude-haiku-4-5` and `gemini-flash`
- `chatJSON()` against Anthropic parses, validates, and strips ```json fences

Run: `npm test` (vitest).

## Operations

Env vars:

- `OPENAI_API_KEY` — required, primary
- `ANTHROPIC_API_KEY` — optional, enables Anthropic provider + auto fallback
- `GEMINI_API_KEY` — optional, enables Gemini as tertiary fallback

If only `OPENAI_API_KEY` is set, the gateway behaves exactly as the
single-provider version did. Adding keys is the only deployment step needed
to activate fallback.

## Future work

- Per-route default-provider configuration (so classification routes can
  prefer Gemini Flash without each route hard-coding it).
- Lightweight circuit breaker: after N consecutive transient failures from
  a provider, short-circuit it for the next 30 seconds instead of paying
  the timeout on every request.
- Move pricing into a JSON file that gets refreshed by a weekly cron, so
  the team isn't the source of truth on $/MTok.
