# GitLaw CrewAI Comparison

## Kurzurteil

Das CrewAI-Projekt ist als erster Architekturentwurf gut.

Es liegt in der Agentenliste nah an dem, was GitLaw wirklich sein sollte.

Aber:

- es ist noch zu generisch
- es denkt zu sehr in allgemeinen AI-Tools
- es bildet unseren echten Trust-/Tenant-/Review-Vorteil noch nicht scharf genug ab

## Was gut ist

### 1. Die Agentenliste ist weitgehend richtig

CrewAI hat diese Rollen erkannt:

- Intake Agent
- Document Agent
- OCR / Translation Agent
- Workflow Recommendation Agent
- Research Agent
- Citation Verification Agent
- Drafting Agent
- Memory Agent

Das passt sehr gut zu unserem eigenen Modell.

### 2. Der Workflow ist nah an unserem Hauptloop

Der generierte Flow ist:

- intake
- documents
- OCR / translation
- next steps
- research
- citation verification
- drafting
- memory

Das konvergiert klar mit unserem GitLaw-Ziel:

`intake -> documents -> research -> draft -> approval`

### 3. Human review ist zumindest erkannt

Der Entwurf sagt mehrfach, dass Human Review wichtig ist.

Das ist richtig und fuer Legal zwingend.

## Wo das CrewAI-Projekt zu schwach oder falsch ist

### 1. Zu viele generische Internet-Tools

In `crew.py` nutzt der Entwurf u. a.:

- `SerperDevTool`
- `ScrapeWebsiteTool`
- `OCRTool`
- `FileReadTool`

Das Problem:

- Workflow Recommendation sollte nicht aus Websuche kommen
- Citation Verification sollte nicht primaer Websuche/Scraping sein
- Legal trust in GitLaw sollte bevorzugt auf internem Fallkontext, lokalem Gesetzeskorpus und freigegebener Kanzlei-Memory beruhen

Kurz:

Fuer ein echtes GitLaw waere `web-first` zu schwach.
Wir brauchen `case-state-first` und `law-corpus-first`.

### 2. Kein echtes Trust-Modell

Im CrewAI-Entwurf fehlen als operative Architekturkerne:

- signierte Pro-Sessions
- tenant-bound sync
- serverseitige Rollenpruefung
- revisionsfaehige Freigabepunkte
- Dokument-Provenance

Das ist in GitLaw kein Detail, sondern zentral.

### 3. Memory ist zu abstrakt

Der CrewAI-Memory-Agent ist inhaltlich okay beschrieben, aber technisch noch zu unspezifisch.

Unser GitLaw-Ansatz ist strenger:

- nur freigegebene Inhalte
- nur tenant-gebunden
- Wiederverwendung fuer Recherche und Drafting

Nicht:

- ein allgemeiner "knowledge base" Speicher

### 4. Citation Verification ist noch nicht streng genug

Im Entwurf klingt der Verifier richtig, aber die Tool-Auswahl ist zu offen.

Fuer GitLaw sollte Verifikation idealerweise sein:

- gegen lokalen Gesetzeskorpus
- gegen bekannte Strukturen / Normen
- spaeter gegen belastbare Rechtsprechungsquellen

Nicht einfach:

- "such im Web, ob der Paragraph existiert"

### 5. Empfehlungssystem ist noch unscharf

Der `workflow_recommendation_agent` ist eine gute Idee, aber im CrewAI-Entwurf noch zu allgemein.

Bei GitLaw sollte er vor allem auswerten:

- Fristen
- Dokumentlage
- Sprachlage
- Falltyp
- letzter Arbeitsschritt
- offene Review-Gates

Also:

- interner Operations-Agent

nicht:

- allgemeiner Research-/Search-Agent

## Vergleich in einem Satz

CrewAI hat die richtige Agentenform gefunden.
GitLaw ist in der eigentlichen Produktionslogik bereits strenger, realistischer und moataehnlicher.

## Was wir aus dem CrewAI-Entwurf uebernehmen sollten

1. Die klare Benennung der 8 Agenten
2. Die Task-Kette als explizite Prozessdarstellung
3. Die Idee, Inputs/Outputs pro Agent noch strenger zu formalisieren

## Was wir NICHT uebernehmen sollten

1. Websuche als Standard fuer Workflow / Verifikation
2. zu lockere Tool-Zuordnung
3. zu wenig Fokus auf tenant / review / audit / provenance
4. generisches Memory ohne Freigabegrenze

## Mein Urteil

Wenn du das CrewAI-Projekt spaeter postest und wir es gegen GitLaw halten, wuerde ich sagen:

- strategisch: gut getroffen
- produktionsreif: noch nicht
- fuer GitLaw brauchbar: ja, als struktureller Ausgangspunkt
- direkt uebernehmbar: nein, nur nach harter Anpassung an unsere Trust- und Workflow-Realitaet

## Empfehlung

Die richtige Reihenfolge ist:

1. CrewAI-Architektur als Referenz nutzen
2. Gegen GitLaw-Code und GitLaw-Moat abgleichen
3. Erst dann `agents.yaml` und `tasks.yaml` bewusst auf unsere Version zuschneiden
