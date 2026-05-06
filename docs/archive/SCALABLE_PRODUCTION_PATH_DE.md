# Scalable Production Path – GitLaw Pro

Stand: 2026-04-30

## Ziel
GitLaw Pro von einer lokalen/betaartigen Demo-Architektur zu einer skalierbaren, kanzleitauglichen SaaS in der EU entwickeln.

## Das eigentliche Problem
Nicht "noch ein Feature", sondern:
- echte Multi-User-Kanzleien,
- sichere Dokumente,
- serverseitige Zugriffsrechte,
- nachvollziehbare Compliance,
- stabiler Betrieb unter Last.

## Zielarchitektur

### 1. Identity Layer
- Echte Nutzerkonten statt Invite-Token
- MFA
- Rollen: `owner`, `anwalt`, `assistenz`, `read_only`
- Session- und Device-Management

### 2. Application Layer
- API mit serverseitiger Autorisierung auf jedem Endpunkt
- zentrale Policy-Middleware
- Background Jobs fuer OCR, Uebersetzung, PDF, Sync

### 3. Data Layer
- Postgres mit `tenant_id` auf allen Kernobjekten
- Row-Level Security
- revisionsnahes Audit-Event-Modell

### 4. Document Layer
- privater EU-Blob-Storage
- Signed URLs
- verschluesselte Dateien
- OCR-/Translation-Resultate als getrennte Artefakte

### 5. Operations Layer
- Monitoring, Alerting, Rate Limits
- Backup/Restore
- Incident-Runbooks
- Audit-/Compliance-Exports

## Der Weg dorthin

### Phase 1 – Auth + Tenant + RBAC
Ziel: kein lokaler Beta-Sicherheitsersatz mehr.

Deliverables:
- echter Login
- Tenant-Isolation in DB
- serverseitiges RBAC
- saubere Session-Invalidierung

Exit-Kriterium:
- kein Zugriff ohne Account
- kein Cross-Tenant-Zugriff technisch moeglich

### Phase 2 – Dokumente produktionsfaehig machen
Ziel: Dokumente werden zum zentralen, sicheren Workflow.

Deliverables:
- echter Upload-Flow
- EU-Storage
- Dokument-Objektmodell
- OCR-Queue
- maschinelle Uebersetzung mit Review-Schritt

Exit-Kriterium:
- Intake/Uploads fuehren zu echten Dokumenten, nicht nur Metadaten

### Phase 3 – Kanzlei-Workflows
Ziel: alltaegliche Team-Nutzung.

Deliverables:
- Aufgaben
- interne Notizen
- Freigaben
- 4-Augen-Option
- Mitarbeiterverwaltung

Exit-Kriterium:
- Assistenz und Anwalt koennen sicher zusammenarbeiten

### Phase 4 – Compliance + Go-Live
Ziel: verkaufbar und pruefbar.

Deliverables:
- AVV/DPA Paket
- TOM-Dokument
- DSAR-/Loeschprozess
- Pen-Test
- Backup/Restore-Test

Exit-Kriterium:
- belastbarer Production-Launch fuer erste Kanzleien

## Reihenfolge: was zuerst

1. Auth/Tenant/RBAC
2. Upload + Storage
3. OCR/Translation Queue
4. Team-Workflows
5. Compliance-Dokumente finalisieren
6. Security-Ops + Pen-Test

## Was wir schon haben
- Beta-Onboarding
- Intake in mehreren Sprachen
- Research + Folgefragen
- Audit-Log mit Integritaetskette
- Task-Grundlage pro Akte
- OCR-/Translation-Queue als Vorbereitung

## Was jetzt als Nächstes kommen muss
- echter Upload-Flow
- serverseitiges Dokumentmodell
- asynchrone Job-Verarbeitung

## Erfolgsmetriken
- erste Kanzlei kann 100 echte Dokumente sicher ablegen
- 3 Nutzer in einer Kanzlei arbeiten parallel ohne Konflikte
- alle kritischen API-Endpunkte sind tenant- und rollenprueft
- OCR/Translation verarbeitet >90% Standarddokumente ohne manuellen Neu-Upload
