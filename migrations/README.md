# GitLaw Pro — Postgres Migration

Schritt-für-Schritt für die Ersteinrichtung von Neon Postgres.

## Voraussetzungen

- Vercel CLI installiert (`npm i -g vercel`)
- Zugang zum GitLaw-Vercel-Projekt
- Upstash Redis bereits verbunden (bleibt als Cache + Vault)

## Schritte

### 1. Neon Postgres provisionieren

Vercel Dashboard → Dein Projekt → **Storage** → **Connect Database** → **Neon** →
Region: **Frankfurt (EU Central)** → **Create & Connect**.

Vercel setzt automatisch folgende Env-Vars in Production:
- `DATABASE_URL` (gepoolter HTTP-Verbindungs-String)
- `DATABASE_URL_UNPOOLED` (direkte Postgres-Verbindung für Migrationen)
- `POSTGRES_URL` u.a. (Neon-Aliases)

### 2. Env-Vars lokal ziehen

```bash
vercel env pull .env.local
```

Prüfen ob beide Vars da sind:

```bash
grep DATABASE_URL .env.local
```

### 3. Schema anlegen

```bash
psql "$DATABASE_URL_UNPOOLED" -f migrations/001_init.sql
```

Idempotent — kann mehrfach ausgeführt werden (alle Statements mit `IF NOT EXISTS`).

Erwartete Ausgabe:

```
CREATE EXTENSION
DO
DO
DO
DO
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
...
```

### 4. Redis-Daten nach Postgres migrieren

```bash
# Root-Dependencies installieren (tsx, @neondatabase/serverless, @upstash/redis)
npm install

# Migration starten
npx tsx scripts/migrate-redis-to-postgres.ts
```

Das Skript ist idempotent — sicher mehrfach ausführbar. Bei Unterbrechung einfach erneut starten.

Was migriert wird (in Reihenfolge):
1. **Tenants** — kanzlei-nguyen, kanzlei-rubin, kanzlei-gniosdorz, beta-shared
2. **Cases** — Individual-Keys priorisiert, Bulk-Keys als Fallback
3. **Case Documents** — Nur Metadaten; dataUrl bleibt in Redis (Vault)
4. **Case Research** — Alle Research-Einträge pro Tenant
5. **Case Letters** — Alle generierten Briefe pro Tenant
6. **Mandant Invitations** — Token-Hash via SHA-256

### 5. Migration verifizieren

```bash
# Basis-Counts
psql "$DATABASE_URL" -c "SELECT count(*) FROM tenants;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM cases;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM case_documents;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM mandant_invitations;"

# Cases pro Tenant
psql "$DATABASE_URL" -c "
  SELECT t.slug, count(c.id) as cases
  FROM tenants t
  LEFT JOIN cases c ON c.tenant_id = t.id AND c.deleted_at IS NULL
  GROUP BY t.slug ORDER BY t.slug;
"
```

### 6. Deploy

```bash
vercel deploy --prod
```

Die API-Endpoints (`api/pro/entities.ts`, `api/mandant/case.ts`) nutzen ab jetzt
Postgres als Primary — Redis bleibt als 5-Minuten-Cache und Document-Vault.

## Rollback

Falls Probleme nach Deploy: `DATABASE_URL` Env-Var in Vercel entfernen →
beide Endpoints fallen automatisch auf Redis-only zurück (Fallback-Pfad ist aktiv).

## Wiederholte Runs

Das Migrations-Skript ist sicher mehrfach ausführbar:
- Tenants: `ON CONFLICT (slug) DO UPDATE SET name`
- Cases: `ON CONFLICT (id) DO UPDATE WHERE EXCLUDED.updated_at >= cases.updated_at`
- Documents, Research, Letters, Invitations: `ON CONFLICT (id) DO NOTHING`
