# Roadmap

Where we are, where we're going.

## Now — May 2026

**Sprint 1 closing.** Built between 2026-04-29 and 2026-05-06 in collaboration with the pilot law firm (migration-focused practice, German + Vietnamese client base):

- 11 Mandatsart-Checklisten + 8-state workflow + 32 bilingual templates — all live
- OCR-Drop-Zone with auto-rename (beta) + Akte-Zusammenfassung with §14 tabu-prompt — live
- 5-role MVP (Owner / Paralegal / Assistant / Member / Viewer) — live
- Pilot meeting today 19:00 with three participants (founder + lawyer + project-manager friend)

## Next 2 weeks (KW 19-20)

- Voice-anchor session with pilot lawyer for Vietnamese template polish
- Modul C — free Vietnamese research answers (gpt-4o-mini with VI system prompt + voice anchors)
- Refa + Hilfskraft role-scope tightening if pilot brings personnel into the loop
- AVV signature with pilot before any productive use of real client data

## Next month (KW 21-23) — Sprint 2

- **Auto-Erinnerungs-Engine** with Refa/Anwalt Freigabe-Stufe
- E-mail provider integration (Resend EU domain verification, ~30 min setup)
- Mandanten-Einwilligungs-Block in Intake-Formular (DSGVO precondition for auto-send)
- KPI-Dashboard für Pilot-Auswertung (Erinnerungen verschickt, Sachstand-Klicks, Fristen-Quote)

## Q3 2026 — Sprint 3

- **Semantic OCR classification** with gpt-4o-vision (replaces current keyword-match beta)
- Confidence-Score per classified document with sight-check markers
- Background worker for large PDFs (> 10 pages, beats Vercel 10s limit)
- Dubletten-Erkennung via SHA-256 hash + metadata match

## Q3-Q4 2026 — Sprint 4

- **Mittelsperson-Datenmodell** — autorisierte Kontaktpersonen mit Vollmacht-Validierung
- Eigener Auth-Flow für Mittelspersonen (Magic-Link via Resend EU)
- Vollmachts-Upload + Rechte-Granularität pro Vollmacht

## Q4 2026 — Phase 4 (separater Track)

- **Mandanten-Portal / App**
  - Magic-Link-Auth via Resend EU
  - Tenant-isolierte Mandanten-Sicht (nur eigene Akten sichtbar)
  - Mobile-First UI für VI-Mandantschaft
  - **Externer Pen-Test empfohlen** vor Live-Gang
  - 8-12 Wochen ehrlich, nicht 4

## 2027 — Sprint 5+

- **Advoware-Integration** — Watch-Folder-Bridge oder Business-Connect-Modul (lizenzabhängig). Vollintegration nur falls Advoware kooperiert (~30% Wahrscheinlichkeit)
- **Externes DSGVO-Audit** vor produktivem Skalierungs-Launch
- **KPI-Auswertung** mit Phase-4-Daten — Mandanten-Login-Frequenz, Self-Service-Rate, Anrufreduktion

## Funding/business model

- Pilot-Phase: 4 Wochen kostenlos, danach €149/RA/Monat Kanzlei-Tier
- Mittelspersonen-Add-on: €+50/Monat ab Sprint 4
- 60-Tage-Geld-zurück-Garantie wenn keine ≥ €1.000 Zeitersparnis
- Open Source AGPL-3.0 — kein Vendor-Lock-in, jeder kann Code prüfen lassen

## Citizen tier

The citizen tier is donations-funded. Roadmap there is more conservative:

- Auto-update der Leitsätze: weekly via GitHub Action — already live
- More AI-explained paragraphs: 112 done, 200 by end of 2026
- Mehrsprachige Erklärungen: currently DE + Leichte Sprache, planned: TR + AR + EN

## Year-out vision

GitLaw becomes the open-source reference implementation for German RAG-grounded legal-tech:

- 5K+ users on citizen tier (free legal info)
- 50+ paying law firms on Pro tier (workflow tool)
- MCP server adopted by 3+ AI agent vendors
- DSGVO-Audit certified
- Foundation for **Path to Peace** (war crimes documentation tool, similar architecture, German-criminal-law-aware Strafanzeige builder) — separate project, shares the legal corpus + RAG stack
