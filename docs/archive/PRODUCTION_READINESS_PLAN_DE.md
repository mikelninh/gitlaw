# GitLaw Pro – Production Readiness Plan (DE/EU)

Stand: 2026-04-30
Owner: Mikel

## Zielbild
GitLaw Pro als mandanten- und kanzleitaugliche SaaS mit:
- sicherem Login pro Mitarbeiter:in,
- rollenbasierten Rechten,
- EU-Datenhaltung,
- belastbarer DSGVO-/BRAO-Compliance,
- auditierbaren Vorgängen.

## 0) Heute: MVP an Bao (Beta)
- Persönliche Landingpage: `/#/bao`
- Fokus: Intake, Aktenfluss, Recherche + Folgefragen, Exporte.
- Erwartung klar kommunizieren: Beta, kein finaler Multi-User-Compliance-Stand.

## 1) Phase P0 (0-2 Wochen) – Kritische Basis

### Auth & Zugriff
- Echte Accounts einführen (E-Mail + Passwort, MFA optional sofort).
- Invite-Token nur für Onboarding, nicht als Sicherheitsgrenze.
- Session-Management mit Idle-Timeout, Forced Logout.

### Multi-Tenant Isolation
- Datenmodell: `tenant_id` auf allen Kernobjekten (cases, research, letters, audit, docs).
- Serverseitige Zugriffskontrolle auf jedem API-Endpunkt.
- Kein Cross-Tenant-Zugriff technisch erzwingbar.

### Rollenmodell (RBAC)
- Rollen: `owner`, `anwalt`, `assistenz`, `read_only`.
- Rechte-Matrix definieren und serverseitig erzwingen.
- Mitarbeiter einladen/entziehen im Kanzlei-Admin.

### Audit-Foundation
- Write-once Audit-Events für Login, Export, Datenänderungen, Rollenänderungen.
- Eventfelder: actor, tenant, action, target, timestamp, ip/device (soweit zulässig).

## 2) Phase P1 (2-6 Wochen) – Rechtssichere Datenverarbeitung

### Dokumenten-Storage
- Echte Datei-Uploads in verschlüsseltem EU-Storage.
- AV-geeignete Architektur: Zugriff nur nach RBAC + Tenant.
- Objekt-Metadaten: Kategorie, Sprache, Herkunft, Retention.

### DSGVO-Betrieb
- AVV/DPA mit allen Subprozessoren abschließen.
- Verzeichnis Verarbeitungstätigkeiten vervollständigen.
- Lösch- und Aufbewahrungsregeln je Datenklasse implementieren.
- DSAR-Prozess (Auskunft/Löschung) operativ dokumentieren.

### TOMs
- Zugriffsschutz, Backup/Restore, Monitoring, Incident-Response.
- Verschlüsselung in Transit/at Rest dokumentiert.

## 3) Phase P2 (6-12 Wochen) – Kanzlei-Scale

### Collaboration
- Team-Workflows: Aufgaben, interne Notizen, Freigaben.
- 4-Augen-Freigabe für sensible Exporte/Finalisierungen (optional pro Kanzlei).

### OCR + Übersetzung
- Upload -> OCR -> optional VI->DE Übersetzung.
- Kennzeichnung „maschinell übersetzt“, Original immer erhalten.

### Compliance UX
- Vollständiges Compliance-Cockpit mit Pflicht-Checks, Ampelstatus, Nachweisen.

## 4) Rechts-/Compliance-Artefakte für Go-Live
- AVV-Vorlage (Kanzlei <-> GitLaw)
- Subprozessor-Liste + Regionen
- TOM-Dokument
- Löschkonzept
- Incident-Response-Runbook
- Datenschutzinformationen (Website + Pro)
- Auftrags-/Nutzungsvertrag inkl. Rollen der Beteiligten

## 5) Architektur-Empfehlung (kurz)
- Auth: OIDC-kompatibel, MFA-fähig.
- DB: Postgres mit Row-Level Security pro `tenant_id`.
- Storage: EU Region, private buckets, signed URLs kurzlebig.
- API: zentralisierte Authorizer-Middleware.
- Secrets/KMS: rotierbar, getrennte Umgebungen.

## 6) KPI für Production Readiness
- 0 kritische AuthZ-Befunde im Pen-Test.
- 100% API-Endpunkte mit Tenant- und Rollenprüfung.
- 100% kritische Aktionen im Audit-Log.
- Wiederherstellungstest (Backup/Restore) erfolgreich.
- DSAR-Testfall in <30 Tagen vollständig erfüllbar.

## 7) Entscheidungen diese Woche
1. Auth-Provider + EU-Region festlegen.
2. Ziel-Rollenmatrix finalisieren.
3. Datenklassen + Retention festziehen.
4. Juristische Prüfung des AVV-/TOM-Pakets terminieren.
