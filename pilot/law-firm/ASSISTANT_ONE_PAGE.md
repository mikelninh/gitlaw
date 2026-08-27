# GitLaw Pro · Pilot Operations — 1 Seite für die Assistenz

## Deine einzige Grundregel

**Arbeite immer den nächsten angezeigten Schritt ab. Bei STOPP niemals improvisieren.**

Starte die Console über `pilot/law-firm/start-gitlaw-pilot-ops.cmd`. Wenn der Readiness-Check nicht `READY` zeigt: **Admin/Engineering informieren.**

## Die vier Zustände

### STARTEN
Alles vorhanden und freigegeben. Du darfst den angezeigten historischen Replay-Schritt starten.

### ANFORDERN
Dem Kunden fehlt etwas. Fordere **nur das konkret Fehlende** an, z. B. weitere anonymisierte Fälle oder einen anwaltlichen Reviewer.

### WARTEN
Eine dokumentierte Freigabe oder – bei bezahlten Piloten – Zahlung fehlt. Nicht starten.

### STOPP
Nicht selbst lösen. Weitergeben:
- Datenschutz / Verschwiegenheit / Einwilligung → zuständige anwaltliche/Privacy-Person
- technischer Fehler / Quellen-/Safety-Gate → Engineering
- >30 Fälle, anderer Workflow, Sonderpreis/Sondervertrag → Founder/Sales

## Standardablauf

1. **Pilot anlegen** — Kunde, Anwalt-Reviewer, Operations, paid/internal auswählen.
2. **Freigaben dokumentieren** — nur Kästchen anklicken, die tatsächlich geprüft/bestätigt wurden.
3. **20–30 Fälle einlesen** — nur CSV/JSON; Original-PDF/DOCX/XLSX nicht in den Standardpilot laden.
4. **Status prüfen** — nur bei STARTEN fortfahren.
5. **Replay starten** — keine externe Kanzleiaktion wird ausgeführt.
6. **Lawyer Review-Datei sicher an Reviewer geben** — Reviewer exportiert `gitlaw-lawyer-review.json`.
7. **Review laden** — bei Zeitmessung nur bestätigte/gemeinsam gemessene Baseline eintragen.
8. **Kundenreport erzeugen und sicher übergeben**.
9. **Bei paid:** Restzahlung bestätigen.
10. **Upload-/Transferkopien löschen und bestätigen**.
11. **Closeout** — Rohdaten werden lokal gelöscht; Löschbeleg bleibt.
12. **Fortsetzung nur**, wenn der Report `WEITER` sagt und der Kunde ausdrücklich zugestimmt hat.

## Was du niemals tun sollst

- Datenschutz-/Berufsrechtsfragen selbst juristisch entscheiden
- Warnungen wegklicken oder Daten umbenennen, damit ein Scanner schweigt
- Original-Mandatsakten in Git, Slack, normale E-Mail oder öffentliche Tools kopieren
- Mandanten/Gerichte/Gegner im Namen der Kanzlei anschreiben
- Fristen, Einreichungen, Zahlungen oder Mandatsentscheidungen ausführen
- aus `VERBESSERN`, `STOPPEN` oder `WEITER MESSEN` eigenmächtig einen laufenden Standardbetrieb machen

## Wenn du unsicher bist

**STOPP ist richtig.** Das System ist so gebaut, dass Unsicherheit sichtbar eskaliert wird statt verdeckt weiterzulaufen.
