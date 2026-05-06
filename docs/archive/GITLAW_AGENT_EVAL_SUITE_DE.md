# GitLaw Agent Eval Suite

## Ziel

Diese Suite bewertet GitLaw pro Agent nicht nur technisch, sondern qualitativ:

- was ist der Input
- was soll als Output entstehen
- welche unterschiedlichen Eingaben sollten wir pruefen
- wie stark ist der aktuelle Output

## Bewertungsraster

Pro Fall:

- `schwach` = unklar, instabil, nicht hilfreich genug
- `okay` = brauchbar, aber mit sichtbarer Nacharbeit oder Einschraenkung
- `stark` = klar, nuetzlich, vertrauenswuerdig genug fuer den Pilotalltag

## 1. Intake Agent

### Fall A: vietnamesischer Migrationsfall

- `Input`: VN-Formular mit Aufenthaltstitel-Verlaengerung, Frist in 10 Tagen
- `Erwarteter Output`: strukturierter Eingang mit Sprache, Frist-Hinweis, Dringlichkeit, Uebernahme in Akte
- `Bewertung heute`: `stark`

### Fall B: knapper Strafrechtsfall mit wenig Infos

- `Input`: sehr kurze Beschreibung, nur Name, Telefon, "Strafbefehl bekommen"
- `Erwarteter Output`: trotzdem sauberer Eingang, aber sichtbar unvollstaendig
- `Bewertung heute`: `okay`

### Fall C: widerspruechliche oder chaotische Angaben

- `Input`: unklare Sprache, gemischte Felder, Frist nicht sauber genannt
- `Erwarteter Output`: Eingang landet trotzdem, aber Priorisierung bleibt konservativ
- `Bewertung heute`: `okay`

## 2. Document Agent

### Fall A: Textdatei

- `Input`: `.txt` mit einfachem Bescheidtext
- `Erwarteter Output`: interner Name, Vault-ID, Checksumme, direkter Textpfad
- `Bewertung heute`: `stark`

### Fall B: Foto / Handybild

- `Input`: Foto eines Dokuments
- `Erwarteter Output`: Aktenzuordnung, OCR moeglich, Sprache bleibt erhalten
- `Bewertung heute`: `stark`

### Fall C: PDF-Bescheid mit Textlayer

- `Input`: digital erzeugtes PDF
- `Erwarteter Output`: serverseitige Ablage, Textlayer spaeter fuer OCR nutzbar
- `Bewertung heute`: `stark`

### Fall D: grosses Scan-PDF ohne Textlayer

- `Input`: gescannter Bescheid als PDF
- `Erwarteter Output`: Upload okay, OCR spaeter ueber spezialisierten Worker
- `Bewertung heute`: `okay`

## 3. OCR Agent

### Fall A: Textdatei

- `Input`: `.txt`
- `Erwarteter Output`: direkter OCR/Text ohne LLM
- `Bewertung heute`: `stark`

### Fall B: Bilddatei

- `Input`: Foto eines Bescheids
- `Erwarteter Output`: serverseitiger OCR-Text
- `Bewertung heute`: `stark`

### Fall C: PDF mit Textlayer

- `Input`: PDF aus Portal / Behorde
- `Erwarteter Output`: Textlayer wird extrahiert
- `Bewertung heute`: `stark`

### Fall D: Scan-PDF ohne Textlayer

- `Input`: eingescanntes PDF
- `Erwarteter Output`: spaeter echter OCR-Worker
- `Bewertung heute`: `schwach`

## 4. Translation Agent

### Fall A: vietnamesischer Text

- `Input`: OCR-Text auf Vietnamesisch
- `Erwarteter Output`: verstaendliche DE-Arbeitsfassung
- `Bewertung heute`: `stark`

### Fall B: tuerkischer Verwaltungstext

- `Input`: OCR-Text auf Tuerkisch
- `Erwarteter Output`: nuetzliche DE-Fassung
- `Bewertung heute`: `okay`

### Fall C: chaotischer OCR-Text

- `Input`: verrauschter OCR-Auszug
- `Erwarteter Output`: DE-Fassung bleibt nuetzlich, aber mit Fehlern moeglich
- `Bewertung heute`: `okay`

## 5. Research Agent

### Fall A: klare dogmatische Frage

- `Input`: konkrete Rechtsfrage mit Gesetzesbezug
- `Erwarteter Output`: strukturierte Antwort mit Zitaten
- `Bewertung heute`: `stark`

### Fall B: praxisnahe Folgefrage

- `Input`: Anschlussfrage auf vorige Recherche
- `Erwarteter Output`: sinnvoller Verlauf statt Neustart
- `Bewertung heute`: `okay`

### Fall C: unscharfe Frage

- `Input`: "Was koennen wir hier machen?"
- `Erwarteter Output`: brauchbarer Start, aber eher allgemeiner
- `Bewertung heute`: `okay`

### Fall D: hochpraeziser Spezialfall

- `Input`: sehr enger Randfall
- `Erwarteter Output`: Antwort mit hohem Korrekturbedarf moeglich
- `Bewertung heute`: `okay`

## 6. Drafting Agent

### Fall A: klassischer Widerspruch

- `Input`: Akte + Vorlage + Felder
- `Erwarteter Output`: sauberer erster Entwurf
- `Bewertung heute`: `stark`

### Fall B: Dokumentkontext direkt uebernehmen

- `Input`: OCR-/DE-Text aus Dokument + Vorlage
- `Erwarteter Output`: schnellerer Entwurf mit echtem Fallbezug
- `Bewertung heute`: `stark`

### Fall C: sehr komplexer individueller Schriftsatz

- `Input`: viele freie Argumente, wenig klare Vorlage
- `Erwarteter Output`: guter Rohentwurf, aber keine Vollautomatik
- `Bewertung heute`: `okay`

## 7. Memory Agent

### Fall A: freigegebene Antwort wird spaeter wieder relevant

- `Input`: Antwort pruefen/freigeben, spaeter aehnliche Frage
- `Erwarteter Output`: reuse im Research-Kontext
- `Bewertung heute`: `okay`

### Fall B: sehr aehnliche Folgefrage derselben Praxis

- `Input`: fast gleiche Konstellation
- `Erwarteter Output`: approved memory sollte staerker helfen
- `Bewertung heute`: `okay`

### Fall C: ganz anderer Rechtsbereich

- `Input`: irrelevante neue Frage
- `Erwarteter Output`: Memory sollte nicht stoeren
- `Bewertung heute`: `stark`

## 8. Trust / RBAC / Persistence

### Fall A: ohne Session

- `Input`: API-Aufruf ohne Bearer-Token
- `Erwarteter Output`: `401`
- `Bewertung heute`: `stark`

### Fall B: tenant-bound Daten

- `Input`: Sync / Vault / Entities
- `Erwarteter Output`: klar tenant-gebunden
- `Bewertung heute`: `stark`

### Fall C: serverseitige Kernpersistenz

- `Input`: `cases`, `research`, `letters`
- `Erwarteter Output`: dual-write serverseitig
- `Bewertung heute`: `okay`

## 9. Workflow Recommendation Agent

### Fall A: Frist nah, keine Recherche

- `Input`: aktive Akte mit Frist in 3 Tagen, Dokumenten vorhanden, aber noch keine Recherche
- `Erwarteter Output`: System priorisiert Recherche statt generischer Dashboard-Texte
- `Bewertung heute`: `stark`

### Fall B: Fremdsprachiges Dokument ohne DE-Fassung

- `Input`: vietnamesisches Dokument mit OCR/Text, aber ohne Uebersetzung
- `Erwarteter Output`: System empfiehlt zuerst DE-Arbeitsfassung statt direkt Schreiben
- `Bewertung heute`: `stark`

### Fall C: Recherche vorhanden, aber noch kein Schreiben

- `Input`: Akte mit gepruefter Recherche, aber ohne Entwurf
- `Erwarteter Output`: System schickt sinnvoll in den Drafting-Schritt
- `Bewertung heute`: `stark`

## Gesamtbewertung heute

- `Intake Agent`: `7.5/10`
- `Document Agent`: `8.5/10`
- `OCR Agent`: `8/10`
- `Translation Agent`: `8/10`
- `Research Agent`: `8/10`
- `Drafting Agent`: `7.5/10`
- `Memory Agent`: `6.5/10`
- `Trust / RBAC / Persistence`: `9/10`
- `Workflow Recommendation Agent`: `7.5/10`

## Wichtigste naechste qualitative Tests

1. echter Scan-PDF-Fall ohne Textlayer
2. schwierige OCR-/Uebersetzungsqualitaet bei schlechten Fotos
3. Drafting mit 2-3 echten Bao-Faellen
4. Memory-Reuse ueber mehrere freigegebene Antworten
5. Recommendation-Qualitaet ueber mehrere reale Frist- und Dokumentlagen
