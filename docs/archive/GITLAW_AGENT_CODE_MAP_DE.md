# GitLaw Agent Code Map

## Status-Legende

- `REAL` = produktiv im aktuellen Workflow eingebunden
- `BETA` = echter Produktpfad vorhanden, aber Logik/Provider noch vorlaeufig
- `NEXT` = konzeptionell klar, aber noch nicht als eigener Agent umgesetzt

## Uebersicht

| Agent | Status | Aufgabe | Zentrale Dateien / Endpunkte |
|---|---|---|---|
| Intake Agent | BETA | Intake strukturieren, Dringlichkeit/Fristen markieren, Eingang reviewbar machen | [viewer/src/pro/types.ts](/Users/mikel/gitlaw/viewer/src/pro/types.ts), [viewer/src/pro/store.ts](/Users/mikel/gitlaw/viewer/src/pro/store.ts), [viewer/src/pro/IntakeForm.tsx](/Users/mikel/gitlaw/viewer/src/pro/IntakeForm.tsx), [viewer/src/pro/ProEingaenge.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProEingaenge.tsx) |
| Document Agent | REAL | Dateien benennen, klassifizieren, Akten zuordnen | [viewer/src/pro/ProCases.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProCases.tsx), [viewer/src/pro/store.ts](/Users/mikel/gitlaw/viewer/src/pro/store.ts), [api/pro/upload.ts](/Users/mikel/gitlaw/api/pro/upload.ts) |
| OCR / Translation Agent | BETA | OCR/DE-Arbeitsfassung als Job-Flow | [viewer/src/pro/store.ts](/Users/mikel/gitlaw/viewer/src/pro/store.ts), [viewer/src/pro/ProCases.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProCases.tsx), [api/ocr.ts](/Users/mikel/gitlaw/api/ocr.ts) |
| Workflow Recommendation Agent | NEXT | Naechsten besten Schritt empfehlen | [GITLAW_AGENT_ARCHITECTURE_DE.md](/Users/mikel/gitlaw/GITLAW_AGENT_ARCHITECTURE_DE.md), [GITLAW_AGENT_VISUAL_MAP_DE.md](/Users/mikel/gitlaw/GITLAW_AGENT_VISUAL_MAP_DE.md) |
| Research Agent | REAL | Strukturierte juristische Antwort mit Zitaten | [viewer/src/pro/ai.ts](/Users/mikel/gitlaw/viewer/src/pro/ai.ts), [api/ask-pro.ts](/Users/mikel/gitlaw/api/ask-pro.ts), [viewer/src/pro/ProResearch.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProResearch.tsx) |
| Citation Verification Agent | BETA | Zitate strukturiert pruefen / verifizierbar machen | [viewer/src/pro/ai.ts](/Users/mikel/gitlaw/viewer/src/pro/ai.ts), [api/ask-pro.ts](/Users/mikel/gitlaw/api/ask-pro.ts), [viewer/src/pro/types.ts](/Users/mikel/gitlaw/viewer/src/pro/types.ts) |
| Drafting Agent | REAL | Recherche + Kontext + Vorlage -> erster Entwurf | [viewer/src/pro/ProTemplates.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProTemplates.tsx), [viewer/src/pro/store.ts](/Users/mikel/gitlaw/viewer/src/pro/store.ts) |
| Memory Agent | BETA | Nur freigegebene Inhalte wiederverwendbar machen | [viewer/src/pro/store.ts](/Users/mikel/gitlaw/viewer/src/pro/store.ts), [viewer/src/pro/ai.ts](/Users/mikel/gitlaw/viewer/src/pro/ai.ts), [viewer/src/pro/ProResearch.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProResearch.tsx) |

## Menschenrollen

| Rolle | Zugriff | Code |
|---|---|---|
| `owner` | Vollzugriff, Settings, Kanzleikontrolle | [api/_auth.ts](/Users/mikel/gitlaw/api/_auth.ts), [viewer/src/pro/access.ts](/Users/mikel/gitlaw/viewer/src/pro/access.ts) |
| `anwalt` | Review, Freigabe, Memory, Audit | [api/_auth.ts](/Users/mikel/gitlaw/api/_auth.ts), [viewer/src/pro/access.ts](/Users/mikel/gitlaw/viewer/src/pro/access.ts) |
| `assistenz` | Intake, Aktenanlage, Upload, OCR/Translation anstossen, Draft vorbereiten | [api/_auth.ts](/Users/mikel/gitlaw/api/_auth.ts), [viewer/src/pro/access.ts](/Users/mikel/gitlaw/viewer/src/pro/access.ts) |
| `read_only` | Lesen, keine schreibenden Aktionen | [api/_auth.ts](/Users/mikel/gitlaw/api/_auth.ts), [viewer/src/pro/access.ts](/Users/mikel/gitlaw/viewer/src/pro/access.ts) |

## Session / Trust Layer

| Baustein | Aufgabe | Code |
|---|---|---|
| Signed Pro Session | Invite -> tenant-/role-Claims | [api/_auth.ts](/Users/mikel/gitlaw/api/_auth.ts), [api/pro/session.ts](/Users/mikel/gitlaw/api/pro/session.ts), [viewer/src/pro/ProAuth.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProAuth.tsx), [viewer/src/pro/pro-api.ts](/Users/mikel/gitlaw/viewer/src/pro/pro-api.ts) |
| Tenant-bound Sync | Snapshot-Sync nicht mehr ueber guessable key, sondern Session + tenantId | [api/pro/sync.ts](/Users/mikel/gitlaw/api/pro/sync.ts), [viewer/src/pro/sync.ts](/Users/mikel/gitlaw/viewer/src/pro/sync.ts) |
| Document Vault | Server-seitiger Dokumentpfad fuer Beta | [api/pro/upload.ts](/Users/mikel/gitlaw/api/pro/upload.ts), [viewer/src/pro/ProCases.tsx](/Users/mikel/gitlaw/viewer/src/pro/ProCases.tsx) |

## Wichtigste Luecken fuer `NEXT`

1. Echten OCR-Provider anbinden statt Beta-Job-Stub
2. Echten Translation-Provider mit Review-Queue anbinden
3. Workflow Recommendation Agent als laufenden Agenten einfuehren
4. Citation Verification als expliziten Server-Schritt trennen
5. Serverseitige Persistenz der Kernobjekte statt Sync-Snapshot als Hauptspeicher
