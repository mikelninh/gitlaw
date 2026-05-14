-- GitLaw Pro — initiales Schema
-- Neon Postgres EU Frankfurt (Frankfurt Region)
-- Ausführen: psql "$DATABASE_URL_UNPOOLED" -f migrations/001_init.sql
-- Idempotent: alle CREATE-Statements mit IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'anwalt', 'assistenz', 'read_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM (
    'unterlagen_fehlen',
    'unterlagen_in_pruefung',
    'antrag_in_vorbereitung',
    'antrag_eingereicht',
    'behoerdliche_rueckmeldung_ausstehend',
    'behoerde_nachforderung',
    'termin_steht_aus',
    'verfahren_abgeschlossen'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE letter_status AS ENUM ('draft', 'finalized', 'sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE storage_provider_type AS ENUM ('vercel_blob', 'upstash_redis', 'neon_large_object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── tenants ───────────────────────────────────────────────────────────────────
-- slug matcht die Redis tenantId-Strings ('kanzlei-nguyen', etc.)

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  plan       TEXT        NOT NULL DEFAULT 'pilot',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug
  ON tenants (slug) WHERE deleted_at IS NULL;

-- ── users ─────────────────────────────────────────────────────────────────────
-- email_hash: HMAC-peppered SHA-256 (Klartext nie gespeichert)

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  email_hash    TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'read_only',
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  UNIQUE (tenant_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id) WHERE deleted_at IS NULL;

-- ── cases ─────────────────────────────────────────────────────────────────────
-- status: 'aktiv'|'archiviert' (MandantCase.status)
-- case_status: 8-Stati-Modell (MandantCase.caseStatus)
-- checklist_states / tasks / relevant_paragraphs: JSONB-Blobs

CREATE TABLE IF NOT EXISTS cases (
  id                   TEXT        PRIMARY KEY,  -- client-generated id (Date.now+random)
  tenant_id            UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  aktenzeichen         TEXT        NOT NULL,
  mandant_name         TEXT        NOT NULL,
  description          TEXT,
  status               TEXT        NOT NULL DEFAULT 'aktiv',  -- 'aktiv' | 'archiviert'
  case_status          case_status NOT NULL DEFAULT 'unterlagen_fehlen',
  mandatsart_id        TEXT,
  frist_datum          TEXT,                                   -- ISO-Date YYYY-MM-DD
  frist_bezeichnung    TEXT,
  mandant_email        TEXT,
  behoerde             TEXT,
  behoerde_plz         TEXT,
  checklist_states     JSONB       NOT NULL DEFAULT '{}',
  tasks                JSONB       NOT NULL DEFAULT '[]',
  relevant_paragraphs  JSONB       NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_tenant_updated ON cases (tenant_id, updated_at DESC) WHERE deleted_at IS NULL;

-- ── case_documents ────────────────────────────────────────────────────────────
-- dataUrl wird nie gespeichert — bleibt als Vault in Upstash Redis
-- storage_ref verweist auf Redis-Key oder Blob-URL

CREATE TABLE IF NOT EXISTS case_documents (
  id                   TEXT        PRIMARY KEY,
  case_id              TEXT        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  tenant_id            UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  original_name        TEXT        NOT NULL,
  internal_name        TEXT,
  mime_type            TEXT,
  size_bytes           BIGINT,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by          TEXT,
  kind                 TEXT        NOT NULL DEFAULT 'standard',  -- 'vollmacht' | 'standard'
  checklist_item_id    TEXT,
  photo_slot_id        TEXT,
  storage_provider     storage_provider_type,
  storage_ref          TEXT,                                     -- Redis-Key oder Blob-URL
  checksum_sha256      TEXT,
  ocr_text             TEXT,
  translated_text_de   TEXT,
  translation_reviewed BOOLEAN     NOT NULL DEFAULT false,
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case ON case_documents (case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_documents_tenant ON case_documents (tenant_id) WHERE deleted_at IS NULL;

-- ── case_research ─────────────────────────────────────────────────────────────
-- citations: JSONB-Array (Citation[])

CREATE TABLE IF NOT EXISTS case_research (
  id              TEXT        PRIMARY KEY,
  case_id         TEXT        REFERENCES cases (id) ON DELETE SET NULL,
  tenant_id       UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  question        TEXT        NOT NULL,
  answer          TEXT        NOT NULL,
  citations       JSONB       NOT NULL DEFAULT '[]',
  reviewed        BOOLEAN     NOT NULL DEFAULT false,
  approved_answer TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_research_case ON case_research (case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_research_tenant ON case_research (tenant_id) WHERE deleted_at IS NULL;

-- ── case_letters ──────────────────────────────────────────────────────────────
-- fields: JSONB-Map (Record<string, string>)

CREATE TABLE IF NOT EXISTS case_letters (
  id             TEXT         PRIMARY KEY,
  case_id        TEXT         REFERENCES cases (id) ON DELETE SET NULL,
  tenant_id      UUID         NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  template_id    TEXT         NOT NULL,
  template_title TEXT         NOT NULL,
  fields         JSONB        NOT NULL DEFAULT '{}',
  body           TEXT         NOT NULL,
  letter_status  letter_status NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_letters_case ON case_letters (case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_letters_tenant ON case_letters (tenant_id) WHERE deleted_at IS NULL;

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- append-only; prev_hash + hash für Tamper-Evidence-Chain

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT        PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  case_id    TEXT,
  actor      TEXT        NOT NULL,
  actor_role TEXT,
  action     TEXT        NOT NULL,
  detail     TEXT        NOT NULL DEFAULT '',
  prev_hash  TEXT,
  hash       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_case ON audit_log (case_id, created_at DESC) WHERE case_id IS NOT NULL;

-- ── mandant_invitations ───────────────────────────────────────────────────────
-- token_hash: SHA-256 des Klartext-Tokens — Klartext nie gespeichert
-- lookup: WHERE token_hash = sha256($token) AND expires_at > now()

CREATE TABLE IF NOT EXISTS mandant_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  case_id     TEXT        REFERENCES cases (id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  lang        TEXT        NOT NULL DEFAULT 'de',
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_mandant_invitations_tenant ON mandant_invitations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mandant_invitations_case ON mandant_invitations (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mandant_invitations_token ON mandant_invitations (token_hash) WHERE revoked_at IS NULL;

-- ── Trigger: updated_at automatisch setzen ────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER cases_set_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
