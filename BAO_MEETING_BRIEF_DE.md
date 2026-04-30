# Bao Meeting Briefing (GitLaw Pro)

Stand: 2026-04-30

## 1) Priorisierte Umsetzung (Impact zuerst)

### P0 (jetzt, 1-2 Wochen)
- Compliance-Basics: DSFA-Trigger prüfen, Verzeichnis Verarbeitungstätigkeiten, Löschkonzept.
- Kanzlei-Betrieb: Pro-Onboarding + Kanzlei-Profil vollständig machen.
- Intake zu Akte: mehrsprachiger Intake, interne Dateibenennung, Übergabe in Akte.
- Nachweisbarkeit: Audit-Log in jedem Kernflow (Akte, Recherche, Brief, Export).

### P1 (2-4 Wochen)
- Rollen/Rechte (Anwalt, Assistenz), Session-Timeout, 2FA optional.
- DPA/AVV-Paket mit Hosting/AI-Anbietern, SCC falls nötig.
- Export/Import für Kanzleiwechsel und Backups.

### P2 (4-8 Wochen)
- Sichere Dokumentablage (verschlüsselt) statt nur Metadaten.
- OCR + Übersetzungspipeline für eingereichte Fotos/PDFs.
- Kollaboration (Aufgaben, Kommentare, Freigaben).

## 2) Feature-Rating für Anwälte

Skala: Nutzen 1-10, Erwartete Nutzung 1-10, Zeitersparnis konservativ.

1. AI-Recherche mit verifizierten Zitaten
- Nutzen: 10/10
- Nutzung: 9/10
- Zeitersparnis: 30-90 Min/Tag, 2-6 Std/Woche
- Warum: schnellster Weg von Frage -> belastbarer Startantwort

2. Musterbrief-Generator (anwaltlich formuliert)
- Nutzen: 9/10
- Nutzung: 9/10
- Zeitersparnis: 20-60 Min/Fall
- Warum: wiederkehrende Schriftsätze werden drastisch beschleunigt

3. Intake (mehrsprachig) -> direkte Aktenübernahme
- Nutzen: 9/10
- Nutzung: 8/10
- Zeitersparnis: 10-30 Min/Fall Intake
- Warum: weniger Rückfragen, sauberer Erstkontakt

4. Fristen + Dashboard-Warnungen
- Nutzen: 9/10
- Nutzung: 8/10
- Zeitersparnis: indirekt, reduziert Frist-Risiko massiv
- Warum: Sicherheitsnetz für den Kanzlei-Alltag

5. Audit-Log / Compliance-Cockpit
- Nutzen: 8/10
- Nutzung: 7/10
- Zeitersparnis: 1-3 Std/Monat bei Nachweisen/Prüfungen
- Warum: wichtig für Mandantenvertrauen und Nachvollziehbarkeit

## 3) Bestes und meistgefragtes Feature

- Bestes Gesamtfeature: `AI-Recherche mit Zitat-Verifikation`.
- Meist gefragt (typisch im Markt): `Dokumenten-Workflows` (Upload, OCR, Benennung, Zuordnung, schnelle Suche).

## 4) VN-Dateien/Fotos: praktikabler Kanzlei-Workflow

Problem:
- Mandanten senden Fotos/PDFs mit uneinheitlichen oder vietnamesischen Dateinamen.

Lösung (jetzt in Beta vorbereitet):
- Intake erfasst Dateimetadaten.
- Interner Name wird standardisiert erzeugt:
  - Format: `in_YYYYMMDD_<mandant_slug>_<nn>.<ext>`
  - Beispiel: `in_20260430_nguyen_01.jpg`
- Originalname bleibt als Referenz erhalten.
- Bei „Als Akte anlegen“ werden interne Namen in den ersten Akteneintrag übernommen.

Nächster Schritt:
- echte Dateiablage + OCR + optionale Übersetzung (VI->DE) mit Prüfhinweis „maschinell übersetzt“.

## 5) Talking points für Bao

1. Wir reduzieren Erstaufnahme + Recherchezeit sofort messbar.
2. Wir bauen Compliance nicht „später“, sondern als Produktkern.
3. Mehrsprachiger Intake trifft reale Berliner Mandatslage.
4. Interne Dateibenennung und Nachvollziehbarkeit vermeiden Chaos im Team.
5. Der schnellste spürbare ROI kommt aus Recherche + Schriftsatz-Automation.
