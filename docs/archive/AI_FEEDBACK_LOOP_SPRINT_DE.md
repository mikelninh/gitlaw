## AI Feedback Loop Sprint

Ziel: GitLaw Pro soll nicht nur Antworten erzeugen, sondern aus anwaltlich freigegebenen Antworten besser werden.

### Phase 1

1. Approved Answer Memory
- Freigegebene Rechercheantworten werden mit Frage, Fallbezug und Tenant-Kontext gespeichert.
- Neue Recherchen erhalten passende freigegebene Beispiele als Kanzlei-internen Erfahrungsschatz.

2. Anwaltliche Freigabefassung
- Vor dem Markieren als geprueft kann die Antwort in eine finale Fassung ueberarbeitet werden.
- Diese finale Fassung wird fuer spaetere Recherchen wiederverwendet.

3. Tenant-sichere Wiederverwendung
- Memory-Beispiele werden nur innerhalb desselben Tenant-Kontexts geladen.
- Damit bleibt spaetere Multi-Kanzlei-Isolation kompatibel.

### Phase 2

1. Practice Memory Retrieval
- Bessere Aehnlichkeitssuche ueber Rechtsgebiet, Sprache, Dokumenttyp und Fallkontext.

2. Specialized Agents
- Intake Agent: priorisiert Dringlichkeit, Frist und naechste Schritte.
- Document Agent: erkennt Sprache, OCR- und Uebersetzungsbedarf.
- Research Agent: erzeugt Erstantwort.
- Verification Agent: prueft Zitate, markiert Unsicherheit.
- Drafting Agent: ueberfuehrt freigegebene Recherche in Schriftsatzentwuerfe.

3. Workflow Memory
- Wiederkehrende Muster wie vietnamesische Intake-Faelle mit Behoerdenbescheiden sollen automatisch OCR, Uebersetzung und Checklisten ausloesen.

### Phase 3

1. Quality Loop
- Freigegeben, verworfen, korrigiert: jede Antwort bekommt ein Outcome-Signal.
- Daraus werden spaeter Prompt-Optimierung und Ranking verbessert.

2. Production-Hardening
- Serverseitige Speicherung statt localStorage.
- Auditierbare Freigabe- und Aenderungshistorie.
- API-seitige Tenant- und Rollenpruefung fuer alle Memory- und Agenten-Endpunkte.

### Jetzt umgesetzt

1. Memory-Speicherung fuer freigegebene Rechercheantworten.
2. Memory-gestuetzte Kontextanreicherung bei neuen Recherchen.
3. UI fuer anwaltliche Freigabefassung vor der finalen Markierung.
