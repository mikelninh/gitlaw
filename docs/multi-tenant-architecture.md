# Multi-Tenant Isolation, Token Metering, and Agent Observability in GitLaw Pro

GitLaw Pro is a B2B legal-tech tool for small German immigration-law firms (Kanzleien). Three things had to be true from day one: tenant data cannot leak across firms, per-tenant LLM cost has to be visible (so I can answer "what does a Mandant cost us"), and every action that touched a case has to be reconstructible months later. This post walks through how that's implemented today — the tables, the middleware, and the parts I'd swap out at scale.

## The tenant model

Tenants are first-class in the schema. Every table that holds firm data carries a `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`, and every per-tenant index is partial on `deleted_at IS NULL`. That includes `cases`, `case_documents`, `case_research`, `case_letters`, `audit_log`, and `mandant_invitations` — see [`migrations/001_init.sql`](../migrations/001_init.sql). There is no "global" cases view; queries always start from a tenant_id. Soft-deletes preserve the audit chain.

On the API side, every endpoint that touches tenant data calls `requireProSession` from [`api/_auth.ts`](../api/_auth.ts) before doing anything else. It pulls a bearer token, verifies the HMAC-SHA-256 signature with a timing-safe compare, checks the role rank, and hands back the claims:

```ts
export function requireProSession(req, res, minRole = 'read_only') {
  const token = extractBearerToken(req)
  if (!token) { res.status(401).json({ error: 'Missing bearer session' }); return null }
  const claims = verifySessionToken(token)
  if (!claims) { res.status(401).json({ error: 'Invalid or expired session' }); return null }
  if (ROLE_RANK[claims.role] < ROLE_RANK[minRole]) {
    res.status(403).json({ error: 'Insufficient role' }); return null
  }
  return claims
}
```

From there `claims.tenantId` is the only thing that ever gets bound into a SQL query — the request body cannot supply a tenant_id, and there is no admin path that drops the predicate. The session secret is required (`≥32` chars) with no hardcoded fallback, so a misconfigured deploy fails closed instead of accepting forgeable tokens.

## Token metering

Every LLM call flows through a single gateway, [`api/_llm.ts`](../api/_llm.ts). The gateway owns retries with exponential backoff + jitter, request_id generation, and — important here — cost estimation from the response's `usage` object:

```ts
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
  'gpt-4.1-mini':{ input: 0.40, output: 1.60 },
}
export function estimateCostUsd(model, usage) {
  const price = PRICE_PER_MTOK[model] ?? PRICE_PER_MTOK[DEFAULT_MODEL]
  return ((usage?.prompt_tokens ?? 0) * price.input +
          (usage?.completion_tokens ?? 0) * price.output) / 1_000_000
}
```

The numbers don't live in audit rows alone. The `audit_log` table — extended in [`migrations/003_audit_llm_usage.sql`](../migrations/003_audit_llm_usage.sql) — has columns `llm_model`, `llm_prompt_tokens`, `llm_completion_tokens`, `llm_total_tokens`, `llm_estimated_cost_usd NUMERIC(12,8)`. [`api/_audit.ts`](../api/_audit.ts) writes one row per LLM-touching action, with the `userId` HMAC-hashed (pepper = `GITLAW_SESSION_SECRET`) so a leaked Redis dump can't be reversed into emails. SafeVoice — a separate codebase with its own database — uses the same shape, so a single cross-project dashboard can `UNION ALL` the two and group by tenant or by month without translation.

## Agent observability

Multi-step agent runs blow up naive cost accounting: one "Lebenslagen-Analyse" might fire seven LLM calls, three retrieval tools, and two structured-output validations. Reporting that as seven rows hides what one user-facing operation actually cost. The fix is two tables in [`migrations/005_agent_runs.sql`](../migrations/005_agent_runs.sql):

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY, agent_name TEXT NOT NULL, user_hash TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  input_json JSONB NOT NULL, output_json JSONB,
  total_iterations INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(12,8) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
```

Every `tool_calls` row references an `agent_run_id`, carries an `input_hash`, a `latency_ms`, a `cost_usd`, and a `cached` flag. The partial index `idx_tool_calls_idempotency (agent_run_id, tool_name, input_hash) WHERE error IS NULL` makes the cache lookup an index scan. `audit_log` was retro-fitted with an `agent_run_id` column in the same migration, which is the stitching: LLM cost rows roll up into one line per agent run in the dashboard. Hard guards on the loop — `max_iterations` and `max_cost_usd` — turn "runaway agent" from an unbounded billing event into a 200 OK with a partial result and an error string.

## What I'd add for real SSO

Today the entry point is an invite token (`BETA-NGUYEN`, `BETA-RUBIN`, …) that maps to `{ tenantId, userId, role }` and mints a 12-hour HMAC-signed session. It is honest middleware — timing-safe compare, no hardcoded secret fallback, role-rank checks — but it is not SSO. At firm scale I would replace the invite layer with WorkOS or Auth0 (SAML/OIDC for the Kanzlei's IdP), keep the `ProSessionClaims` shape so every downstream endpoint stays untouched, and add SCIM-driven user provisioning into the `users` table. The tenant model, the LLM gateway, the audit log, and the agent tables don't change — they were built to sit behind whatever identity provider comes next. Realistic effort: about a week, mostly mapping IdP groups onto the `user_role` enum and writing the SCIM webhook.
