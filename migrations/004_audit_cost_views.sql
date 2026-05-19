-- GitLaw Pro — aggregierte Sichten für /admin/costs Dashboard.
-- Vorberechnete Aggregate damit der Endpoint keine Window-Scans pro Request macht.
-- Ausführen: psql "$DATABASE_URL_UNPOOLED" -f migrations/004_audit_cost_views.sql
-- Idempotent: CREATE OR REPLACE VIEW.

CREATE OR REPLACE VIEW v_audit_cost_daily AS
SELECT
  date_trunc('day', COALESCE(ts, created_at))::date  AS day,
  llm_model                                          AS model,
  action                                             AS route,
  COUNT(*)                                           AS calls,
  COALESCE(SUM(llm_prompt_tokens), 0)                AS prompt_tokens,
  COALESCE(SUM(llm_completion_tokens), 0)            AS completion_tokens,
  COALESCE(SUM(llm_total_tokens), 0)                 AS total_tokens,
  COALESCE(SUM(llm_estimated_cost_usd), 0)           AS total_cost_usd,
  CASE WHEN COUNT(*) > 0
       THEN COALESCE(SUM(llm_estimated_cost_usd), 0) / COUNT(*)
       ELSE 0 END                                    AS avg_cost_per_call_usd
FROM audit_log
WHERE llm_model IS NOT NULL
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW v_audit_cost_tenant AS
SELECT
  tenant_id,
  date_trunc('day', COALESCE(ts, created_at))::date  AS day,
  COUNT(*)                                           AS calls,
  COALESCE(SUM(llm_total_tokens), 0)                 AS total_tokens,
  COALESCE(SUM(llm_estimated_cost_usd), 0)           AS total_cost_usd,
  MAX(COALESCE(ts, created_at))                      AS last_seen
FROM audit_log
WHERE llm_model IS NOT NULL
GROUP BY 1, 2;
