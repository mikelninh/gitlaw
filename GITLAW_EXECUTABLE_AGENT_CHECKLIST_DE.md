# GitLaw Executable Agent Checklist

## Zweck

Diese Checklist verbindet die Agenten-Eval-Matrix mit echten Produktpruefungen.

Es gibt zwei Ebenen:

1. `Automatisch pruefbar`
   - Session
   - Rollen / RBAC
   - tenant-bound sync
   - Upload-Vault
   - Research API
   - OCR-Stub-Verhalten

2. `Manuell pruefbar`
   - Intake UX
   - Dokumentansicht
   - Recherche -> Entwurf
   - Freigabe- und Exporterlebnis

## Automatische Checks

Das Skript:

- [scripts/test_gitlaw_agent_flows.py](/Users/mikel/gitlaw/scripts/test_gitlaw_agent_flows.py)

Ziel:

- gegen die Live-API oder lokale API laufen
- PASS / BETA / FAIL ausgeben
- JSON-Endpunkte auf Struktur und Schutz pruefen

### Gepruefte Punkte

1. Pro-Session Austausch
2. Session Resume
3. Unautorisierte Research-API blockiert
4. Autorisierte Research-API liefert strukturierten Output
5. tenant-bound Sync kann schreiben und lesen
6. Server-Dokument-Vault kann kleine Datei speichern
7. OCR-Endpunkt ist geschuetzt und liefert erwarteten Beta-Status

## Manuelle Checks

### 1. Bao-Flow

- `/#/bao`
- Pro starten
- VN-Intake
- Eingang/Akte
- Dokument
- Recherche
- Entwurf

### 2. Rollen-Flow

- `owner` testen
- `anwalt` testen
- `assistenz` testen
- pruefen, wo Freigaben und Sperren greifen

### 3. Memory-Flow

- Recherche stellen
- Antwort freigeben
- Folgefrage stellen
- pruefen, ob approved memory logisch wieder auftaucht

## Bewertungslogik

- `PASS` = live / reproduzierbar / sinnvoll
- `BETA` = live, aber bewusst vorlaeufig
- `FAIL` = live kaputt oder nicht vorhanden

## Erwartung aktuell

- Session / RBAC: PASS
- Sync: PASS
- Upload-Vault: PASS/BETA
- Research Agent: PASS
- OCR / Translation: BETA
- Workflow Recommendation: FAIL/NEXT
