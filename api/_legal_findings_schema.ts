import { getSql } from './_db'

let ready: Promise<void> | null = null

export function ensureLegalFindingSchema(): Promise<void> {
  if (ready) return ready
  ready = (async () => {
    const sql = getSql()
    await sql`
      CREATE TABLE IF NOT EXISTS legal_findings (
        tenant_slug TEXT NOT NULL,
        finding_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        citation TEXT NOT NULL,
        finding_text TEXT NOT NULL,
        trust_chain JSONB NOT NULL,
        chain_sha256 TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_slug, finding_id),
        UNIQUE (tenant_slug, idempotency_key)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS legal_finding_decisions (
        tenant_slug TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        finding_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
        actor_id TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        trust_chain JSONB NOT NULL,
        chain_sha256 TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_slug, decision_id),
        UNIQUE (tenant_slug, idempotency_key)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_legal_findings_case ON legal_findings (tenant_slug, case_id, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_legal_finding_decisions_finding ON legal_finding_decisions (tenant_slug, finding_id, created_at ASC)`
  })().catch((error) => {
    ready = null
    throw error
  })
  return ready
}
