# GitLaw Agent Test Cases

## Ziel

Diese Testfaelle pruefen nicht nur einzelne Features.

Sie pruefen, ob GitLaw als beaufsichtigtes Multi-Agent-System im echten Kanzlei-Loop funktioniert.

Status:

- `PASS` = heute sinnvoll testbar
- `BETA` = testbar, aber noch mit Stub / Vorbehalt
- `NEXT` = noch nicht sinnvoll produktnah testbar

## Testfall 1: Mehrsprachiger Intake -> strukturierter Eingang

### Szenario

Ein vietnamesischsprachiger Mandant schickt eine Erstanfrage mit:

- Name
- Telefonnummer
- kurzer Fallbeschreibung
- Hinweis auf Frist
- 2 Dateianhaengen

### Was passieren soll

1. Intake wird erfasst
2. Sprache / Dringlichkeit / Fristsignal sind sichtbar
3. Eingang ist reviewbar
4. Akte kann daraus uebernommen werden

### Gepruefte Agenten

- Intake Agent
- teilweise Workflow Recommendation Vorbereitung

### Erwartung heute

- `PASS` fuer Struktur, Review, Uebernahme
- `BETA` fuer echte automatische inhaltliche Intake-Klassifikation

## Testfall 2: Dokument hochladen -> klassifizieren -> sicher speichern

### Szenario

Assistenz laedt einen Bescheid als PDF oder Foto in eine bestehende Akte hoch.

### Was passieren soll

1. Dokument bekommt internen Namen
2. Kategorie und Sprache bleiben an der Datei
3. Datei geht bevorzugt in den serverseitigen Vault
4. Falls der Vault nicht verfuegbar ist, faellt der Flow kontrolliert auf lokal zurueck

### Gepruefte Agenten

- Document Agent
- Upload / Vault Layer

### Erwartung heute

- `PASS` fuer Benennung, Metadaten, Aktenzuordnung
- `BETA` fuer finalen produktiven EU-Storage

## Testfall 3: OCR / DE-Arbeitsfassung fuer fremdsprachiges Dokument

### Szenario

Ein vietnamesischer oder tue rkischer Bescheid wird in die Akte geladen.

### Was passieren soll

1. OCR-Job wird angelegt
2. DE-Arbeitsfassung wird erzeugt
3. Anwalt kann die DE-Fassung freigeben

### Gepruefte Agenten

- OCR / Translation Agent

### Erwartung heute

- `BETA`

Warum:

- Jobflow und Review existieren
- echter OCR-/Translation-Provider fehlt noch

## Testfall 4: Recherche mit freigegebenem Memory

### Szenario

Ein:e Anwalt:in stellt eine Folgefrage zu einem aehnlichen Fall, nachdem bereits freigegebene Rechercheantworten existieren.

### Was passieren soll

1. Frage geht ueber serverseitigen Research-Pfad
2. strukturierte Antwort kommt zurueck
3. Zitate sind getrennt vom Fliesstext
4. approved memory fliesst als Stil-/Inhaltshilfe ein

### Gepruefte Agenten

- Research Agent
- Memory Agent
- Citation Verification Layer

### Erwartung heute

- `PASS` fuer serverseitige Research-Session und structured output
- `BETA` fuer tiefe Citation-Verifikation und starkes Retrieval

## Testfall 5: Recherche -> erster Entwurf -> anwaltliche Freigabe

### Szenario

Nach der Recherche wird ein Schriftsatz aus Vorlage + Rechtsgrundlagen + Fallkontext erzeugt.

### Was passieren soll

1. Drafting wird aus dem Fall gestartet
2. Entwurf ist bearbeitbar
3. Anwalt bleibt Freigabestelle
4. finaler Text kann gespeichert/exportiert werden

### Gepruefte Agenten

- Drafting Agent
- Human Review

### Erwartung heute

- `PASS` fuer den Grundflow
- `BETA` fuer volle Dokumenten-/Memory-Tiefe im Draft

## Testfall 6: Tenant- und Rollen-Schutz

### Szenario

Ein:e Nutzer:in ohne passende Rolle oder ohne gueltige Session versucht:

- Pro-Research API
- Pro-Sync API
- Upload API

### Was passieren soll

1. ohne Bearer-Session -> 401
2. falsche Rolle -> 403
3. keine tenant-fremden Dokumente / Snapshots lesbar

### Gepruefte Bausteine

- Signed Session
- RBAC
- tenant-bound sync
- document vault isolation

### Erwartung heute

- `PASS`

## Testfall 7: Next-best-step Empfehlung

### Szenario

Ein Fall hat Frist, Bescheid, noch keine OCR und noch keinen Entwurf.

### Was passieren soll

Das System sollte vorschlagen:

- zuerst Frist sichern
- dann OCR / DE-Arbeitsfassung
- dann Recherche
- dann Entwurf

### Gepruefte Agenten

- Workflow Recommendation Agent

### Erwartung heute

- `NEXT`

Warum:

- logisch definiert
- noch kein echter Agent im Produkt

## Testfazit heute

### Schon stark

- Rollen / Session / tenant trust
- dokumentenzentrierter Upload- und Case-Flow
- serverseitige strukturierte Recherche
- Drafting-Grundflow
- approved memory als Startpunkt

### Noch nicht stark genug

- echter OCR-/Translation-Provider
- Recommendation Agent
- tiefer Citation-Verifier
- serverseitige Persistenz aller Kernobjekte

## Die 3 wichtigsten Live-Tests fuer jetzt

1. Bao-Flow:
   vietnamesischer Intake -> Akte -> Dokument -> Recherche -> Entwurf

2. Rollen-Test:
   `assistenz` vs `anwalt` gegen Upload, Review, Audit

3. Memory-Test:
   eine freigegebene Recherche speichern, dann aehnliche Folgefrage stellen und Qualitaet vergleichen
