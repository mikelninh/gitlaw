# P1 Sprint Board (14 Tage) – GitLaw Pro

Stand: 2026-04-30
Sprint-Ziel: Von Beta-Invite zu belastbarer Kanzlei-Basis (Auth/RBAC/Tenant/Compliance-Operations).

## Priorität A (kritisch, zuerst)

1. Auth-Basis (Tag 1-3)
- Scope: echter User-Login-Flow, Session-Lebenszyklus, Passwort-Reset vorbereiten.
- Ergebnis: Invite-Token nur noch Onboarding, nicht primärer Zugangsschutz.
- Aufwand: M
- Status: geplant

2. RBAC serverseitig erzwingen (Tag 2-5)
- Scope: Rollen `owner/anwalt/assistenz/read_only`, zentrale Permission-Matrix.
- Ergebnis: jeder API-Endpunkt prüft Rollenrechte.
- Aufwand: M
- Status: in Arbeit (Client-seitige Grundlage jetzt)

3. Tenant-Isolation (Tag 3-7)
- Scope: `tenant_id` auf allen Kernobjekten, serverseitige Filter/Policies.
- Ergebnis: keine Cross-Tenant-Datenzugriffe.
- Aufwand: L
- Status: geplant

## Priorität B (hoch)

4. Dokumenten-Storage EU (Tag 5-9)
- Scope: echter Upload, verschlüsselte Ablage, Signed URLs.
- Ergebnis: Ende-zu-Ende Dokumentenfluss statt nur Metadaten.
- Aufwand: L
- Status: geplant

5. Audit-Hardening (Tag 6-10)
- Scope: Audit für Login/Rollen/Export/Schlüsselaktionen, tenant+role Kontext.
- Ergebnis: prüfbarer Nachweis pro Aktion.
- Aufwand: M
- Status: in Arbeit (tenant/role audit context jetzt)

6. Session-Sicherheit (Tag 1-4)
- Scope: Idle-Timeout, Auto-Logout, Activity-Touch, sichere Session-Invalidierung.
- Ergebnis: geringeres Risiko bei geteilten Geräten.
- Aufwand: S
- Status: in Arbeit (Idle-Timeout jetzt)

## Priorität C (operativ/legal)

7. AVV/DPA Paket (Tag 8-12)
- Scope: Subprozessorliste, Regionen, SCC falls erforderlich.
- Ergebnis: unterschriftsreifer Compliance-Satz.
- Aufwand: M
- Status: geplant

8. Lösch-/Aufbewahrungskonzept + DSAR (Tag 10-14)
- Scope: Datenklassen, Retention, Auskunft/Löschung Prozess.
- Ergebnis: DSGVO-Betriebsfähigkeit.
- Aufwand: M
- Status: geplant

## Heute umgesetzt (vorab aus Sprint)
- Access-Context eingeführt (tenant/user/role) im Pro-Client-State.
- Session-Idle-Timeout mit Auto-Logout.
- RBAC-Foundation für Route- und UI-Gating.

## Blocker / Annahmen
- Finale serverseitige Durchsetzung erfordert persistentes User-System + Datenbank mit Tenant-Policies.
- Juristische Endprüfung (AVV/TOM) erfolgt mit externer Rechtsprüfung.
