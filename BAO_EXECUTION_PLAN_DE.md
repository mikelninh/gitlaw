# Bao Execution Plan (Testphase -> Kanzlei-tauglich)

Stand: 2026-04-30

## Ziel
Alle priorisierten Beduerfnisse aus der Bao-Testphase abdecken: Intake, Dokumente, Sicherheit, Compliance, Nachweisbarkeit.

## Phase 1 (jetzt umgesetzt)
- Pro-Einstieg von Public-Seite klar sichtbar.
- Datenschutz-Hardening in API (Origin-Allowlist, no-store, Sicherheitsheader).
- Compliance-Cockpit in Pro-Einstellungen.
- Intake erweitert:
  - Dringlichkeit
  - Frist bekannt (Ja/Nein)
  - Datei/Fotos Metadaten mit interner Umbenennung
  - Kategorie + Sprachhinweis (z. B. vi)
- Aktenansicht erweitert:
  - Intake-Badges fuer Dringlichkeit/Frist
  - Anhangsdetails sichtbar
  - Dokument-Chronologie
- Rechercheansicht:
  - klare Entwurf-vs-geprueft Kennzeichnung.

## Phase 2 (naechste 2-3 Wochen)
- Sichere echte Dateiablage (verschluesselt at rest + Zugriffskontrolle).
- OCR fuer Fotos/PDF + optionale VI->DE Uebersetzung mit Warnhinweis "maschinell".
- Rollen/Rechte (Anwalt, Assistenz, Read-only).
- Retention/Loeschfristen pro Mandat + Exportnachweis.

## Phase 3 (4-8 Wochen)
- Vollstaendiges AVV/DPA Paket und TOM-Dokumentation.
- SCC + Anbieter-Matrix + Speicherort-Transparenz.
- Team-Kollaboration (Aufgaben, interne Notizen, Freigaben).

## Erfolgsmessung (Beta KPIs)
- Intake -> Akte Zeit (Median)
- Recherchezeit pro Fall (vorher/nachher)
- Quote "geprueft" bei KI-Antworten
- Fristwarnungen ohne Versaeumnis
- Dokumente korrekt klassifiziert (Kategorie/Sprache)
