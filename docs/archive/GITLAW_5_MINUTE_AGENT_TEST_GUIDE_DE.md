# GitLaw 5-Minute Agent Test Guide

## Ziel

In 5 bis 10 Minuten verstehen:

- welcher Agent was tut
- was der Input ist
- was als Output zurueckkommt
- wo ein LLM beteiligt ist

## 1. Intake Agent

- `Input`: ausgefuelltes Mandant:innen-Formular
- `GitLaw macht`: strukturiert Sprache, Dringlichkeit, Frist-Hinweis und Anliegen
- `Output`: neuer Eingang in Inbox / Akte
- `LLM`: nein
- `Test`: `/#/bao` -> `VN-Intake testen` -> danach `Akte/Inbox`

## 2. Document Agent

- `Input`: hochgeladene Datei
- `GitLaw macht`: interner Dateiname, Kategorie, Sprache, Server-Vault-Zuordnung, Checksumme
- `Output`: Dokumenteintrag in der Akte
- `LLM`: nein
- `Test`: in einer Akte Datei hochladen

## 3. OCR Agent

- `Input`: Textdatei, Bild oder PDF mit Textlayer
- `GitLaw macht`: extrahiert Text serverseitig
- `Output`: `OCR / Text`
- `LLM`: bei Bild-OCR ja, bei Text/PDF-Textlayer nein
- `Test`: Dokument oeffnen -> `OCR starten`

## 4. Translation Agent

- `Input`: OCR-Text oder Quelltext in anderer Sprache
- `GitLaw macht`: erzeugt eine DE-Arbeitsfassung
- `Output`: `DE-Fassung`
- `LLM`: ja, OpenAI
- `Test`: nicht-deutsches Dokument -> `Uebersetzung DE erzeugen`

## 5. Research Agent

- `Input`: juristische Frage
- `GitLaw macht`: strukturierte Antwort mit Zitatobjekten
- `Output`: Antwort + Zitate + Verlauf
- `LLM`: ja, OpenAI
- `Test`: `/#/pro/recherche`

Beispiel:

```text
Welche Verteidigungsansätze bei Strafbefehl wegen § 263 StGB, wenn bei der ersten Vernehmung erhebliche Sprachprobleme bestanden?
```

## 6. Drafting Agent

- `Input`: Akte + Vorlage + Felder + optional Recherche + optional Dokumenttext
- `GitLaw macht`: baut einen ersten Entwurf / Schriftsatz
- `Output`: Textvorschau, Mailtext, PDF
- `LLM`: heute nicht zwingend, vor allem Template- und Workflow-basiert
- `Test`: `Schreiben` -> Vorlage waehlen -> Dokumentkontext uebernehmen

## 7. Memory Agent

- `Input`: freigegebene Rechercheantwort
- `GitLaw macht`: speichert die freigegebene Fassung fuer spaetere aehnliche Fragen
- `Output`: wiederverwendbares Kanzlei-Memory
- `LLM`: nein fuer das Speichern, spaeter indirekt ja fuer bessere neue Antworten
- `Test`: Antwort pruefen/freigeben -> aehnliche Folgefrage stellen

## Was kostet LLM-Nutzung?

- `Nein`: Sessions, RBAC, Sync, Upload, Aktenlogik
- `Ja`: Recherche, Uebersetzung, Bild-OCR
- `Teilweise nein`: Textdatei-OCR und PDF-Textlayer-Extraktion

## Schnellster Testablauf

1. VN-Intake ausfuellen
2. Eingang in Akte pruefen
3. Datei hochladen
4. OCR starten
5. ggf. DE-Uebersetzung erzeugen
6. Recherchefrage stellen
7. Schreiben oeffnen und Dokumenttext in Entwurf uebernehmen
