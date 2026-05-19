-- GitLaw — agentic loop tables
-- Mirrors SafeVoice's agent_runs + tool_calls (per-project DBs by design;
-- cross-project cost dashboard unions both, same as llm_usage already does).
--
-- Ausführen: psql "$DATABASE_URL_UNPOOLED" -f migrations/005_agent_runs.sql
-- Idempotent — IF NOT EXISTS everywhere.

CREATE TABLE IF NOT EXISTS agent_runs (
  id               TEXT PRIMARY KEY,
  agent_name       TEXT        NOT NULL,
  user_hash        TEXT,
  status           TEXT        NOT NULL DEFAULT 'running',
  input_json       JSONB       NOT NULL,
  output_json      JSONB,
  total_iterations INTEGER     NOT NULL DEFAULT 0,
  total_cost_usd   NUMERIC(12, 8) NOT NULL DEFAULT 0,
  error            TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name
  ON agent_runs (agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status
  ON agent_runs (status, started_at DESC)
  WHERE status != 'completed';

CREATE TABLE IF NOT EXISTS tool_calls (
  id            TEXT PRIMARY KEY,
  agent_run_id  TEXT        NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  tool_name     TEXT        NOT NULL,
  input_json    JSONB       NOT NULL,
  output_json   JSONB,
  input_hash    TEXT        NOT NULL,
  latency_ms    INTEGER     NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(12, 8) NOT NULL DEFAULT 0,
  cached        BOOLEAN     NOT NULL DEFAULT FALSE,
  error         TEXT,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run
  ON tool_calls (agent_run_id, called_at ASC);
CREATE INDEX IF NOT EXISTS idx_tool_calls_idempotency
  ON tool_calls (agent_run_id, tool_name, input_hash)
  WHERE error IS NULL;

-- Stitches LLM cost rows to their parent agent run so the cost dashboard can
-- show one Lebenslagen-Run as a single line item instead of 7 LLM hops.
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS agent_run_id TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_agent_run
  ON audit_log (agent_run_id)
  WHERE agent_run_id IS NOT NULL;
