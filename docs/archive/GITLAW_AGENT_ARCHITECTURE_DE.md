# GitLaw Agent Architecture

## 1. Prinzip

GitLaw braucht kein monolithisches "Super-Agent"-System.

GitLaw braucht kleine, spezialisierte Agenten, die entlang des Kanzlei-Workflows arbeiten und an klaren Uebergabepunkten stoppen.

Jeder Agent bekommt:

- definierte Inputs
- definierte Outputs
- definierte Rechte
- definierte Escalation an den Menschen

## 2. Der Orchestrierungsfluss

Der Standardfluss:

1. Mandant:in sendet Intake
2. Intake Agent strukturiert den Eingang
3. Document Agent ordnet Dateien zu
4. OCR / Translation Agent erzeugt Arbeitsmaterial
5. Workflow Agent empfiehlt den naechsten Schritt
6. Research Agent erstellt eine erste juristische Recherche
7. Citation Agent prueft Quellen und markiert Unsicherheit
8. Drafting Agent erstellt einen ersten Entwurf
9. Lawyer Review entscheidet ueber Freigabe, Aenderung oder Verwerfung
10. Memory Agent lernt nur aus freigegebenem Material

## 3. Agenten im Detail

### 3.1 Intake Agent

Zweck:

- unstrukturierte Intake-Daten in strukturierte Felder ueberfuehren
- Dringlichkeit, Fristsignal und Themengebiet vorschlagen
- erkennbare Luecken markieren

Input:

- Formulardaten
- Freitext
- Metadaten zu Dateien

Output:

- strukturierter Eingang
- vorgeschlagene Prioritaet
- vorgeschlagene Dokumentkategorien
- offene Rueckfragen

Kein Agentenrecht:

- keine rechtliche Endbewertung
- keine automatische Aktenfreigabe

### 3.2 Document Agent

Zweck:

- Dokumente benennen, klassifizieren und dem Fallkontext zuordnen

Input:

- Dateimetadaten
- Dateiinhalte nach OCR
- Falldaten

Output:

- Dokumenttyp
- Sprache
- empfohlener interner Dateiname
- Zuordnung zur Akte

Moat-Beitrag:

- stark, weil reale Kanzleiarbeit hier sehr viel Zeit verliert

### 3.3 OCR / Translation Agent

Zweck:

- Fotos, Scans und fremdsprachige Unterlagen in bearbeitbares Material ueberfuehren

Input:

- Bild/PDF
- Zielsprache

Output:

- OCR-Text
- maschinelle Arbeitsuebersetzung
- Konfidenzsignal / Review-Hinweis

Menschliche Kontrolle:

- jede Uebersetzung bleibt ungeprueft, bis sie markiert oder freigegeben wird

### 3.4 Workflow Recommendation Agent

Zweck:

- aus dem Stand des Falls den naechsten sinnvollen Arbeitsschritt empfehlen

Beispiele:

- "zuerst Frist sichern"
- "zuerst OCR auf Bescheid"
- "zuerst Akteneinsicht entwerfen"
- "zuerst Rueckfrage an Mandant:in"

Output:

- 1 primaere Empfehlung
- 1 bis 2 Alternativen
- Begruendung

### 3.5 Research Agent

Zweck:

- aus Fallkontext und Frage eine erste juristische Antwort bauen

Input:

- Forschungsfrage
- Aktenkontext
- OCR-/Uebersetzungsinhalte
- vorhandene Kanzlei-Memory

Output:

- strukturierte Antwort
- zitierte Normen / Quellen
- offene Unsicherheiten

Wichtig:

- Antwort nie ohne Verifikationsstufe und Review-Status zeigen

### 3.6 Citation Verification Agent

Zweck:

- pruefen, ob die vom Research Agent genannten Normen/Quellen zum Korpus passen

Input:

- zitierte Vorschriften
- lokaler Gesetzeskorpus
- optional Kanzleinotizen

Output:

- verifiziert / nicht verifiziert
- Volltextbezug
- Unstimmigkeiten

Warum wichtig:

- das ist ein zentraler Vertrauenshebel gegen "halluzinierte Sicherheit"

### 3.7 Drafting Agent

Zweck:

- Recherche, Dokumente und Kanzleiton in einen ersten Schriftsatz ueberfuehren

Input:

- Fallkontext
- Recherche
- gewaehlte Vorlage
- Rechtsgrundlagen
- Kanzlei-Memory

Output:

- erster Entwurf
- verwendete Annahmen
- offene Plaetze fuer Review

Nicht tun:

- keine automatische Aussendung
- keine Endfreigabe

### 3.8 Memory Agent

Zweck:

- nur aus freigegebenen Ergebnissen wiederverwendbare Muster extrahieren

Lernt aus:

- geprueften Recherchen
- finalisierten Entwuerfen
- bevorzugten Formulierungen
- haeufigen Korrekturen

Lernt nicht aus:

- ungeprueften Rohantworten
- verworfenen Entwuerfen
- einmaligen Fehlern

## 4. Kontrollpunkte

GitLaw braucht feste Human-in-the-Loop Gates:

- Eingang uebernommen
- Dokument Review
- Recherche geprueft
- Entwurf freigegeben
- Uebersetzung geprueft

Ohne diese Gates wird das Produkt riskant.
Mit ihnen wird es brauchbar und vertrauensfaehig.

## 5. Bewertungslogik pro Agent

Jeder Agent wird an anderen Metriken gemessen:

Intake Agent:

- Vollstaendigkeit
- richtige Priorisierung
- weniger manuelle Rueckfragen

Document Agent:

- korrekte Klassifikation
- weniger Suchzeit
- weniger Namenschaos

OCR / Translation Agent:

- Zeitersparnis
- Lesbarkeit
- Review-Last

Research Agent:

- Trefferqualitaet
- nuetzliche Erstantwort
- Zitatdichte

Citation Agent:

- Verifikationsquote
- erkannte Fehler

Drafting Agent:

- Zeit bis erster Entwurf
- Freigaberate
- Korrekturaufwand

Memory Agent:

- Wiederverwendungsquote
- Verbesserung ueber Zeit

## 6. Technische Zielarchitektur

Kurzfristig:

- orchestriert im App-/API-Layer
- synchrone kleine Agenten plus einige asynchrone Jobs

Mittelfristig:

- dokumentierte Job-Queue
- Agenten als klar getrennte Services/Tasks
- serverseitige Event-Historie

Langfristig:

- agent routing nach Falltyp
- practice-specific memory
- adaptive next-best-action Empfehlungen

## 7. Was nicht passieren darf

- ein Agent schreibt direkt an Gerichte/Behoerden
- ein Agent lernt unkontrolliert aus ungeprueften Daten
- ein Agent ueberschreibt menschliche Freigaben
- ein Agent bekommt uneingeschraenkten Zugriff auf alle Daten ohne Tenant-/Rollenkontrolle

## 8. Zielbild

Die beste Version von GitLaw ist kein Chatbot.

Sie ist ein System spezialisierter Agenten, das den Arbeitsfluss einer Kanzlei sichtbar beschleunigt, ohne die professionelle Kontrolle aus der Hand der Jurist:innen zu nehmen.
