# GitLaw Buerger-Intent-Plan

## Ziel

GitLaw fuer Buerger soll nicht bei Alltagssprache scheitern. Die richtige Pipeline ist:

1. `Intent verstehen`
2. `Rechtsproblem clustern`
3. `passende Kernnormen holen`
4. `Antwort in fester Struktur geben`
5. `bei Unsicherheit Rueckfrage stellen`

## Warum die alte Architektur zu schwach war

- Sie suchte zu stark nach Woertern in Gesetzen.
- Buerger fragen in Lebenssituationen, nicht in Paragraphensprache.
- Retrieval ohne stabile Intent-Schicht fuehrt zu vielen Totalausfaellen.

## Neue Architektur

### 1. Intent Registry

Eine gepflegte Liste haeufiger Buergerprobleme mit:

- `id`
- `category`
- `terms`
- `sourceLawIds`
- `preferredSections`
- `answer`
- `sources`

### 2. Intent Detection

Die Nutzerfrage wird zuerst auf einen Problem-Cluster gemappt, z. B.:

- Eigenbedarf
- Kuendigung im Job
- Medikamente zu teuer
- Tierquaelerei melden
- Mietminderung
- Mieterhoehung
- Buergergeld

### 3. Retrieval

Wenn ein Intent erkannt wird:

- zuerst passende Kernnormen
- erst danach generisches Retrieval

Wenn kein Intent erkannt wird:

- bestehende RAG-Pipeline

### 4. Antwortformat

Alle Buergerantworten sollen spaeter dieses Format nutzen:

- `Kurz gesagt`
- `Worauf es ankommt`
- `Was du jetzt tun kannst`
- `Quellen`

### 5. Rueckfragen statt Totalausfall

Spaeter fuer unklare Fragen:

- `Geht es um gesetzliche oder private Krankenversicherung?`
- `Hast du schon eine schriftliche Kuendigung bekommen?`
- `Geht es um Miete, Nebenkosten oder Reparaturen?`

## Top-Ausbaufolge

### Phase 1

- Eigenbedarf
- Job-Kuendigung
- Tierquaelerei
- Medikamente zu teuer
- Mietminderung
- Mieterhoehung
- Buergergeld

### Phase 2

- Wohngeld
- Unterhalt
- Kindergeld
- Krankmeldung
- Abmahnung
- Online-Beleidigung
- Diskriminierung

### Phase 3

- Rueckfragen-Engine
- bessere Quellen-Bloecke
- spaeter Hybrid aus Intent + generativer Antwort

## Bereits umgesetzt

- erste `citizen-intents.ts`
- Intent Detection vor RAG
- strukturierter Einstieg fuer mehrere Kernprobleme

## Naechste technische Schritte

1. Intent Registry auf 20-30 Kernprobleme erweitern
2. Antwortformat auf `Kurz gesagt / wichtig / naechster Schritt / Quellen` vereinheitlichen
3. Rueckfragen bei niedriger Sicherheit
4. mehr Topic-spezifische Gesetzesabschnitte hinterlegen
