# GitLaw Agent Visual Map

## 1. Gesamtbild

```mermaid
flowchart LR
    A[Mandant:in / Intake] --> B[Intake Agent]
    B --> C[Inbox / Eingang]
    C --> D[Assistenz / Anwalt]
    D --> E[Document Agent]
    E --> F[Dokument-Vault]
    F --> G[OCR / Translation Agent]
    G --> H[Workflow Recommendation Agent]
    H --> I[Research Agent]
    I --> J[Citation Verification Agent]
    J --> K[Drafting Agent]
    K --> L[Anwaltliche Freigabe]
    L --> M[Export / Versand / PDF]
    L --> N[Memory Agent]
    N --> I
    N --> K
```

Kurz:

- links kommt rohes Material rein
- in der Mitte arbeiten spezialisierte Agenten
- rechts bleibt die Freigabe beim Menschen
- unten speichert Memory nur freigegebene Qualitaet

## 2. Rollenkarte

```mermaid
flowchart TD
    subgraph Human Roles
      O[owner]
      P[anwalt]
      Q[assistenz]
      R[read_only]
    end

    subgraph Agent Roles
      S[Intake Agent]
      T[Document Agent]
      U[OCR / Translation Agent]
      V[Workflow Recommendation Agent]
      W[Research Agent]
      X[Citation Verification Agent]
      Y[Drafting Agent]
      Z[Memory Agent]
    end

    O --> S
    O --> T
    O --> W
    P --> W
    P --> X
    P --> Y
    P --> Z
    Q --> S
    Q --> T
    Q --> U
    R --> W
```

## 3. Wer darf was

```text
owner
- Einstellungen
- Vollzugriff
- Kanzlei-Konfiguration

anwalt
- Recherche freigeben
- DE-Fassung freigeben
- Schreiben finalisieren
- Memory erzeugen

assistenz
- Fälle anlegen
- Intake übernehmen
- Dokumente hochladen
- OCR/Translation anstoßen
- Recherche/Draft vorbereiten

read_only
- lesen
- kein schreibender Eingriff
```

## 4. Agenten einzeln

### Intake Agent

```text
Input:
- Formularfelder
- Freitext
- Datei-Metadaten

Output:
- strukturierter Eingang
- Dringlichkeit
- Fristsignal
- offene Rückfragen
```

Stand heute:

- teilweise real
- Intake-Struktur, Triage-Felder und Review-Flow existieren
- noch kein autonomer serverseitiger Klassifikator

### Document Agent

```text
Input:
- hochgeladene Datei
- Akte
- Kategorie / Sprache

Output:
- interner Dateiname
- Dokument-Metadaten
- Zuordnung zur Akte
- Vault-Referenz
```

Stand heute:

- real
- Dateibenennung, Kategorisierung, Sprachhinweis, Aktenzuordnung existieren

### OCR / Translation Agent

```text
Input:
- Dokument
- Sprache
- gewünschte Zielverarbeitung

Output:
- OCR-Text
- DE-Arbeitsfassung
- Review-Status
```

Stand heute:

- Job-System real
- eigentliche Verarbeitung noch Beta-Stub

### Workflow Recommendation Agent

```text
Input:
- Fallstatus
- Fristen
- Dokumentlage
- letzte Arbeitsschritte

Output:
- nächster bester Schritt
- Alternativen
- Begründung
```

Stand heute:

- konzeptionell definiert
- noch nicht als eigener laufender Agent implementiert

### Research Agent

```text
Input:
- Frage
- Aktenkontext
- freigegebenes Memory

Output:
- strukturierte juristische Antwort
- zitierte Normen
- knappe Begründung
```

Stand heute:

- real
- serverseitig authentifiziert
- JSON-Schema-Output

### Citation Verification Agent

```text
Input:
- strukturierte Zitate
- Gesetzeskorpus

Output:
- verifiziert / unsicher
- Paragraphenbezug
- Textauszug
```

Stand heute:

- teilweise real
- strukturierte Zitatlogik existiert
- noch nicht als vollständig separater Dienst

### Drafting Agent

```text
Input:
- Akte
- Recherche
- Vorlage
- Rechtsgrundlagen
- Kanzlei-Memory

Output:
- erster Entwurf
- bearbeitbare Fassung
- final freigebare Version
```

Stand heute:

- real als Produktflow
- noch nicht maximal an Dokumente + Memory gekoppelt

### Memory Agent

```text
Input:
- nur freigegebene Antworten
- nur freigegebene Fassungen

Output:
- wiederverwendbare Kanzlei-Muster
- bessere Recherche-Kontexte
- bessere Drafting-Vorschläge
```

Stand heute:

- realer Startpunkt
- approved-answer memory existiert
- noch keine tiefe strukturierte Langzeitlogik

## 5. Datenfluss

```mermaid
flowchart TD
    A[Invite Token] --> B[Signed Pro Session]
    B --> C[Tenant Context]
    C --> D[Sync]
    C --> E[Research API]
    C --> F[Upload API]

    F --> G[Document Vault]
    G --> H[Case Document Record]
    H --> I[Document Jobs]
    I --> J[OCR Text / DE Fassung]

    E --> K[Structured Research Answer]
    K --> L[Reviewed Answer]
    L --> M[Approved Memory]
    M --> E
    M --> N[Drafting]
```

## 6. Was heute schon echt ist

```text
Echt:
- signierte Session mit tenantId + role
- serverseitig geschützte Pro-API
- tenant-gebundener Sync
- serverseitiger Dokument-Vault als Beta-Adapter
- Dokument-Upload in Fälle
- OCR/Translation-Jobqueue
- Research Agent mit strukturiertem Output
- freigegebenes Answer Memory

Noch nicht voll:
- echter OCR-Provider
- echter Translation-Provider
- serverseitige Persistenz aller Entities
- Recommendation Agent
- tiefer Citation-Verifier als eigener Dienst
- stärkerer Drafting-Agent mit voller Akten-/Dokumentnutzung
```

## 7. Nächste Ausbaureihenfolge

```mermaid
flowchart LR
    A[1. Serverseitige Entities] --> B[2. Echter OCR / Translation Worker]
    B --> C[3. Document-first Drafting]
    C --> D[4. Workflow Recommendation Agent]
    D --> E[5. Practice-specific Memory]
    E --> F[6. Multi-user Kanzleibetrieb]
```

## 8. Das Entscheidende

GitLaw ist nicht:

- ein Chatbot fuer Anwalt:innen

GitLaw ist:

- ein beaufsichtigtes Multi-Agent-Workflow-System fuer Kanzleien

Der Mensch bleibt:

- Entscheider:in
- Freigeber:in
- Haftungstraeger:in

Die Agenten uebernehmen:

- Struktur
- Vorarbeit
- Vorschlaege
- Geschwindigkeit
- Wiederverwendung
