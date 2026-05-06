# GitLaw Buerger: Skalierbare Abdeckung

## Die ehrliche Antwort

`Alles` laesst sich nicht skalierbar abdecken, wenn wir nur:

- freie Gesetzessuche machen
- ein LLM auf Rohgesetze werfen
- oder fuer jede Frage eine feste Antwort hinterlegen

Die skalierbare Form ist eine mehrschichtige Architektur.

## Zielbild

Eine Buergerfrage soll durch diese Pipeline laufen:

1. `Problem verstehen`
2. `Intent / Topic erkennen`
3. `fehlende Fakten nachfragen`
4. `passende Rechtsquellen holen`
5. `Antwort in festem Format geben`
6. `naechsten Schritt empfehlen`
7. `sagen, wann menschliche Hilfe noetig ist`

## Die 7 Schichten

### 1. Intent Layer

Nicht nach Paragraphen starten, sondern nach Lebensproblemen:

- Eigenbedarf
- Kuendigung im Job
- Medikamente zu teuer
- Tierquaelerei
- Mietminderung
- Buergergeld-Kuerzung
- Unterhalt
- Online-Beleidigung

Diese Schicht ist keine starre Antwortdatenbank, sondern ein `Problemkatalog`.

Jeder Intent hat:

- Alltagssprache / Synonyme
- Kategorie
- Unterthemen
- Kernnormen
- bevorzugte Paragraphen
- typische Risiken
- typische Fristen
- typische naechste Schritte
- moegliche Rueckfragen

### 2. Slot / Fact Layer

Viele Fragen sind noch nicht beantwortbar, ohne 1-3 zusaetzliche Fakten.

Beispiele:

- `Hast du schon eine schriftliche Kündigung?`
- `Bist du gesetzlich oder privat versichert?`
- `Geht es um deinen Hauptwohnsitz?`
- `Hast du schon einen Bescheid vom Jobcenter?`

Diese Schicht verhindert:

- zu fruehe Schein-Antworten
- unpassende Paragraphen
- uebermaessige Generik

### 3. Retrieval Layer

Nicht alles durchsuchen, sondern gestuft:

1. `Topic pack`
2. `Kernnormen`
3. `erklaerende Paragraphen`
4. `erst dann` breiteres Retrieval

Quellenarten:

- vorerklaerte Kernparagraphen
- Vollgesetzestexte
- spaeter Leitsaetze / Verwaltungsinfos / Hilfsstellen

### 4. Answer Layer

Die Antwort darf nie frei im Stil variieren.

Zielstruktur:

- `Kurz gesagt`
- `Worauf es ankommt`
- `Was du jetzt tun kannst`
- `Wann du schnell handeln solltest`
- `Quellen`

Optional:

- `Was dir eher nicht hilft`
- `Was du vorbereiten solltest`

### 5. Escalation Layer

GitLaw muss klar sagen, wann es nicht reicht.

Beispiele:

- Frist laeuft sofort
- Strafverfahren
- Aufenthaltsrecht mit Abschiebungsrisiko
- Kindesentzug / Gewalt / Schutzbedarf

Dann nicht nur Antwort geben, sondern:

- `Das ist dringend`
- `Sichere diese Dokumente`
- `Hole anwaltliche Hilfe`

### 6. Evaluation Layer

Nicht nur "funktioniert irgendwie", sondern messbar:

- richtiger Intent?
- richtige Quellen?
- hilfreiche naechste Schritte?
- richtige Eskalation?
- keine Halluzination?
- lesbar fuer normale Menschen?

### 7. Data Flywheel

Skalierung kommt aus wiederverwendbarer Struktur:

- echte Nutzerfragen sammeln
- clustern
- neue Intents bauen
- schlechte Antworten markieren
- Rueckfragen verbessern
- Retrieval verbessern

## Was wirklich skalierbar ist

### Nicht skalierbar

- jede Frage als starre Antwort einzubauen
- nur auf generatives Modellvertrauen zu setzen
- nur auf Keyword-Matching zu setzen

### Skalierbar

- `100-300` gute Buerger-Intents
- pro Intent `2-8` Slots / Rueckfragen
- pro Intent `3-10` Kernquellen
- feste Antwortstruktur
- Eval-Suite + echtes Feedback

Das ist nah an einem `legal decision graph`, nicht an einer FAQ.

## Praktischer Ausbauplan

### Phase 1: Top 20 Intents

- Miete
- Arbeit
- Buergergeld
- Gesundheit
- Familie
- Tierschutz
- Online-Beleidigung
- Diskriminierung

Ziel:

- 60-70% der haeufigsten Alltagsfragen brauchbar

### Phase 2: Rueckfragen-Engine

Pro Intent 1-3 fehlende Fakten:

- schriftlicher Bescheid?
- Frist?
- Versicherungstyp?
- Hauptwohnung?

Ziel:

- weniger generische Antworten

### Phase 3: Hybrid RAG

- Intent liefert die Leitplanken
- Retrieval liefert die Rechtsquellen
- LLM formuliert

Ziel:

- bessere Generalisierung ohne Wildwuchs

### Phase 4: Escalation + Routing

- Dringlichkeit erkennen
- zu Pro / Anwalt / Musterbrief / Hotline / Amt weiterfuehren

## Erfolgskriterien

Skalierung ist gelungen, wenn:

- `>= 80%` der Top-50 Alltagsfragen auf den richtigen Intent gehen
- `>= 75%` der Antworten fuer Nutzer sofort hilfreich wirken
- `>= 90%` der Antworten mindestens eine passende Quelle nennen
- `0` halluzinierte Paragraphen
- dringende Faelle werden sichtbar als dringend markiert

## Empfehlung

Der richtige Weg ist:

- `Intent Registry`
- `Slot Questions`
- `Topic Packs`
- `Answer Templates`
- `Eval Harness`

Nicht:

- mehr Freitext-Magie
- mehr Rohgesetz-Suche
- mehr Einzelfall-Patches in der UI
