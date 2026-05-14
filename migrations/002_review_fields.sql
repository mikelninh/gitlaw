-- GitLaw Pro — Dokument-Review-Felder
-- Hinzufügen der Review-Spalten zu case_documents
-- Ausführen: psql "$DATABASE_URL_UNPOOLED" -f migrations/002_review_fields.sql
-- Idempotent: alle ALTER-Statements mit IF NOT EXISTS

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS review_status   TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by     TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_comment  TEXT;

-- Index für effiziente Abfragen nach Status (optional aber nützlich)
CREATE INDEX IF NOT EXISTS idx_case_documents_review_status
  ON case_documents (review_status)
  WHERE deleted_at IS NULL;
