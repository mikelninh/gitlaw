# GitLaw Next Production Sprint

Stand: Mai 2026

## Ziel

Nach dem bestandenen Pilot-Kerncheck `9 PASS / 0 BETA / 0 FAIL` geht es nicht mehr um Grundvertrauen, sondern um den naechsten echten Produktionssprung:

1. PDF-OCR fuer reale Kanzleidokumente
2. finaler EU-Storage-Pfad fuer groessere Dateien
3. tiefere serverseitige Persistenz des Kernloops

## Warum jetzt genau diese drei

Der aktuelle agentische Kernpfad funktioniert fuer:

- Sessions
- RBAC
- tenant-bound Sync
- Dokument-Vault
- strukturierte Recherche
- OCR / Translation fuer Textdokumente

Die groessten echten Produktionsluecken liegen deshalb nicht mehr vorne im Workflow, sondern in der Tiefe des Dokumenten- und Persistenzstacks.

## Sprint A: PDF-OCR Worker

### Ziel

Fotos, Bescheide und gescannte PDFs sollen serverseitig in echten OCR-Text ueberfuehrt werden, nicht nur Textdateien oder einzelne Bilder.

### Lieferumfang

- PDF-Upload aus dem Vault lesen
- PDF in Seitenbilder oder Textlayer zerlegen
- OCR pro Seite ausfuehren
- Ergebnis als zusammengefuehrter OCR-Text speichern
- Status / Fehler / Provider im Job sichtbar machen

### Erfolgscheck

- mehrseitiger PDF-Bescheid laeuft serverseitig durch
- OCR-Text ist im Dokument sichtbar
- Folge-Uebersetzung kann darauf aufbauen

## Sprint B: EU-Storage Layer

### Ziel

Der aktuelle Beta-Vault soll von einem Basis-Adapter auf einen robusteren Produktionspfad gehen.

### Lieferumfang

- echter Storage-Adapter fuer groessere Dateien
- Upload-/Download-Signed-Flow
- klare Dateigroessen- und Typgrenzen
- Tenant-Bindung und Audit weiter beibehalten

### Erfolgscheck

- groeßere reale Dokumente koennen stabil hochgeladen werden
- Download und OCR-Weitergabe funktionieren ohne Browser-Fallback

## Sprint C: Server-Persistenz Kernloop

### Ziel

Der Kernloop soll nicht mehr wesentlich auf Browser-Local-State beruhen.

### Lieferumfang

- serverseitige Persistenz fuer:
  - cases
  - documents
  - documentJobs
  - research
  - letters
- Viewer arbeitet weiter, aber gegen serverseitige Kernobjekte

### Erfolgscheck

- neues Geraet oder neue Session sieht denselben Kanzleistand
- Dokument -> Recherche -> Entwurf ist serverseitig nachvollziehbar

## Reihenfolge

1. PDF-OCR Worker
2. EU-Storage Layer
3. Server-Persistenz Kernloop

## Nicht Teil dieses Sprints

- allgemeiner Workflow-Recommendation-Agent
- Grosskanzlei-/Enterprise-Ausbau
- neue Practice-Area-Packs
- kosmetische AI-Features ohne Einfluss auf den Kernloop

## Erfolgsdefinition

Wenn dieser Produktionssprint gelingt, ist GitLaw Pro nicht nur pilot-ready, sondern deutlich naeher an:

- realem dokumentintensivem Kanzleibetrieb
- wiederholbarer Produktionsqualitaet
- glaubwuerdigerem Paid-Pilot-Upgrade
