# Upload Flow Sprint

Stand: 2026-04-30

## Sprint-Ziel
Von "Dokumentjob vormerken" zu "echte Datei hochladen und verarbeiten".

## Scope

### 1. Dokument-Upload
- Datei aus Intake oder Akte hochladen
- Metadaten + Storage-Referenz speichern
- Dokument in Chronologie sichtbar

### 2. OCR-Job
- OCR anstossen
- Status `queued -> processing -> done`
- Ergebnistext speichern

### 3. Translation-Job
- fuer nicht-deutsche Dokumente
- DE-Arbeitsfassung erzeugen
- Flag: `maschinell uebersetzt`

### 4. Review-UI
- Original / OCR / DE-Fassung nebeneinander
- Anwalt kann freigeben oder verwerfen

## Technische Reihenfolge
1. Document-Entity definieren
2. Upload-Endpunkt und Storage-Adapter bauen
3. Case-UI fuer Upload
4. OCR-Queue-Endpunkt
5. Review-Ansicht

## Nicht Teil dieses Sprints
- finaler Provider-Lock-in
- Massenverarbeitung
- Volltextsuche ueber alle Dokumente

## Entscheidung vor Start
- EU-Storage-Ziel festlegen
- OCR-Provider shortlist festlegen
- max. Dateigroesse / Dateitypen bestimmen
