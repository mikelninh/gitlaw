-- GitLaw Pro — LLM-Token-Usage im Audit-Log
-- Macht Kosten pro Request/Mandant beobachtbar (Cost-per-Mandant-Reporting,
-- Interview-Antwort "was kostet eine Anfrage").
-- Ausführen: psql "$DATABASE_URL_UNPOOLED" -f migrations/003_audit_llm_usage.sql
-- Idempotent: alle ALTER-Statements mit IF NOT EXISTS

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS ts                     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_hash              TEXT,
  ADD COLUMN IF NOT EXISTS entity_type            TEXT,
  ADD COLUMN IF NOT EXISTS entity_id              TEXT,
  ADD COLUMN IF NOT EXISTS diff                   JSONB,
  ADD COLUMN IF NOT EXISTS llm_model              TEXT,
  ADD COLUMN IF NOT EXISTS llm_prompt_tokens      INTEGER,
  ADD COLUMN IF NOT EXISTS llm_completion_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS llm_total_tokens       INTEGER,
  ADD COLUMN IF NOT EXISTS llm_estimated_cost_usd NUMERIC(12, 8);

CREATE INDEX IF NOT EXISTS idx_audit_log_llm_model
  ON audit_log (llm_model, created_at DESC)
  WHERE llm_model IS NOT NULL;
