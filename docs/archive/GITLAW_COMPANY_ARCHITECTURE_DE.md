# GitLaw Company Architecture

## 1. Was GitLaw ist

GitLaw ist keine allgemeine "KI fuer Anwalt:innen".

GitLaw ist die agentische Betriebs- und Arbeitsoberflaeche fuer kleine Kanzleien mit hohem Dokumenten-, Sprach- und Rechercheaufwand.

Der Produktkern ist ein beaufsichtigter Arbeitsfluss:

`intake -> dokumente -> recherche -> entwurf -> freigabe`

Die KI arbeitet nicht autonom im luftleeren Raum. Sie arbeitet innerhalb dieses Flusses, mit klaren Zustandswechseln, Rollen und Nachweisen.

## 2. Wer der erste Kunde ist

Die erste Keilgruppe:

- kleine Kanzleien
- 1 bis 15 Personen
- dokumentenlastige Mandate
- hoher Intake-Aufwand
- mehrsprachige Mandant:innen
- Praxisbereiche wie Migration, Strafrecht, Familienrecht, Mietrecht, Sozialrecht

Warum diese Gruppe:

- der Schmerz ist akut
- der ROI ist schnell sichtbar
- menschliche Freigabe ist ohnehin Standard
- der Dokumenten- und Sprachaufwand ist hoch

## 3. Wertversprechen

GitLaw verspricht nicht "magische KI".

GitLaw verspricht:

- weniger Chaos beim Eingang
- schnellere Aktenanlage
- bessere Dokumentenstruktur
- schnellere erste Recherche
- schnelleren ersten Entwurf
- klare Freigabe- und Nachweisstrecken

In einem Satz:

GitLaw bringt rohe rechtliche Eingaben schneller und sicherer zu gepruefter Arbeitsleistung.

## 4. Die Systemschichten

### 4.1 Experience Layer

Die Arbeitsoberflaechen fuer:

- Mandant:innen-Intake
- Eingaenge / Inbox
- Akten
- Recherche
- Schreiben
- Audit / Settings / Pricing

Diese Schicht ist nicht der moat. Sie muss nur stark genug sein, damit die Kanzlei gerne darin arbeitet.

### 4.2 Workflow Layer

Das ist der eigentliche Produktkern:

- Intake wird in strukturierte Eingaenge verwandelt
- Dokumente werden klassifiziert, benannt und bearbeitet
- Recherche wird mit Zitaten erzeugt und verifiziert
- Entwuerfe werden aus Aktenkontext und Recherche gebaut
- Freigaben, Rollen und Status werden mitgefuehrt

Diese Schicht definiert, was als naechster Schritt moeglich ist.

### 4.3 Agent Layer

Spezialisierte Agenten erledigen Teilaufgaben innerhalb des Workflows:

- Intake Agent
- Document Agent
- OCR / Translation Agent
- Research Agent
- Citation Verification Agent
- Drafting Agent
- Workflow Recommendation Agent
- Memory Agent

Jeder Agent hat:

- klaren Input
- klares Ziel
- sichtbare Ausgabe
- begrenzte Rechte
- menschliche Kontrollpunkte

### 4.4 Trust Layer

Diese Schicht entscheidet, ob GitLaw nur Demo oder echte Kanzleisoftware ist:

- tenant isolation
- rollen und rechte
- revisionsfaehiges audit
- dokument provenance
- freigabestatus
- eu-storage
- datenschutz und retention

Ohne diese Schicht gibt es kein belastbares Unternehmen.

### 4.5 Memory Layer

GitLaw muss innerhalb jeder Kanzlei besser werden:

- freigegebene Recherchen
- bevorzugte Formulierungen
- wiederkehrende Argumente
- genutzte Vorlagen
- typische Dokumenttypen
- fruehere Freigabekorrekturen

Das ist der operative Lern- und Bindungseffekt.

### 4.6 Data / Evidence Layer

Das Fundament:

- lokaler oder serverseitiger Gesetzeskorpus
- Akten- und Dokumentmetadaten
- OCR-Texte
- Uebersetzungen
- Research-Historie
- Draft-Historie
- Audit-Events
- Analytics entlang des Hauptloops

## 5. Die Geschaeftslogik

GitLaw sollte in der fruehen Phase nicht wie ein generisches SaaS behandelt werden.

Die richtige Reihenfolge:

1. bezahlte Piloten
2. dokumentierter ROI
3. wiederholbarer Setup-Prozess
4. Standardprodukt mit klaren Tiers

Erst verkaufen wir:

- ein klar umrissenes Workflow-Paket
- Setup + Begleitung
- messbaren Zeitgewinn

Dann verkaufen wir:

- laufende Nutzung
- Teamplaetze
- Dokumenten- und Agenten-Volumen
- Premium Compliance / Integrationen

## 6. Der Moat

GitLaw gewinnt nicht ueber ein besseres Chatfenster.

Der Moat ist die Kombination aus:

- dokumentenzentriertem Workflow
- Mehrsprachigkeit
- zitatverifizierter Recherche
- freigegebener Kanzlei-Memory
- vertrauensfaehiger Freigabe- und Auditstrecke

Ein einzelnes Modell kann kopiert werden.
Ein arbeitender, vertrauenswuerdiger, dokumentenzentrierter Kanzlei-Loop deutlich schwerer.

## 7. Was GitLaw nicht sein sollte

Nicht priorisieren:

- generische "frag die KI" Produkte
- alle Rechtsgebiete gleichzeitig
- Enterprise-Features ohne echte Nachfrage
- vollautonome Rechtsberatung
- aufwendige Integrationen vor dem Kernworkflow
- Marketingseiten ohne produktive Tiefe

## 8. Die Zielarchitektur in einem Satz

GitLaw wird die beaufsichtigte agentische Betriebsoberflaeche fuer kleine Kanzleien, die aus Eingang, Dokumenten und Recherche schneller gepruefte rechtliche Arbeit macht.
