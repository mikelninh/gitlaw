# Features

What's shipped, what's in beta, what's wartend. Honest current state May 2026.

## Citizen tier — `gitlaw.app`

### Live & stable

- **Search across 5,936 federal laws** — fuzzy + semantic (FAISS, 98K vectors)
- **AI-explained paragraphs** — 112 §§ in plain German, cached on-disk
- **Chat with follow-up questions** — personalized for 12 user profiles
- **Citation verification** — every § reference checked against local corpus, 53/53 eval cases pass in CI
- **20 letter templates** (16 free + 4 premium) — Widerruf, Kündigung, Reklamation, etc.
- **Anti-Halluzination badges** — ✓ verified · ⚠ unknown · 🚨 superseded
- **Verwandte Paragraphen** — citation graph (94K nodes / 200K edges) drawer per cited §
- **Gesetz des Tages + Reform-Diffs** — daily highlight + week-old change highlights
- **Bookmarks + sharing** — local-only, no account
- **Multilingual UI** — DE / Leichte Sprache / TR / AR / EN / UK
- **A11y basics** — A-/A+ text size · darkmode · keyboard navigation

### In progress

- Chat-Sprachauswahl: dynamic per-question lang switching (currently DE-only with runtime translation)

## Pro tier — closed beta

### Live & stable (May 2026)

- **Mandant:innen-Akten** — CRUD + `tenantId`-isolated + signed Pro session
- **Frist-Tracker** — §§ 187/188 BGB + § 193 weekend rule + auto-Frist § 75 VwVfG
- **3-tier Rechtsprechungs-Belege** — kuratierte BGH/BVerfG-Leitsätze (40 zu Top-30 §§) + OpenLegalData live (150K+ Urteile) + Deep-Links Beck/dejure/openjur
- **59 Schreiben-Templates** — 5 allgemein + 12 Notariat + 12 Migration + 10 Familien + 10 Sozial + 10 Steuer
- **Branded PDF + Word export** — Logo + Kanzlei-Briefkopf + Disclaimer-Footer
- **Mehrsprachiges Intake-Formular** — DE/VI/TR/AR/EN (RTL für Arabisch), Triage-Block (Dringlichkeit + Frist + Anhang-Metadaten)
- **CSV-Akten-Import** — Auto-Spalten-Erkennung für DATEV / RA-Micro / advoware / Excel
- **DSGVO-Schutz-Modus** — 14 PII-Patterns + Whitelist
- **Cloud-Sync** — tenant-bound auto-push to Upstash Frankfurt
- **5-Rollen-RBAC** — Owner / Paralegal / Assistant / Member / Viewer
- **Audit-Log** — lückenlos, BHV-tauglich PDF-exportierbar

### Sprint 1 — May 2026 (live)

Built between 2026-04-29 and 2026-05-06 in collaboration with the pilot law firm:

- **11 Mandatsart-Checklisten · 108 Pflicht-Items** — Aufenthaltstitel, Familiennachzug, Visumverfahren, Einbürgerung, Eilantrag, Härtefall etc.
- **8-Stati-Workflow** — `unterlagen_fehlen` → `unterlagen_in_pruefung` → `antrag_in_vorbereitung` → `antrag_eingereicht` → `behoerdliche_rueckmeldung_ausstehend` → `behoerde_nachforderung` → `termin_steht_aus` → `verfahren_abgeschlossen` with transition rules
- **32 Sachstand-Templates** — 8 Stati × Mandant/Mittelsperson × DE/VI
- **Behörden-Combobox** — 17 Berliner Migrations-Stellen vorbefüllt
- **Auto-Frist-Berechnung** nach § 75 VwVfG bei Status-Wechsel
- **Heute-Widget** im Pro-Dashboard mit Eilantrag-Eskalation (rote Box)
- **OCR-Drop-Zone** mit Keyword-Match-Vorschlägen + Auto-Rename + Lesbarkeits-Hinweis
- **Tasks pro Akte** mit Auto-Generierung bei Status-Wechseln
- **Akte zusammenfassen** mit § 14-Tabu-Prompt (keine Erfolgsprognosen, keine Strategie-Empfehlung, keine streitige Behörden-Kommunikation aus der KI)

### Beta — Sprint 2/3 wartet

- Auto-Versand der Erinnerungen (Sprint 2, June 2026)
- Voice-polished Vietnamese research (Modul C, after pilot voice-anchor session)
- Semantic OCR classification (Sprint 3, July 2026)
- Confidence-Score for OCR with sight-check markers

### Phase 4 (Q4 2026) — Mandanten-Portal

- Magic-Link-Auth via Resend EU
- Tenant-isolated Mandanten-View (only own case visible)
- Mobile-First UI for Vietnamese clients
- External Pen-Test before live

## Stats (May 2026)

| Metric | Value |
|---|---|
| Federal laws indexed | 5,936 |
| Lines of legal text | 1,303,451 |
| Paragraphs (graph nodes) | 94,178 |
| Cross-references (edges) | 200,464 |
| FAISS vectors | 98,367 |
| Citizen letter templates | 20 |
| Pro letter templates | 59 |
| Pro Mandatsart-Checklisten | 11 |
| Pro Pflicht-Items | 108 |
| Pro Sachstand-Templates DE+VI | 32 |
| Pro Berliner Behörden | 17 |
| Citation eval cases | 53/53 passing |
| Auto-update (laws + Leitsätze) | weekly via GitHub Action |

## What we deliberately don't build

- **WhatsApp integration** — DSGVO + Berufsgeheimnis-Risiko zu hoch
- **Erfolgsprognosen** durch KI — § 14 Lastenheft-Tabu, im System-Prompt explizit verboten
- **Auto-Versand ohne Mensch-im-Loop** — architektonische Sicherung, kein UI-Toggle dafür
- **Reverse-engineerter Advoware-DB-Zugriff** — Lizenzverletzung. Bleiben bei CSV / Watch-Folder / Business-Connect-Modul
