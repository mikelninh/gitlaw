-- 006_gesetz_subscriptions.sql
-- Topic-Subscriptions für den Gesetzes-Diff-Watcher (Agent #7).
-- Bürger abonnieren Themen ("Mietrecht", "Asylrecht"...) und bekommen
-- montags einen Digest, wenn sich in den letzten 7 Tagen passende
-- Paragraphen geändert haben. Idempotent — sicher mehrfach laufen lassen.

CREATE TABLE IF NOT EXISTS gesetz_subscriptions (
  id              TEXT PRIMARY KEY,
  email_hash      TEXT NOT NULL,
  email_token     TEXT,
  topics          TEXT[] NOT NULL,
  language        TEXT NOT NULL DEFAULT 'de',
  unsubscribe_token TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gesetz_sub_topics ON gesetz_subscriptions USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_gesetz_sub_email_hash ON gesetz_subscriptions(email_hash);
CREATE INDEX IF NOT EXISTS idx_gesetz_sub_unsub_token ON gesetz_subscriptions(unsubscribe_token);
