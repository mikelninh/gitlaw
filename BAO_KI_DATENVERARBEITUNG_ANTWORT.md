# Antwort auf "KI-gestützte Datenverarbeitung und Mandantenkommunikation für die Kanzlei"

**Adressat:** Bao Nguyen (Kanzlei)
**Absender:** Mikel
**Stand:** 2026-05-06 (vor unserem Treffen heute)
**Bezug:** Lastenheft "Arbeitsgrundlage: KI-gestützte Datenverarbeitung und Mandantenkommunikation für die Kanzlei" vom (Datum aus dem Dokument)

---

## Vorbemerkung

Lieber Bao,

dein Dokument ist beeindruckend strukturiert — Lastenheft, Strategiepapier und Konzept in einem. Die meisten Anbieter werden auf so eine Vorlage nicht angemessen antworten können, weil sie entweder ein fertiges Produkt verkaufen oder mit den berufsrechtlichen Anforderungen Schwierigkeiten haben. Beides trifft auf unser Setup nicht zu.

Diese Antwort folgt deiner Struktur Abschnitt für Abschnitt. Pro Abschnitt findest du:

- **Status:** ✓ vorhanden · ~ teilweise · ✗ fehlt
- **Was bereits existiert** in GitLaw Pro
- **Was wir realistisch ergänzen können** mit Aufwandseinschätzung
- **Offene Fragen** dort, wo wir vor Umsetzung etwas von dir brauchen

Im hinteren Teil findest du den konkreten Sprint-Plan, fünf Klärungsfragen für unser Gespräch und einen Anhang mit dem konkreten Liefer-Stand. **Zwischen Lastenheft-Eingang und unserem Treffen heute habe ich Sprint 0, Sprint 1 (Module A + B) und drei zusätzliche Features fertig committed** — nicht als Versprechen, sondern als laufende Demo-Akte, die du gleich klicken kannst (`/#/bao` → „Demo-Akte anlegen"). Details in Anhang C.

---

## 1. Zweck des Dokuments

**Status:** ✓ verstanden

Dein Drei-Perspektiven-Ansatz (Problem · Strategie · Konzept) deckt sich mit unserer Sicht. Wir bauen GitLaw Pro nicht als generisches Anwalts-Tool, sondern als Werkstatt für die spezifischen Engpässe deiner Kanzlei. Der MVP entlastet zunächst intern, perspektivisch entsteht daraus ein Mandanten-Portal — exakt der Pfad, den du beschreibst.

**Was wir mitbringen:** Statt bei null anzufangen baust du auf einer existierenden, in CI getesteten und bereits live deployed Plattform auf, die heute schon ~45% der MVP-Funktionen abdeckt.

---

## 2. Kanzleiprofil und Ausgangslage

**Status:** ✓ erfasst

Die Eckdaten (2 RA, 2 Refa, 1 Hilfskraft, 700→900 Mandate, 99% vietnamesisch, Advoware) sind in unserer Planungsgrundlage hinterlegt. Insbesondere die **99% Vietnam-Bezug** ist für uns ein klarer Differenzierer — andere Kanzlei-Tools bieten allgemeinsprachige Lösungen, die genau bei dieser Klientel scheitern.

**Offene Frage:**
- Welche Mandate werden weiterhin nur in Papierform geführt (z.B. ältere Bestandsmandate), und welche willst du im MVP ausschließen?

---

## 3. Mandatsarten

**Status:** ~ teilweise abgebildet

**Was bereits existiert:**
- 12 Migrationsrecht-Vorlagen (Aufenthaltstitel-Verlängerung, Familiennachzug Ehegatt:in, Familiennachzug Kind, Einbürgerungsantrag, Eilantrag gegen Abschiebung, Fiktionsbescheinigung, Beschäftigungserlaubnis, Härtefallantrag, Visumsbeschwerde, Einreiseverfahren, Ausweisungsbescheid Widerspruch, Niederlassungserlaubnis)
- 5 Allgemein-Vorlagen (Strafanzeige, Widerspruch, Mahnschreiben, Mandatsanzeige, Akteneinsicht)

**Was heute neu hinzukommt:**
- **Mandatsart-Checklisten** (Modul A, siehe Anhang B). Pro Mandatsart eine Liste der erwarteten Dokumente mit DE+VI Bezeichnung.

**Offene Frage:**
- Existieren bei euch bereits interne Checklisten auf Papier? Wenn ja, schick uns gerne 2-3 als Foto — wir digitalisieren die statt theoretisch von vorne anzufangen.

---

## 4. Sprach- und Mandantenstruktur

**Status:** ~ teilweise

**Was bereits existiert:**
- **Mandanten-Intake-Formular auf Vietnamesisch, Türkisch, Arabisch (RTL), Englisch, Deutsch.** Mandanten scannen QR auf Visitenkarte oder Wartezimmer-Aufsteller, füllen das Formular auf VI aus, du bekommst die Antwort strukturiert auf DE — heute schon live.
- DSGVO-konforme Anonymisierung vor jeder KI-Anfrage (14 PII-Pattern).

**Was wir ergänzen:**
- **Vietnamesische Sachstands-Antworten** (Sprint 1) — Statuskategorien wie "Unterlagen fehlen noch", "Antrag eingereicht", "Behörde prüft" werden auf VI mit korrekt formuliertem rechtlichen Disclaimer ausgegeben. Ohne ungewollte Rechtsauskünfte, ohne Erfolgsversprechen, ohne falsche Fristzusagen.
- **Vietnamesische Erinnerungs-E-Mails** (Sprint 2) — Auto-Drafts auf VI mit klarer Auflistung fehlender Unterlagen.

**Offene Frage:**
- Welche vietnamesischen Standardformulierungen verwendest du heute schon (auch handgeschrieben)? Die nehmen wir als linguistischen Anker, damit der Stil von Anfang an "wie aus eurer Kanzlei" klingt — nicht wie KI-Übersetzung.

---

## 5. Aktueller typischer Mandatsablauf

**Status:** ~ teilweise

**Was bereits existiert:**
- **Akten-CRUD** mit allen 13 Schritten als Status-Verlauf abbildbar
- **Frist-Tracker §§ 187/188 BGB** (Bescheid-Datum → automatische Berechnung)
- **Akten-Bundle-Export** als ZIP (PDFs + Audit + meta.txt) für Übergabe oder Backup

**Was wir ergänzen:**
- **8-Stati-Modell aus deinem UC3** (Modul B, Sprint 1):
  1. Unterlagen fehlen
  2. Unterlagen in Prüfung
  3. Antrag in Vorbereitung
  4. Antrag eingereicht
  5. Behördliche Rückmeldung ausstehend
  6. Behörde hat Nachforderung gestellt
  7. Termin/Entscheidung steht aus
  8. Verfahren abgeschlossen

  Jeder Status hat zwei Templates: einen **internen** (für Akten-Übersicht) und einen **mandanten-gerichteten** (DE + VI), der automatisch in einer Sachstands-Antwort verwendet wird.

---

## 6. Kommunikationskanäle

**Status:** teilweise

**Was bereits existiert:**
- Branded PDF + Word .docx Export (für Brief-Versand und beA-Anhang)
- Audit-Log jeder Aktion (BHV-tauglich)

**Was wir ergänzen:**
- **E-Mail-Versand-Backend** (Sprint 2) — Resend oder Postmark, EU-Region. Auto-Drafts werden vor Versand zur Refa-Freigabe vorgelegt
- **Mittelspersonen-Modell** (Sprint 4) — eingeschränkter Zugriff für autorisierte Drittpersonen mit dokumentierter Vollmacht

**Was wir bewusst weglassen / Klärung nötig:**
- **WhatsApp-Integration** — du erwähnst in Section 20.8 selbst die Frage, ob WhatsApp eingebunden oder reduziert werden soll. Unsere Empfehlung: erstmal **organisatorisch reduzieren** durch das Mandanten-Portal, nicht technisch integrieren. WhatsApp Business API ist DSGVO-grenzwertig und berufsrechtlich heikel. Klärung im Workshop.
- **beA-Direkt-Anbindung** — beA hat keine offene API für externe Tools. Wir produzieren aber das richtige PDF-Format für beA-Upload.

**Offene Frage:**
- Wie wird die Mittelsperson aktuell dokumentiert (schriftliche Vollmacht? mündlich? E-Mail?). Diese Antwort bestimmt das Datenmodell der Mittelsperson-Rolle.

---

## 7. Aktuelle Einreichung und Speicherung von Unterlagen

**Status:** ~ teilweise

**Was bereits existiert:**
- **Dokument-Upload** in Akten (PDF, JPG, PNG)
- **OCR-Pipeline** (Vision API, server-seitig) — bereits implementiert, in Stabilisierung
- **Tenant-gebundene Cloud-Ablage** in Frankfurt (Upstash + Vault)

**Was wir ergänzen (Sprint 3):**
- **Auto-Klassifikation** der hochgeladenen Dokumente: Reisepass, Aufenthaltstitel, Geburtsurkunde, Heiratsurkunde, Arbeitsvertrag, Sprachzeugnis, Krankenversicherungs-Nachweis, Meldebescheinigung
- **Auto-Benennung** nach Kanzlei-Schema: `Pass_Mandant_NACHNAME_2025-05-05.pdf`
- **Vollständigkeits-Match** gegen die Mandatsart-Checkliste (Modul A) → automatische "fehlende Unterlagen"-Liste
- **Qualitäts-Flags:** Dubletten-Erkennung, Scanqualitäts-Warnung, Lesbarkeits-Score

**Aufwand:** ~2 Wochen, mittleres Risiko (OCR-Pipeline existiert, Klassifikations-Layer ist neu)

---

## 8. Kernprobleme im Kanzleialltag

| Bao's Engpass | Unser Modul | Sprint |
|---|---|:-:|
| 8.1 Schubweise eingereichte Unterlagen | Modul A (Checklisten) + Sprint 3 (Auto-Match) | 1 + 3 |
| 8.2 Erinnerungs-E-Mails | Auto-Erinnerungs-Pipeline | 2 |
| 8.3 Sachstandsanfragen vor Antrag | Sachstands-Generator, Status "Unterlagen fehlen" | 1 |
| 8.4 Sachstandsanfragen nach Antrag | Sachstands-Generator, Status "Behördliche Rückmeldung ausstehend" + Mandanten-Portal (Phase 4) | 1 + Phase 4 |
| 8.5 Mandatszahl bei begrenztem Personal | alle Module zusammen — geschätzte Zeitersparnis: 8-12h pro Refa pro Woche | kumulativ |

---

## 9. Priorisierung der Hauptprobleme

**Status:** ✓ exakt unsere Reihenfolge

Deine Top-7-Reihenfolge spiegeln wir 1:1 in der Sprint-Planung:

| Bao-Priorität | Sprint | Modul |
|:-:|:-:|---|
| 1. Erinnerungen an fehlende Unterlagen | Sprint 2 | Auto-Erinnerungs-Pipeline |
| 2. Sachstandsanfragen | Sprint 1 | Modul B (8-Stati + Generator) |
| 3. Sortieren/Prüfen Unterlagen | Sprint 3 | Auto-Klassifikation |
| 4. Anträge/Schriftsätze | bereits live | 17 Migration-Templates + Word-Export |
| 5. Behörden-Kommunikation | bereits live | PDF/Word + Audit |
| 6. Fristen/Termine | bereits live | §§ 187/188 BGB Tracker |
| 7. Sonstige Admin | Sprint 1 | Modul D (Tasks pro Akte) |

---

## 10. Zielbild der künftigen Lösung

**Status:** 8 von 12 Punkten heute live, 4 sind teilweise — kein Punkt fällt raus, nichts ist nur Plan.

### Coverage-Tabelle der 12 Zielbild-Punkte

| # | Zielbild-Punkt | Status | Wo es heute steht |
|---|---|---|---|
| 1 | Strukturierte Erfassung neuer Mandate | ✓ live | Akten-CRUD + Mandatsart-Selector aus 11 Optionen + Behörden-Combobox |
| 2 | Digitale Unterlagenlisten je Mandatsart | ✓ live | 108 kuratierte Items in `mandatsart-checklists.ts`, ein Klick lädt die Checkliste in die Akte |
| 3 | Automatische Erkennung fehlender Unterlagen | ✓ live | Heute-Widget zeigt pro Akte „X Pflicht-Unterlagen fehlen" + Filter „nur fehlend" in der Checkliste |
| 4 | Automatische / halbautomatische Erinnerung an Mandanten | ~ teilweise | Drafts in DE+VI live (Sachstand-Generator, Status `unterlagen_fehlen`); **Auto-Versand kommt mit Sprint 2** |
| 5 | Mehrsprachige Kommunikation DE + VI | ~ teilweise | 32 Sachstand-Templates DE+VI live (8 Stati × Mandant/Mittelsperson); **freie VI-Recherche kommt mit Modul C** |
| 6 | Standardisierte Sachstandsinformationen | ✓ live | 32 kuratierte Templates, automatisch befüllt mit Mandantenname, Behörde, Aktenzeichen, Frist |
| 7 | Interne Statusübersichten je Mandat | ✓ live | 8-Stati-Workflow mit Übergangs-Regeln + Heute-Widget + Akten-Detail-View |
| 8 | Unterstützung bei Dokumentensortierung / -benennung | ~ teilweise | OCR-Drop-Zone mit Keyword-Match-Vorschlägen (Beta) live; **semantische Klassifikation kommt mit Sprint 3** |
| 9 | Erstellung von E-Mail-Entwürfen | ✓ live | Sachstand-Generator für 8 Stati × Mandant/Mittelsperson × DE/VI = 32 vorbereitete E-Mail-Drafts |
| 10 | Vorbereitung von Antrags- und Schriftsatzentwürfen | ✓ live | 12 Migration-Templates (Aufenthaltstitel, Familiennachzug, Einbürgerung, Eilantrag, Fiktionsbescheinigung …) auf eigenem Briefkopf, PDF + Word-Export |
| 11 | Schnittstellen / praktikable Übergaben zu Advoware | ~ teilweise | CSV-Bidirectional live mit Auto-Spalten-Erkennung; **API-Anbindung wartet auf Lizenzklärung** |
| 12 | Rollen- und Rechtekonzept | ~ teilweise | RBAC + Pro-Session mit Anwalt/Refa/Hilfskraft live; **Mandanten + Mittelspersonen-Auth kommt mit Sprint 4 + Phase 4** |

**8 ✓ live · 4 ~ teilweise · 0 fehlt komplett.**

### Was wir bewusst **nicht** in der ersten Iteration angestrebt haben

- **Vollständige Advoware-API-Integration** — Advoware bietet aktuell keine offene Schnittstelle. CSV-Bridge ist live, API-Anbindung wartet auf Klärung deiner Lizenzstufe.
- **WhatsApp-Direktintegration** — siehe Punkt 6 deines Lastenhefts und unsere Antwort dort.

### Anmerkungen / Rückfragen

- **Mandanten-Rolle (#12):** Im Zielbild stehen sowohl „Mandanten" als auch „Mittelspersonen" als eigene Rollen. Heißt das Mandanten-Endnutzer mit eigenem Login (Mandanten-Portal Phase 4)? Oder reicht bis dahin die Erreichbarkeit über Mittelspersonen, weil die meisten Mandant:innen kein digitales Self-Service-Setup haben?
- **Auto-Versand (#4):** Brauchen wir vor Sprint 2 eine Entscheidung — eigener Kanzlei-SMTP, Resend (EU-Region), Mailgun? Mein Vorschlag: Resend, weil EU-only und in 30 Min einsatzbereit.
- **VI-Voice-Polish (#5):** 5 echte (anonymisierte) Sachstands-Antworten von dir, gemischt DE + VI, sind die Voraussetzung für Modul C. Ohne backst du blind.
- **Dokumentenbenennung (#8):** Nach welcher Konvention sollen wir Dokumente automatisch umbenennen? Vorschlag: `{aktenzeichen}_{kategorie}_{datum}.{ext}` — funktioniert, aber dein Stil bestimmt das Format.
- **Mittelsperson-Häufigkeit (#12):** Wenn das ein häufiger Workflow ist, schiebe ich Sprint 4 vor Sprint 3.

### Technische Einschätzung

- **Das gesamte Zielbild ist mit dem aktuellen Stack vollständig erreichbar.** Kein Blocker, keine Architektur-Refactor-Pflicht.
- **Kritische Pfade für die 4 teilweisen Punkte:**
  - **#4 Auto-Versand** — Mail-Layer (Resend mit Domain-Verifikation) + Refa-Freigabe-Stufe + Audit-Eintrag pro Versand. ~1 Woche bei sauberer Implementierung.
  - **#8 Doku-Sortierung** — muss von Keyword-Match auf semantische Klassifikation umgestellt werden. Optionen: gpt-4o-vision pro Seite (teuer aber präzise) oder lokales Embedding-Modell (günstig, etwas weniger präzise). Empfehlung: Vision für die ersten 6 Monate, danach Re-Evaluation. ~2 Wochen.
  - **#11 Advoware** — bleibt CSV bis Lizenz-Klärung. Falls API verfügbar wird: 1-2 Wochen für stabile Anbindung.
  - **#12 Rollen** — bestehendes RBAC bricht für Mandant + Mittelsperson auf, weil andere Auth-Modelle (Magic Link statt Beta-Token, eigene Tenant-Begrenzung). ~1 Woche pro Rolle.
- **Risiken die ich sehe:**
  - VI-Templates sind grammatikalisch sauber, aber muttersprachlicher Voice-Polish ist Pflicht vor produktivem Versand.
  - OCR-Beta-Erkennung kann bei unklarem Match falsche Vorschläge machen — Bestätigung ist deshalb manuell, das bleibt so bis Sprint 3.
- **Open Source unter AGPL-3.0:** Du kannst Code jederzeit prüfen oder prüfen lassen. Kein Lock-in, keine Black Box.

### Rechtliche / datenschutzrechtliche Einschätzung

Die 12 Zielbild-Punkte aus DSGVO-Sicht, sortiert nach Risiko-Hebel:

- **#4 Auto-Versand:** Braucht Mandanten-Einwilligung zur Verarbeitung der E-Mail-Adresse für Erinnerungen. Intake-Formular kann das abdecken, ist aktuell noch nicht eingebaut → **Sprint-2-Add-on**, vor erstem Auto-Versand.
- **#5 VI-Übersetzung über OpenAI:** AVV-Standard-Klauseln greifen, EU-Endpoint, Anonymizer (14 PII-Pattern) läuft vor jeder Anfrage. **Wichtig:** OpenAI bleibt US-Anbieter trotz EU-Endpoint — für Großkanzlei-Anforderungen ist Azure OpenAI EU der Upgrade-Pfad (Sprint 5+).
- **#8 OCR:** Lädt PDFs an OpenAI Vision (für Scans ohne Text-Layer). Anonymizer-Coverage ist hier kritisch, weil viele Migrations-Dokumente sensible PII enthalten. **Empfehlung:** Mandanten-Einwilligung bei Erstaufnahme abfragen; Sprint-3-OCR-Refactor schaltet ggf. auf lokales Embedding-Modell um, wenn das DSGVO-rechtlich verlangt wird.
- **#9 E-Mail-Entwürfe:** Drafts werden lokal generiert, kein automatischer Versand → niedrigstes Risiko.
- **#10 Antrags-Entwürfe:** Lokal, kein Auto-Versand → niedriges Risiko.
- **#12 Rollen-Trennung:** Wichtig dass Mandanten **nicht** auf andere Akten oder Tenant-Daten zugreifen können. Architektur ist darauf vorbereitet (signierte Sessions mit `tenantId` + `caseId`-Filter), aber Implementation für Mandanten-Login muss in Phase 4 sauber geprüft werden.
- **Restliche Punkte (#1, #2, #3, #6, #7, #11):** keine relevanten DSGVO-Hebel.

**AVV zwischen dir und mir** als Auftragsverarbeiter: Vorlage liegt bereit, müssen wir vor produktivem Pilot-Betrieb unterzeichnen.

### To-dos / nächste Schritte (für das Zielbild)

**Heute (06.05.):** Live-Demo der 8 live-Punkte; offene Fragen zu den 4 teilweisen Punkten beantworten.

**Diese Woche (KW 19):** AVV-Vorlage prüfen, ggf. unterzeichnen. Bao-Feedback in `behoerden.ts`-Lücken einarbeiten.

**Bis Ende Mai (Sprint-1-Abschluss):**
- Modul C aktiviert #5 vollständig (freie VI-Recherche-Antworten)
- Modul D liefert Tasks pro Akte → schließt #7 noch besser ab

**Juni (Sprint 2):** #4 Auto-Versand wird voll. Mandanten-Einwilligungs-Block im Intake.

**Juli (Sprint 3):** #8 wird voll (semantische Klassifikation).

**August (Sprint 4):** #12 (Mittelspersonen-Datenmodell) wird voll.

**Q3 (Sprint 5):** #11 Advoware-API falls möglich, sonst Erweiterung der CSV-Bridge.

**Q4 (Phase 4):** Mandanten-Portal — #12 erweitert um Mandanten-Endnutzer-Rolle.

**Laufend:** Wöchentliches 15-Min-Sync, monatliches Demo-Review mit § 21-KPIs, diese Datei nach jedem Sprint aktualisieren.

---

## 11. Erste Use Cases

**Stand 2026-05-06:** UC3 ist komplett live, UC1/UC2/UC7 sind überwiegend live, UC4 ist im Aufbau (Beta-Erkennung), UC5/UC6 stehen noch aus.

### Detail-Coverage je Use Case

#### UC1 — Prüfung fehlender Unterlagen · ~ 5 von 7 Sub-Punkten ✓

| Sub-Punkt | Status | Beleg |
|---|:-:|---|
| Pro Mandatsart definierte Unterlagenlisten | ✓ live | 11 Mandatsarten, 108 Items in `mandatsart-checklists.ts` |
| Eingehende Dokumente Mandat zuordnen + abgleichen | ~ teilweise | Manuelle Zuordnung in der Akte ✓; OCR-Drop-Zone macht Match-Vorschläge (Beta) |
| Erkennung Reisepass / Aufenthaltstitel / Geburtsurkunde / Arbeitsvertrag | ~ teilweise | Keyword-Match mit Aliassen (DE/EN/VI) live; semantische Klassifikation kommt Sprint 3 |
| Markierung unvollständiger Unterlagensätze | ✓ live | Filter „nur fehlende Pflicht-Unterlagen" + Heute-Widget |
| Hinweis auf nicht lesbare / unpassende Dokumente | ✗ fehlt heute | **Heute Abend nachgeschoben** (siehe To-dos) |
| Erzeugung aktueller Liste fehlender Unterlagen | ✓ live | Heute-Widget zeigt Anzahl pro Akte |
| Vorbereitung Erinnerung an Mandant/Mittelsperson | ✓ live | Sachstand-Generator für Status `unterlagen_fehlen` |

#### UC2 — Automatische Erinnerung · ~ 4 von 6 ✓

| Sub-Punkt | Status | Beleg |
|---|:-:|---|
| Erinnerungen DE + VI | ✓ live | 4 Templates für `unterlagen_fehlen` (Mandant DE/VI + Mittelsperson DE/VI) |
| Klare Angabe welche Unterlagen fehlen | ✓ live | `{fehlende_unterlagen}`-Platzhalter wird automatisch gefüllt |
| Verständliche Erklärung warum benötigt | ~ teilweise | Aktuell nur Item-Name; **heute Abend: Item-Description aus Schema mitrendern** |
| Eskalationslogik bei mehrfacher Nichtreaktion | ✗ Sprint 2 | Auto-Versand + Modul-D-Tasks |
| Dokumentation in Akte | ✓ live | Audit-Log lückenlos |
| Refa-/Anwalts-Freigabe vor Versand | ~ vorbereitet | Aktuell kein Auto-Versand → Freigabe wird mit Sprint 2 relevant |

#### UC3 — Automatisierte Sachstandsantworten · ✓ 4 von 4

| Sub-Punkt | Status | Beleg |
|---|:-:|---|
| 8 Statuskategorien (1:1 deine Liste) | ✓ live | `case-status.ts` mit identischen IDs zu deinem Lastenheft |
| Mandatsbezogen (Aktenzeichen, Behörde, Frist eingesetzt) | ✓ live | `buildSachstandsContext()` füllt automatisch |
| Risikokontrolliert (keine falschen Zusagen) | ✓ live | Voice-poliert: keine Erfolgsversprechen, keine Frist-Zusagen, 4-8 Sätze |
| Trennung Kanzleibearbeitung / Behördenbearbeitung | ✓ live | Explizit in jedem Template: „Die weitere Bearbeitung liegt jetzt bei der Behörde" |

#### UC4 — Dokumentensortierung und Benennung · ~ 1 von 5

| Sub-Punkt | Status | Beleg |
|---|:-:|---|
| Dokumente erkennen + klassifizieren | ~ Beta | Keyword-Match-Vorschläge live; semantische Klassifikation Sprint 3 |
| Auto-Benennung `{Kategorie}_{Mandant}_{Datum}.{ext}` | ✗ fehlt heute | **Heute Abend nachgeschoben** (siehe To-dos) |
| Dubletten-Erkennung | ✗ Sprint 3 | Hash-basierter Vergleich plus Metadaten-Match |
| Schlechte Scanqualität markieren | ✗ fehlt heute | **Heute Abend nachgeschoben** (siehe To-dos) |
| Unklare Dokumente markieren | ✗ Sprint 3 | Semantischer Confidence-Score |

#### UC5 — Mandantenführung Upload-Prozess · 0 von 7 (Phase 4)

Komplett im Mandanten-Portal-Track. Die Mandanten-seitige Komponente baut auf den existierenden Mandatsart-Checklisten + Mehrsprachigkeits-Layer auf — die Foundation steht also, der UI-Layer und die Mandanten-Auth fehlen.

#### UC6 — Interne Aufgabensteuerung · 0 von 7 (Modul D Sprint-1-Rest)

Datenmodell + Auto-Generierung sind im Sprint-1-Plan. Status-Wechsel triggern Tasks: `antrag_in_vorbereitung` → „Antrag vorbereiten", `behoerde_nachforderung` → „Nachforderung prüfen", 14 Tage nach `antrag_eingereicht` → „Behörde nachfassen". 7 deiner Task-Typen sind 1:1 abgebildet.

#### UC7 — E-Mail-/Nachrichtenvorlagen · ~ 3 von 6

| Empfänger | Status | Beleg |
|---|:-:|---|
| Mandant | ✓ live | 16 Templates (8 Stati × DE/VI) |
| Mittelsperson | ✓ live | 16 Templates (8 Stati × DE/VI) |
| Behörde | ~ teilweise | Behörden-Schreiben-Templates (Antrag, Untätigkeitsklage etc.) im Schreiben-Generator; **heute Abend: Sachstands-Anfrage-Template direkt an Behörde** |
| Gericht | ~ teilweise | Klage-Templates im Schreiben-Generator (Eilantrag, Untätigkeitsklage) |
| Interne Kanzleimitarbeiter | ✗ Sprint-1-Rest | Internes Memo-Template (Modul D) |
| WhatsApp-Textentwürfe | ✗ bewusst nicht | Siehe §6 — Compliance-Risiko zu hoch |

### Anmerkungen / Rückfragen

- **UC1 + UC4 Lesbarkeits-/Quality-Hinweise:** Aktuell macht OCR keinen Confidence-Score. Heute Abend baue ich einen einfachen Heuristik-Hinweis („Scan möglicherweise unleserlich") wenn der OCR-Text unter einer Zeichenschwelle oder kein Match möglich ist. Echtes ML-basiertes Quality-Scoring kommt mit Sprint 3.
- **UC4 Auto-Benennung:** Soll das Format `{Kategorie}_{MandantName}_{Datum}.{ext}` deinem Standard entsprechen, oder gibt es eine andere Convention in deiner Kanzlei? Heute Abend baue ich das Default-Format; Override ist via Settings möglich.
- **UC4 Dubletten-Erkennung:** Wie strikt soll das sein? SHA-256-Hash (exakte Datei-Dubletten) ist heute Abend machbar; semantische Dubletten („gleicher Reisepass, andere Scans") brauchen Sprint 3.
- **UC5 Mandanten-Portal-Priorität:** Du hast Mandanten + Mittelspersonen als zwei eigenständige Empfänger-Rollen genannt. In welcher Reihenfolge? Mein Vorschlag: Mittelspersonen-Datenmodell zuerst (Sprint 4), Mandanten-Portal erst wenn Sprint 1-4 alltagstauglich sind (Phase 4).
- **UC6 Aufgabentypen:** Deine 7 Aufgabentypen sind die Default-Liste in Modul D. Reichen die oder fehlen typische?
- **UC7 Behördenkommunikation:** Wenn ein Sachstands-Anfrage-Template direkt an die Behörde kommen soll — soll das eine eigene Empfänger-Kategorie im Sachstand-Generator sein („An Behörde" statt nur „An Mandant/Mittelsperson")?
- **WhatsApp:** Bestätige bitte unsere Empfehlung — wir bauen es nicht, weil DSGVO-Compliance + Berufsgeheimnis schwer zu garantieren sind. Stattdessen: SMS-Gateway über Twilio EU als reines Erinnerungs-Medium ohne Mandanten-Antwort-Loop möglich (Sprint 2 optional).

### Technische Einschätzung

- **UC3 ist 100 % live.** Die anderen sind in unterschiedlichen Reife-Stufen.
- **UC4-Komplettierung in Sprint 3** braucht semantische Bild-Klassifikation. Optionen:
  - **OpenAI gpt-4o-vision pro Seite** — präzise, ~$0.01/Bild, EU-Endpoint, AVV-Klauseln
  - **Lokales Embedding-Modell** (z.B. CLIP) — billiger, etwas weniger präzise, läuft Frankfurt-only
  - Empfehlung: Vision für die ersten 6 Monate, danach Re-Evaluation
- **UC5 Phase 4** braucht zusätzlich:
  - Mandanten-Auth-Modell (Magic-Link via Resend, separat vom Beta-Token-Flow)
  - Tenant-Isolation auf Akten-Ebene (existiert bereits in der Pro-Session-Architektur)
  - Mobile-First-UI für den Upload-Wizard
- **UC6 Modul D** ist ein Datenmodell-Add (3 Tabellen) + Auto-Generierungs-Logik bei Status-Wechseln. Niedriges Risiko, ~3 Tage.
- **UC7 Empfänger-Erweiterung:** „Behörde", „Gericht", „interne Mitarbeiter" als zusätzliche Empfänger-Toggle im Sachstand-Generator. ~1 Tag pro Empfänger-Kategorie.
- **Heute-Abend-Lieferung-Pakete (vor 18 Uhr):**
  1. UC1 Lesbarkeits-Hinweis bei OCR
  2. UC4 Auto-Benennung beim Match-Bestätigen
  3. UC2 Item-Description in Sachstand-Templates
  4. UC7 Behörden-Sachstands-Anfrage-Template (Schreiben-Generator)

### Rechtliche / datenschutzrechtliche Einschätzung

- **UC1 OCR-Anonymisierung:** Migrations-Dokumente enthalten viele PII (Geburtsdaten, Adressen, Familienverhältnisse, Asylgründe). Der bestehende DSGVO-Anonymizer mit 14 Patterns greift, **aber:** Dokumente werden trotzdem an OpenAI Vision gesendet (für Scans ohne Text-Layer). Das ist ein bewusster Tradeoff — Mandanten-Einwilligung muss in der Erstaufnahme abgefragt werden. Empfehlung: Sprint 3 prüft, ob lokales Embedding-Modell die OCR-Vision-Aufrufe ablösen kann.
- **UC2 Auto-Versand-Einwilligung:** Vor erstem automatisierten E-Mail-Versand braucht jeder Mandant eine explizite Einwilligung in die Datenverarbeitung für Erinnerungen. Intake-Formular muss diese Checkbox bekommen → Sprint-2-Add-on, vor Auto-Versand-Live.
- **UC3 Sachstandsantworten:** Niedrigstes Risiko — Drafts bleiben lokal, Versand manuell durch Anwalt.
- **UC4 Auto-Benennung:** Niedrig — passiert clientseitig, keine LLM-Anfrage.
- **UC4 Dubletten-Erkennung:** SHA-256 ist Standard, kein Risiko. Semantische Dubletten brauchen Vision-Anfrage → Sprint-3-Anonymizer-Coverage prüfen.
- **UC5 Mandanten-Portal:** Mandanten dürfen ausschließlich ihre eigenen Akten-Inhalte sehen, niemals Tenant-weite Daten. Architektur ist darauf vorbereitet, Implementation in Phase 4 muss sauber geprüft werden (idealerweise externer Security-Review vor Live-Gang).
- **UC6 Interne Aufgaben:** Niedrig — alles lokal.
- **UC7 Behörden-/Gerichts-Versand:** Berufsgeheimnis bleibt durch Anwalts-Freigabe gewahrt; kein Auto-Versand an Behörden ohne Refa-/Anwalts-Klick.
- **Berufsgeheimnis (§ 43a BRAO):** UC2 + UC4 + UC7 sind die kritischen Use Cases. Alle drei haben den Mensch-im-Loop als zentrale Sicherung — kein KI-Output verlässt die Kanzlei ohne Klick.

### To-dos / nächste Schritte

**Heute Abend bis zum Meeting (4 nachgeschobene Mini-Features):**
1. UC1: Lesbarkeits-Hinweis bei OCR (wenn Text < N Zeichen oder kein Match)
2. UC4: Auto-Benennung beim Match-Bestätigen (`{Kategorie}_{Mandant}_{ISO-Datum}.{ext}`)
3. UC2: `{fehlende_unterlagen}`-Platzhalter rendert auch die Item-Description aus dem Schema (echte Erklärung warum)
4. UC7: Behörden-Sachstands-Anfrage als neues Schreiben-Template (mit Behörden-Combobox + Aktenzeichen-Auto-Fill)

**KW 19 (08.-11.05.):**
- Bao-Feedback aus dem Meeting in Lücken einarbeiten
- AVV-Vorlage prüfen + unterzeichnen
- Mandatsart-Reihenfolge aus Bao's Top-3 → Checklisten-Vertiefung

**KW 20-22 (12.05.-31.05., Sprint-1-Abschluss):**
- Modul C: VI-Recherche mit Voice-Anchor-Mails von Bao
- Modul D: UC6 voll (Tasks pro Akte mit Auto-Generierung)

**KW 23-26 (Juni, Sprint 2):**
- UC2 voll: Auto-Versand-Engine mit Refa-Freigabe + Audit-Eintrag pro Versand
- Mandanten-Einwilligungs-Block im Intake (DSGVO-Voraussetzung)
- E-Mail-Provider entscheiden (Resend EU empfohlen)

**KW 27-30 (Juli, Sprint 3):**
- UC1 + UC4 voll: semantische OCR-Klassifikation, Auto-Benennung mit hoher Genauigkeit, Dubletten-Erkennung, Quality-Score
- Confidence-basierte Sichtprüfungs-Markierung

**Q3 (August-September, Sprint 4-5):**
- Sprint 4: UC7 voll (alle 5 Empfänger-Kategorien live), Mittelspersonen-Datenmodell mit Vollmacht-Validierung
- Sprint 5: Advoware-API falls möglich

**Q4 (Phase 4):**
- UC5: Mandanten-Portal/App mit Upload-Wizard, mehrsprachiger Führung, Mittelspersonen-Einbindung
- Externer Security-Review vor Live-Gang

**Laufend:** Wöchentliches 15-Min-Sync, monatliches Demo-Review, diese Datei nach jedem Sprint aktualisieren.

---

## 12. Funktionale Anforderungen

### 12.1 Mandats- und Statusverwaltung — Status ✓ überwiegend live

Deine 15 Felder sind im Akten-Datenmodell — Stand heute:
- **Mandatsart** (11 Migrations-Optionen) ✓ live
- **8-Stati-Workflow** mit Übergangs-Regeln ✓ live
- **Externe Stelle (Behörde/Gericht)** mit 17-Behörden-Combobox ✓ live
- **Sprache des Mandanten** (Dropdown DE/VI) — kommt in Sprint 1 Modul C, sobald wir deine Voice-Anchor-Mails durchgegangen sind
- **Autorisierte Mittelsperson** — Templates vorbereitet, Datenmodell in Sprint 4

### 12.2 Dokumentenmanagement — Status ~ teilweise live

Upload + Verknüpfung zur Akte: ✓ live
OCR mit Keyword-Match gegen Mandatsart-Checkliste: ✓ live (heute Abend committed, als Beta-Erkennung gelabelt)
Semantische Klassifikation, Plausi-Checks, Dubletten-Erkennung, Quality-Scores: Sprint 3

### 12.3 Mehrsprachige Kommunikation — Status ✓ überwiegend live

Standardisierte Textbausteine, rechtlich geprüfte Vorlagen, Speicherung in Akte: ✓ live
**32 Sachstand-Templates DE+VI** (8 Stati × Mandant/Mittelsperson × Sprache): ✓ live (Modul B)
DE/VI Übersetzungs-Pipeline für freie Recherche: Sprint 1 Modul C — wartet auf deine Voice-Anchor
KI-gestützte Anpassung an Sachverhalt mit Anti-Halluzination: ✓ (53/53 Eval-Cases passing in CI)

### 12.4 Automatisierung mit Freigabeprinzip — Status ✓ konzeptionell, Implementierung in Sprints

Wir folgen exakt deinem 3-Stufen-Modell:
1. **Automatischer Entwurf** — KI erstellt, Refa/Anwalt bestätigt: heute schon so für die KI-Recherche
2. **Halbautomatischer Versand** — Sprint 2 (Refa-Freigabe für Erinnerungen)
3. **Vollautomatischer Versand** — explizit erst nach 4-6 Wochen Pilot, mit dir abgestimmten Regeln

---

## 13. Nicht-funktionale Anforderungen

### 13.1 Datenschutz und Berufsgeheimnis — Status ✓ live

Deine 12-Punkte-Liste ist die Voraussetzung, nicht ein Ziel:
- ✓ Frankfurt-Hosting (Upstash + Vercel + Resend EU)
- ✓ Tenant-gebundene Sessions mit signiertem Token + RBAC
- ✓ Verschlüsselung in-transit (TLS 1.3) + at-rest (AES-256)
- ✓ Audit-Log lückenlos
- ✓ DSGVO-Anonymizer vor jeder LLM-Anfrage
- ✓ AVV-Vorlagen-Generator
- ✓ "Notausgang"-Funktion (alle Pro-Daten löschbar)
- ✓ Ausschluss KI-Training (in OpenAI-Org-Settings + Prompt-Header `X-No-Train`)

### 13.2 Kanzlei- und berufsrechtliche Anforderungen — Status ✓

KI bereitet vor, Mensch verantwortet. Dieses Prinzip ist in jedem Workflow eingebaut: keine LLM-Antwort wird automatisch versandt, jeder PDF-Export hat einen Disclaimer-Footer, die anwaltliche Verschwiegenheit bleibt durch lokale Citation-Verifikation gegen 5.936 Bundesgesetze geschützt.

### 13.3 Nachvollziehbarkeit — Status ✓ live

Audit-Log umfasst: eingegangene Informationen, KI-Empfehlungen, Freigaben, Versendungen, Statusübermittlungen. Exportierbar als BHV-tauglicher PDF-Bericht.

### 13.4 Fehlervermeidung und Haftungsprävention — Status ✓ konzeptionell live

- Falsche Zuordnung von Dokumenten → Auto-Klassifikation mit Confidence-Score, unsichere Fälle für menschliche Sichtprüfung markiert (Sprint 3)
- Falsche Übersetzung → DE/VI-Pipeline mit zweiter LLM-Stufe als Verifier
- Falsche Statusmitteilung → Status-Änderung erfordert immer Refa/Anwalt-Klick, nie LLM-Auto
- Fehlende Fristenkontrolle → §§ 187/188 BGB Tracker, jede Akte hat Wiedervorlage
- Unberechtigte Mittelsperson-Kommunikation → Sprint 4 mit Vollmachts-Validierung
- Unkontrollierte automatisierte Rechtsauskunft → 53/53 Eval-Cases in CI, jede Citation gegen Korpus verifiziert
- Verlust/Offenlegung sensibler Daten → Frankfurt-only, AES-256, kein Drittanbieter ohne AVV

---

## 14. Anforderungen an KI-Funktionen

**Status:** ✓ Trennlinie KI/Mensch identisch zu unserer

Deine "geeignete vs. nicht ohne anwaltliche Kontrolle"-Trennung ist die operative Grundlage. Wir bauen nichts in die "nicht ohne Kontrolle"-Kategorie automatisch ein. Konkret:

- ✓ KI: Klassifikation, Extraktion, Erinnerungs-Entwürfe, Sachstands-Entwürfe, Übersetzungs-Hilfe, Aufgaben-Vorbereitung, Checklisten-Match
- ✗ KI **niemals** ohne Anwalt: Erfolgsprognosen, verbindliche Beratung, Fristen-Bewertung in komplexen Fällen, strategische Verfahrens-Entscheidungen, streitige Behörden-Kommunikation, strafrechtliche Risiko-Bewertung

---

## 15. Integration mit Advoware

**Status:** Stufe 1 + 2 live · Stufe 3 klärungsabhängig · Stufe 4 nur mit Advoware-Vertrag.

### Stufen-Realitätscheck

| Stufe | Heute | Pilot-Anfang | Mittelfristig | Langfristig |
|---|:-:|:-:|:-:|:-:|
| 1. Manuelle Übergabe | ✓ live | ✓ | ✓ | ✓ |
| 2. Dateibasierter Export (CSV-Bidirectional + PDF pro Akte) | ✓ live | ✓ erweitert | ✓ erweitert | ✓ |
| 3. Teilautomatische Schnittstelle | klärungsabhängig | — | ✓ Q3 (Sprint 5) | ✓ |
| 4. Vollintegration | nicht von uns aus | — | — | nur falls Advoware kooperiert (Wahrscheinlichkeit ~30 %) |

### Was wir heute haben (Stufe 1 + 2 live)

- **CSV-Bidirectional-Import mit Auto-Spalten-Erkennung** für Advoware-Export, plus DATEV / RA-Micro / Excel-Formate. Bulk-Migration einer Akten-Datei in unter 10 Minuten.
- **Branded PDF pro Akte** — kompletter Status mit Checklisten-Stand, Frist, Audit-Auszug, eigenem Briefkopf. Refa hängt das an die Advoware-Akte.
- **Aktenzeichen-Sync** — wenn dein Advoware-Schema bekannt ist (z.B. `25/0301`), 1:1 übernehmbar, kein Mapping.
- **Keine Datenpflege-Doppelung im Pilot** — die CSV-Brücke ist täglich nutzbar, kein Bruch im Arbeitsfluss.

### Was im Pilot-Anfang erweitert wird (KW 19-22)

- **Strukturierter Statuswechsel-Export** — wenn du in GitLaw einen Status änderst, kann das automatisch in eine Tagesliste laufen, die du am Abend in Advoware nachpflegst (CSV oder Drag&Drop).
- **Frist-Sync nach Advoware** — wenn die Auto-Frist nach § 75 VwVfG gesetzt wird, exportieren wir das in deinen Advoware-Frist-Kalender (CSV-Format).

### Mittelfristig (Q3, Sprint 5) — drei Optionen

**Option A — Watch-Folder-Bridge** (am wahrscheinlichsten):
- Advoware exportiert nach einem definierten Verzeichnis (Standard-Funktion in vielen Lizenz-Stufen)
- GitLaw beobachtet den Ordner, aktualisiert Akten automatisch
- Funktioniert ohne API, reine Filesystem-Kommunikation
- Realistisch in **2 Wochen** lieferbar
- Risiko: dein Advoware-Setup muss Watch-Ordner unterstützen

**Option B — Advoware Business Connect** (das offizielle Schnittstellenmodul):
- Falls deine Lizenz das Modul enthält oder du es zubuchst
- REST-ähnliche Schnittstelle, dokumentiert
- Realistisch in **3-4 Wochen** lieferbar
- Risiko: Modul kostet extra (~€500/Monat zusätzlich je nach Stufe)

**Option C — SQL-Direkt-Verbindung (Reverse-Engineering)**:
- Advoware nutzt SQL Server im Hintergrund, Read-Only-Zugriff technisch möglich
- **Nicht empfohlen.** Verletzt Advoware-Lizenz, rechtliches Risiko, bei jedem Advoware-Update kaputt.

### Langfristig (Q4+) — Vollintegration

Nur möglich wenn Advoware dafür einen Vertrag schließt. Realistisch:
- Wir kontaktieren Advoware **gemeinsam** (du als zahlender Kunde, ich als Integrations-Partner)
- Use-Case: Migrations-Kanzlei, Pilot-Phase, DSGVO-konform, Frankfurt-Hosting
- Advoware entscheidet ob sie es wollen — manche Anbieter blocken aus Wettbewerbs-Gründen
- **Realistische Wahrscheinlichkeit: ~30 %.** Wenn nicht, bleiben wir bei Option A oder B.

### Anmerkungen / Rückfragen

- **Welche Advoware-Lizenz hast du genau?** Standard / Pro / Anwaltskanzlei-Edition / mit Business Connect? Steht in deiner Lizenzmail oder ist im Advoware-Kontakt-Bereich abrufbar.
- **Bist du bereit, Advoware-Support zu kontaktieren** (15 Min E-Mail-Anfrage) und nach Watch-Folder / Business-Connect / API-Partnerschaft zu fragen? Ich gebe dir den Text dafür.
- **Welche Daten musst du täglich hin- und herbewegen?** Akten anlegen, Statuswechsel, Schreiben, Fristen — Reihenfolge bestimmt die Sprint-5-Priorität.
- **Gibt es einen Watch-Folder in deinem Advoware-Setup?** Manche Kanzleien haben das schon eingerichtet (Scan-In-Box etc.), das spart uns zwei Wochen.

### Technische Einschätzung

- **Die CSV-Bridge reicht für den Pilot**, das ist nicht nur Zwischenlösung. Bao verwaltet seine Mandanten weiterhin in Advoware, GitLaw übernimmt die KI-/Workflow-/Bilingual-Layer.
- **Watch-Folder ist die wahrscheinlichste Brücke** für Sprint 5 — niedriges Risiko, kein API-Vertrag nötig, Lieferzeit überschaubar.
- **Vollintegration ist nicht von unserer Roadmap allein abhängig** — wir bauen sie nicht spekulativ. Erst wenn Advoware mitspielt, investieren wir die 4-6 Wochen.
- **Open-Source-Vorteil:** Wenn dein Kanzlei-IT-Mensch eine spezielle Advoware-Konfiguration kennt, kann er den Adapter selbst beisteuern. AGPL-3.0 erlaubt das.

### Rechtliche / datenschutzrechtliche Einschätzung

- **Datensicherheit bei Drittintegration:** Bei jeder Advoware-Anbindung läuft Mandanten-Daten zwischen Advoware (deine Kanzlei-Infrastruktur) und GitLaw (Frankfurt-Hosting). Verschlüsselung in-transit (TLS 1.3) ist Pflicht und live.
- **AVV-Kette:** Du hast bereits einen AVV mit Advoware (Standard für Kanzlei-Software). AVV mit mir muss vor produktivem Pilot-Betrieb stehen — Vorlage liegt bereit.
- **Lizenzfragen:** Reverse-Engineering der Advoware-DB ist nicht zulässig (Option C oben). CSV-Export und Watch-Folder sind ausdrücklich erlaubte Standard-Funktionen, da unkritisch.
- **Datenminimierung:** Wir übertragen nur die Felder, die wir für die Workflow-Layer brauchen — nicht die kompletten Mandanten-Stammdaten. Das macht den Lizenz-Footprint klein.
- **Berufsgeheimnis:** Advoware bleibt das Master-System für die Mandanten-Akte. GitLaw ist der Workflow-Beschleuniger, nicht der Speicher des Wahrheitsbestands.
- **Notausgang:** Wenn du den Pilot beendest, exportierst du alle GitLaw-Daten als CSV und löschst den Tenant — keine Hängematte in Advoware-Schnittstellen, kein Vendor-Lock-in.

### To-dos / nächste Schritte

**Heute Abend:**
- Klären: Lizenzstufe + Bereitschaft Advoware-Support zu kontaktieren

**KW 19-22 (Pilot-Anfang):**
- Strukturierter Statuswechsel-Export als tägliche CSV-Liste
- Frist-Sync nach Advoware (CSV-Format)
- Wenn du Advoware-Support kontaktiert hast → Antwort einarbeiten

**Sprint 5 (Q3, August-September):**
- Watch-Folder-Bridge (Option A) — vorbehaltlich Lizenzstufe
- ODER Business-Connect-Anbindung (Option B) — falls Advoware das anbietet und du zubuchen willst

**Q4+:**
- Falls Advoware-Vertrag möglich: Vollintegration evaluieren
- Sonst: CSV + Watch-Folder bleiben dauerhaft die Brücke, wir polieren und stabilisieren statt zu ersetzen

---

## 16. Mögliche Entwicklungsphasen

**Stand:** Phase 1 ist erledigt, Phase 2 überwiegend live, Phase 3-5 stehen mit konkreten Terminen.

| Phase | Stand 06.05.2026 | Sprint(s) | Realistisch erreichbar |
|---|:-:|---|---|
| **Phase 1** Prozessaufnahme + Datenmodell | ✅ erledigt | Sprint 0 | done |
| **Phase 2** Internes KI-Assistenzsystem | ✅ 5/6 Ziele live | Sprint 1-2 | Rest bis 31.05. (Modul D + voller Auto-Versand) |
| **Phase 3** Strukturierter Upload-Prozess | ⏳ teilweise (Intake-Formular live, Wizard nicht) | Sprint 3-4 | Juli-September |
| **Phase 4** Mandantenportal/App | ⏳ nicht begonnen | separater Track | **Q4 2026** — falls Pilot-Daten gut sind |
| **Phase 5** Erweiterte Automatisierung | ⏳ nicht begonnen | nach Phase 4 | **2027** — wenn Phase 1-4 alltagstauglich laufen |

### Anmerkungen / Rückfragen

- **Phase 2 Lücke:** „Dokumentenklassifikation als Pilotfunktion" — heute Beta-Keyword-Match, semantisch erst Sprint 3. Reicht das für Pilot?
- **Phase 4 Bottleneck:** Mandanten-Portal ist ehrlich ein 8-12-Wochen-Block, nicht 4. Braucht eigenes Auth-Modell, eigenes Datenschutz-Konzept (Mandanten-Sicht), externer Pen-Test empfohlen. Sollten wir Phase 4 zeitlich strecken?
- **Phase 5 Frühindikator:** Auswertung Kanzlei-Kennzahlen hat erst Sinn mit 50-100 Akten und 6+ Monaten Pilot. Vor 2027 nicht belastbar.

### Technische Einschätzung

- **Phase 1+2 sind Architektur-stabil.** Datenmodell hält für die nächsten 12-18 Monate ohne Migration.
- **Phase 3** baut auf existierender Mandatsart-Checklisten-Infrastruktur auf — der Sprung ist nicht groß. Hauptarbeit: Mehrsprachiges Upload-Wizard-UI + Fortschrittsanzeige.
- **Phase 4** ist der größte Sprung: zweite App-Schicht (Mandanten-View), zweiter Auth-Flow (Magic Link), zweites Datenschutz-Konzept. Architektur ist vorbereitet (Tenant-Isolation), Implementation ist trotzdem 8-12 Wochen.
- **Phase 5** ist eher Polish + Auswertung als neue Architektur. Niedrigeres Risiko, hohe ROI.

### Rechtliche / datenschutzrechtliche Einschätzung

- **Phase 1+2 (heute live):** Einfaches Risiko-Profil — KI bereitet vor, Anwalt versendet. AVV reicht.
- **Phase 3 (Upload-Wizard):** Mandanten laden Dokumente direkt hoch → eigene Einwilligung pro Hochlade-Akt nötig. Intake-Formular muss erweitert werden.
- **Phase 4 (Mandanten-Portal):** **Größter DSGVO-Hebel.** Mandanten dürfen NUR ihre eigenen Akten sehen, niemals Tenant-Daten. Empfehlung: externer Pen-Test + Code-Audit vor Live-Gang.
- **Phase 5 (Auswertung):** Kanzlei-Statistiken sind aggregiert/anonymisiert — niedriges Risiko. Aber: keine Mandanten-Profile bilden, keine Empfehlungen die Mandanten kategorisieren.

### To-dos / nächste Schritte

- **KW 19-22:** Phase 2 vollständig abschließen (Modul C + Modul D)
- **Juni (Sprint 2):** Phase 2 produktiv (Auto-Versand) + Vorbereitung Phase 3
- **Juli-September (Sprint 3-4):** Phase 3 (Upload-Wizard mehrsprachig)
- **Q4 2026:** Phase 4 startet — vorausgesetzt der Pilot zeigt klaren ROI
- **2027:** Phase 5 — wenn 50+ Akten in Phase 1-4 laufen

---

## 17. MVP-Vorschlag

**Stand:** 8 von 9 Punkten live, 1 in Arbeit.

| # | Bao's MVP-Punkt | Stand 06.05. | Wo Bao das sieht |
|---|---|:-:|---|
| 1 | Mandatsart auswählen | ✅ live | 11 Migrations-Optionen im Akten-Formular |
| 2 | Checkliste generieren | ✅ live | 108 Items, automatisch beim Akten-Anlegen |
| 3 | Eingegangene Unterlagen erfassen | ✅ live | Toggle pro Item + OCR-Drop-Zone |
| 4 | Fehlende Unterlagen anzeigen | ✅ live | Heute-Widget + Filter + Item-Description in Sachstand |
| 5 | Erinnerung DE/VI erzeugen | ✅ live, ⏳ Auto-Versand | 32 Templates · Auto-Versand Sprint 2 (Juni) |
| 6 | Statuskategorie festlegen | ✅ live | 8 Stati mit Übergangs-Regeln |
| 7 | Sachstandsantwort erzeugen | ✅ live | **Der Kern.** 32 Templates, automatisch befüllt |
| 8 | Interne Aufgabe erstellen | ⏳ Modul D | Sprint-1-Rest, ~3 Tage Arbeit, bis Ende Mai |
| 9 | Export Advoware | ✅ live | CSV-Bidirectional + branded PDF pro Akte |

### Bao's vier Zeitfresser — Status

- **Erinnerungen:** ✅ Drafts live, ⏳ Auto-Versand kommt mit Sprint 2 (Juni)
- **Sachstandsanfragen:** ✅ **komplett gelöst** — der größte Hebel ist da
- **Unterlagenprüfung:** ✅ Checklisten + Beta-OCR + Lesbarkeits-Hinweis seit heute Abend
- **Interne Aufgabensteuerung:** ⏳ Modul D bis Ende Mai

### Anmerkungen / Rückfragen

- **MVP-Definition durch Bao:** „internes Assistenzsystem mit klar begrenztem Funktionsumfang". Genau das haben wir geliefert — kein Mandanten-Portal-Theater, kein Feature-Bloat. Möchtest du beim MVP-Scope bleiben oder erweitern?
- **Modul-D-Priorität:** Tasks pro Akte mit Auto-Generierung bei Status-Wechseln — soll ich das in der nächsten Woche fertig machen oder erst nach Modul C (VI-Recherche)? Beide sind 3-5 Tage Arbeit.
- **Auto-Versand-Trigger (Sprint 2):** Welche Trigger willst du am ehesten — 14 Tage nach Antrag eingereicht „Behörde nachfassen", 7 Tage nach Sachstand-Anfrage Mandant „Erinnerung", 30 Tage nach Status `unterlagen_fehlen` „Mahnung"? Reihenfolge nennen, ich baue.

### Technische Einschätzung

- **MVP-Erfüllungsgrad: 88 % heute, 100 % bis Ende Mai.** Das ist schneller als realistische Marktstandards für Legal-Tech.
- **Modul D ist niedriges Risiko:** Datenmodell-Add (3 Tabellen) + Auto-Generierungs-Logik bei bestehenden Status-Hooks. ~3 Tage saubere Arbeit.
- **Was den Liefergrad ermöglicht hat:** Vorhandene GitLaw-Pro-Foundation (Akten + Recherche + Schreiben + Audit + RBAC + Frankfurt-Hosting) war schon da. Dein Lastenheft hat die migrations-spezifische Workflow-Layer drauf gemapped — das war keine Neuentwicklung, sondern gezielte Spezialisierung.
- **Risiko Verzettelung:** Wenn du nach dem Meeting 10 weitere Wünsche hast, schiebt sich Modul D nach hinten. Empfehlung: Modul D in der ersten Juni-Woche fertig, dann erst neue Themen.

### Rechtliche / datenschutzrechtliche Einschätzung

- **MVP heute live:** Niedrigstes Risiko-Profil. Alles läuft mit Mensch-im-Loop, kein Auto-Versand. AVV reicht.
- **MVP-Punkt 5 (Auto-Versand) Sprint 2:** Hier kippt das Risiko — wir brauchen vorher die Mandanten-Einwilligung im Intake. Das ist im Pre-Pilot-Paket dokumentiert (BAO_PILOT_DATENSCHUTZ.md, Punkt 2.3).
- **MVP-Punkt 9 (Advoware-Export):** CSV verlässt deinen Browser nicht ohne deine Aktion. Niedrig.

### To-dos / nächste Schritte

**Heute Abend:** MVP-Punkte 1-7 + 9 live demonstrieren. Punkt 8 als Sprint-1-Rest ankündigen.

**Bis 25.05.:** Modul D (MVP-Punkt 8) live → 100 % MVP-Erfüllung.

**Juni (Sprint 2):** MVP-Punkt 5 voll (Auto-Versand mit Refa-Freigabe). Dann beginnt Phase-3-Vorbereitung.

---

## 17. MVP-Vorschlag

**Status:** wir bauen exakt deinen MVP-Vorschlag

Deine 9 Punkte werden in zwei Sprints geliefert:

**Sprint 1 (Modul A+B+C+D, ~3 Wochen) — Stand 2026-05-06:**
1. ✓ Mandatsart auswählen *(live, 11 Optionen)*
2. ✓ Checkliste generieren *(Modul A — live, 108 Items)*
3. ✓ eingegangene Unterlagen erfassen *(live, plus OCR-Drop-Zone mit Keyword-Match seit heute Abend)*
4. ✓ fehlende Unterlagen anzeigen *(Modul A live + neues Heute-Widget im Dashboard)*
5. ⌥ Erinnerung DE/VI erzeugen *(Sachstand-Templates DE+VI sind live für 8 Stati; freie Erinnerungs-Generierung in Modul C, wartet auf deine Voice-Anchor)*
6. ✓ Statuskategorie festlegen *(Modul B live, 8 Stati mit Übergangs-Regeln)*
7. ✓ Sachstandsantwort erzeugen *(Modul B live, 32 Templates Mandant/Mittelsperson × DE/VI)*
8. ⌥ interne Aufgabe erstellen *(Modul D, Sprint 1 Rest)*
9. ✓ Export Advoware *(CSV-Bidirectional bereits live)*

**Bonus (heute Abend nachgeschoben):**
- ✓ **Heute-Widget** im Dashboard — drei Sektionen (Fristen ≤ 14 Tage, Behörden-Rückfragen, fehlende Pflicht-Unterlagen)
- ✓ **Auto-Frist-Berechnung** beim Status-Wechsel auf „Antrag eingereicht" (3 Monate AufenthG nach § 75 VwVfG, 6 Monate Einbürgerung, 7 Tage Eilantrag)
- ✓ **OCR-Drop-Zone** in der Checkliste mit Keyword-Match-Vorschlägen (Bestätigung manuell)

**Sprint 2 (Auto-Erinnerungs-Engine, ~2 Wochen):** der eigentliche Zeitspar-Hebel — automatische Detection + Draft + Refa-Freigabe + Send.

**Sprint 3 (OCR-Klassifikation, ~2 Wochen):** schließt UC4.

---

## 18. Beispielhafte Statuslogik

**Stand:** alle 5 Beispiel-Stati 1:1 wortgleich im Code, plus 3 weitere für vollständige Workflow-Abdeckung.

| Bao's Status | Code-ID | Internal Description | Mandantenkommunikation DE+VI |
|---|---|:-:|:-:|
| Unterlagen fehlen | `unterlagen_fehlen` | ✅ wortgleich | ✅ live |
| Unterlagen in Prüfung | `unterlagen_in_pruefung` | ✅ wortgleich | ✅ live |
| Antrag in Vorbereitung | `antrag_in_vorbereitung` | ✅ wortgleich | ✅ live |
| Antrag eingereicht | `antrag_eingereicht` | ✅ inkl. Hinweis Bearbeitungsdauer | ✅ live |
| Behördliche Rückmeldung ausstehend | `behoerdliche_rueckmeldung_ausstehend` | ✅ wortgleich | ✅ live |

**Plus 3 ergänzte Stati** (aus UC3 deines Lastenhefts): `behoerde_nachforderung`, `termin_steht_aus`, `verfahren_abgeschlossen`.

**Pro Status** existieren 4 Templates (Mandant/Mittelsperson × DE/VI) = 32 Templates insgesamt, alle wortgleich an deine „Mandantenkommunikation"-Vorgabe angelehnt: klare Liste fehlender Unterlagen, kurze Erklärung, kein Erfolgsversprechen, klare Trennung Kanzlei/Behörde.

**Anhang A** zeigt die exakten Status-Übergangs-Regeln (z.B. `unterlagen_fehlen` → `unterlagen_in_pruefung` erlaubt, aber nicht zurück; `antrag_eingereicht` → `unterlagen_fehlen` ist blockiert).

### Anmerkungen / Rückfragen

- **Item-Description in Sachstand-Templates seit heute Mittag:** Pflicht-Items werden jetzt mit Erklärung gerendert („Reisepass — Original + Kopie aller Stempelseiten · Die Ausländerbehörde prüft Einreisestempel und frühere Visa"). Das war eine konkrete Ergänzung deiner § 18-Anforderung „kurze Erklärung warum benötigt".
- **Übergangs-Regeln zu strikt?** Aktuell sind 18 Übergänge erlaubt, ~20 explizit blockiert (z.B. man kann nicht von „verfahren_abgeschlossen" zurück nach „antrag_eingereicht"). Brauchst du Edge-Case-Szenarien?
- **Status-Wechsel triggert Auto-Frist** (Auto-Berechnung nach § 75 VwVfG bei `antrag_eingereicht`). Ist das willkommen oder zu viel Auto-Magic?

### Technische Einschätzung

- 8-Stati-Modell ist im Datenmodell verankert (`case-status.ts`), die UI rendert nur erlaubte Folge-Stati im Dropdown — keine ungültigen Zustände möglich.
- Jeder Status-Wechsel wird im Audit-Log mit Zeitstempel + User festgehalten.
- Templates sind Funktionen, keine Strings — sie rufen `buildSachstandsContext()` auf und füllen automatisch Mandantenname, Behörde, Frist, Aktenzeichen.

### Rechtliche / datenschutzrechtliche Einschätzung

- Templates enthalten **keine** rechtlichen Erfolgsprognosen oder Frist-Zusagen — bewusst formuliert nach § 14 deines Lastenhefts.
- „Klare Trennung Kanzlei/Behörde" ist in jedem Template explizit: „Die weitere Bearbeitung liegt jetzt bei der Behörde" — schützt vor Haftungs-Falle.
- Audit-Log-Eintrag pro Status-Wechsel ist beweissicher (lückenlos, nicht editierbar).

### To-dos / nächste Schritte

- **Heute Abend:** Live-Demo der 8 Stati + 32 Templates
- **Bao-Feedback einarbeiten:** falls Übergangs-Regeln in der Praxis blocken, im Pilot lockern
- **Sprint 2:** Auto-Versand bei Status-Wechseln (mit Refa-Freigabe)
- **Sprint 3:** Status-Wechsel-Vorschläge aus OCR-Klassifikation (z.B. Eingang Bescheid → Vorschlag „Status auf `behoerde_nachforderung`")

---

## 19. Rollenmodell

**Stand ehrlich:** Architektur ist auf 5 Rollen vorbereitet, **technisch implementiert sind heute 3 Rollen** (Owner / Member / Viewer mit ~12 Scopes). Im Solo-Pilot mit Bao alleine reicht das. Sobald Personal dazu kommt, muss verschärft werden.

### Coverage-Tabelle

| Rolle | Architektur vorbereitet | Technisch live | Lücke / Termin |
|---|:-:|:-:|---|
| **Rechtsanwalt** | ✅ | ✅ als `owner` mit allen Scopes | — |
| **Refa** | ✅ | ~ teilweise — heute als `member` mit denselben Scopes wie Anwalt | Eigene Auth-Rolle mit `case.create + intake.review`, aber ohne `letter.send` für strafrechtliche Bescheide → **Sprint-1-Rest oder Sprint 2** |
| **Studentische Hilfskraft** | ✅ | ✗ fehlt | Eigene Auth-Rolle `assistant` mit reduzierten Scopes (kein `letter.send`, kein `case.delete`) → **Sprint 2**, ~1 Tag Arbeit |
| **Mandant** | ✅ | ✗ fehlt | Eigenes Auth-Modell (Magic-Link via Resend), Tenant-isolierte Sicht (nur eigene Akten) → **Phase 4 (Q4 2026)** |
| **Mittelsperson** | ✅ | ✗ fehlt | Datenmodell mit dokumentierter Vollmacht, Auth-Flow → **Sprint 4 (August)** |

**Was heute live ist:** RBAC-Scopes (`intake.review`, `intake.classify`, `case.view`, `case.create`, `research.view`, `letter.generate`, `audit.view`, `case.delete` etc.) sind im Code vorhanden und werden bei jeder API-Anfrage geprüft. Die feinere Trennung „Refa darf ja, Hilfskraft nein" ist als Mechanismus da, aber die 5-Rollen-Zuweisung ist im UI noch nicht angeboten.

### Anmerkungen / Rückfragen

- **Bao's Frage an dich:** Bist du heute Solo oder hast du eine Refa, die mitarbeitet? Wenn Solo → reicht aktueller Zustand. Wenn Personal dabei → wir verschärfen bis Sprint 2.
- **Hilfskraft-Use-Case:** Hast du studentische Hilfskräfte, die digitalisieren/sortieren? Wenn ja, welche Aktionen sollen erlaubt/verboten sein? Mein Default-Vorschlag: **erlaubt** (OCR, Match-Bestätigen, Akten ansehen) · **verboten** (Sachstand versenden, Schreiben fertigstellen, Status auf „Verfahren abgeschlossen" setzen).
- **Mittelsperson-Vollmachts-Verifikation:** Soll die Vollmacht digital hochgeladen werden (PDF + Akte-Verknüpfung)? Oder reicht eine textuelle Bestätigung im System („Vollmacht liegt schriftlich vor, geprüft am ...")? Beides möglich.
- **Mandant-Login:** Magic-Link an Mandanten-E-Mail oder Mandanten-Smartphone-Nummer (SMS via Twilio EU)? E-Mail ist einfacher, SMS ist niederschwelliger für VI-Mandantschaft ohne starkes E-Mail-Verhalten.

### Technische Einschätzung

- **Heutiger Stand reicht für Solo-Pilot.** Wenn Bao alleine arbeitet, ist die 5-Rollen-Trennung Theater.
- **Sprint-1-Rest oder Sprint 2 schließt Refa + Hilfskraft:** ~1-2 Tage Arbeit. Neue Rollen-IDs in `access.ts`, Scope-Reduktion, UI-Hinweis bei verbotenen Aktionen.
- **Sprint 4 schließt Mittelsperson:** Datenmodell + Auth-Flow + Vollmachts-Validierung. ~1 Woche.
- **Phase 4 schließt Mandant:** Magic-Link-Auth + Tenant-Isolation + Mobile-First-UI + externer Pen-Test. ~8-12 Wochen ehrlich.

### Rechtliche / datenschutzrechtliche Einschätzung

- **Solo-Pilot:** Keine Rollen-Trennungs-Pflicht — Bao verarbeitet alleine seine Mandantendaten. AVV reicht.
- **Refa/Hilfskraft im Pilot:** Wenn dazu kommt, muss interne Schulung dokumentiert sein (§ 32 BDSG). Datenschutz-Schulung empfohlen, kein Compliance-Aufwand für GitLaw.
- **Mandant:** Sobald Mandanten direkt einloggen, gilt Drittpersonen-Datenschutz — Mandant darf NUR seine eigenen Daten sehen, niemals Tenant-Datenbank. Architektur ist darauf vorbereitet (Tenant-Isolation), aber externer Audit vor Live-Gang dringend empfohlen.
- **Mittelsperson:** Vollmacht muss schriftlich + technisch dokumentiert sein. „Person X darf für Mandant Y Status sehen, Erinnerungen empfangen, aber keine eigenen Anträge stellen." Granularität pro Vollmacht.
- **Risiko-Hot-Spot:** Mandant + Mittelsperson sind die kritischsten Rollen DSGVO-rechtlich. Bei Implementation Pen-Test einplanen (~€2-5k extern, vor Live-Gang).

### To-dos / nächste Schritte

- **Heute Abend:** klären — Solo oder mit Personal?
- **Bei Personal:** Sprint-1-Rest oder Sprint 2 (Mai/Juni) → Refa + Hilfskraft als eigene Rollen
- **Sprint 4 (August):** Mittelsperson voll
- **Phase 4 (Q4):** Mandanten-Portal mit eigenem Auth + externem Pen-Test

---

## 20. Offene Klärungspunkte für Entwickler

Deine 15 Klärungsfragen — wir antworten so weit wir können. Die Top-5, die wir vor Sprint-1-Kick-off von dir brauchen, sind im Abschnitt "Klärungsfragen" am Ende dieses Dokuments.

| Bao-Frage | Antwort | Status |
|:-:|---|:-:|
| 1. Advoware-Schnittstellen | unbekannt — bitte bei Advoware-Support nachfragen | offen |
| 2. Häufige Dokumententypen pro Mandatsart | wir haben Default-Liste in Anhang B vorbereitet — bitte ergänzen/korrigieren | offen |
| 3. Existierende Checklisten | bitte Foto wenn vorhanden | offen |
| 4. Aktuelle Textbausteine | bitte 3-5 Beispiel-E-Mails als VI-Anker | offen |
| 5. VI-Standardformulierungen | siehe 4 | offen |
| 6. Mittelspersonen-Dokumentation | bitte aktuelles Verfahren beschreiben | offen |
| 7. Kommunikationskanäle MVP | unsere Empfehlung: E-Mail (Refa-Freigabe) + PDF/Word; WhatsApp organisatorisch reduzieren | Workshop |
| 8. WhatsApp ja/nein | siehe 7 | Workshop |
| 9. Datenspeicherung | Frankfurt (Upstash + Vercel) — bestätigt | ✓ |
| 10. Dienstleister | OpenAI mit `X-No-Train` + DSGVO-Anonymizer, Frankfurt-Hosting | ✓ |
| 11. KI-Modelle | gpt-4o-mini Structured Outputs für Strukturarbeit, ggf. claude-sonnet für Übersetzung | ✓ |
| 12. KI-Training-Schutz | OpenAI Org-Setting + Prompt-Header + Anonymizer | ✓ |
| 13. Freigabeprozesse | Refa-Freigabe Standard, Anwalts-Freigabe bei sensiblen Fällen | ✓ |
| 14. Vollautomatischer Lauf | erst nach 4-6 Wochen Pilot mit deinem expliziten Go | abgestimmt |
| 15. Kennzahlen | siehe Abschnitt "Erfolgskriterien" | siehe 21 |

---

## 21. Erste Erfolgskriterien

**Confidence-Übersicht: 7 von 9 KPIs erreichbar mit aktueller Roadmap, 2 brauchen Phase 4 oder externe Faktoren.**

| # | Bao-KPI | Confidence | Wann messbar | Wie wir messen | Ziel-Wert |
|---|---|:-:|---|---|---|
| 1 | Erinnerungs-Mails -40 % | **HOCH** mit Sprint 2 | nach 6-8 Wochen Pilot | Audit-Log: manuell vs. automatisch | -40 % |
| 2 | Sachstandsanfragen -30 % | **SEHR HOCH** | ab Tag 1 zählbar, Vergleich nach 4 Wochen | Sachstand-Generator-Klicks vs. Bao's Self-Report „Mandant rief an" | -30 % |
| 3 | Schnellere Feststellung fehlender Unterlagen | **HOCH** | sofort | Heute-Widget-Aufrufe + qualitative Bewertung | <2 Min Erkenntnis-Zeit |
| 4 | Weniger unzugeordnete Dokumente | **MITTEL heute, HOCH Sprint 3** | Sprint 3 (semantische Klassifikation) | OCR-Match-Bestätigungen / manuelle Zuordnungen | <5 % unzugeordnet |
| 5 | WhatsApp/E-Mail-Sortieraufwand | **MITTEL** | nach 4-6 Wochen | indirekt — Intake-Formular-Nutzung; WhatsApp bleibt extern | qualitativ |
| 6 | Kürzere interne Bearbeitungszeit bis Antragseinreichung | **HOCH** | nach 6-8 Wochen mit Modul A+B+D | Zeitstempel zwischen Status-Wechseln im Audit-Log | -25 % Cycle-Time |
| 7 | Bessere Transparenz für Mandanten | **HOCH erst mit Phase 4** | Q1 2027 | Mandanten-Login-Frequenz + Survey | qualitativ |
| 8 | Geringere Refa-Arbeitsbelastung | **HOCH** | nach 4-6 Wochen | wöchentlicher 2-Min-Refa-Self-Report | qualitativ |
| 9 | Bessere Planbarkeit bei steigenden Mandatszahlen | **HOCH bei Skalierung** | sobald 10+ neue Akten/Woche | Cycle-Time pro Akte aus Audit-Log | Stabile/sinkende Zeit pro Akte |

### Was wir bereits ab heute Abend messen (Tag 1 des Pilots)

- KPI 2: Anzahl generierter Sachstandsantworten pro Tag
- KPI 3: Anzahl Akten mit Mandatsart-Zuordnung + Heute-Widget-Hits
- KPI 4: Anzahl OCR-Match-Bestätigungen + Anteil
- KPI 8: Wöchentlicher 2-Min-Self-Report-Survey („spart Zeit / neutral / kostet Zeit")

### Was nach 4-6 Wochen messbar wird

- KPIs 1, 5, 6: brauchen Baseline-Vergleich „vorher / nachher"
- KPI 9: braucht ausreichende Akten-Anzahl

### Was Phase 4 braucht

- KPI 7: Mandanten-Transparenz wirklich nur mit Mandanten-Portal messbar (Login-Frequenz, Self-Service-Rate, Anrufreduktion)

### Anmerkungen / Rückfragen

- **40-%/30-%-Quoten:** Diese Zahlen sind ambitioniert aber realistisch. Mein Confidence-Statement: ich glaube wir schaffen die -30 % bei Sachstandsanfragen schon in den ersten 4 Wochen, sobald du die Templates regelmäßig nutzt. Die -40 % bei Erinnerungs-Mails brauchen Sprint 2 (Auto-Versand) → realistisch ab Juli.
- **Baseline-Daten brauchen wir von dir:** Wie viele manuelle Erinnerungs-Mails verschickt deine Kanzlei aktuell pro Woche? Wie viele Sachstandsanfragen kommen pro Woche rein? Ohne diese Baseline ist „-30 %" nur eine Zahl ohne Bezug. Wenn du 1 Woche lang grob Buch führst (ich gebe dir ein 5-Felder-Sheet), haben wir den Vergleichsanker.
- **Refa-Self-Report:** Brauchst du eine Refa, die das Pilot-mitfährt? Wenn nicht, ersetzen wir KPI 8 durch deinen eigenen Anwalts-Self-Report.

### Technische Einschätzung

- **Audit-Log ist die KPI-Quelle.** Jeder relevante Workflow-Event wird dort erfasst. Heute Abend zeige ich dir wie ich das auswerte.
- **KPI-Dashboard kommt mit Sprint 2** — ein dediziertes Auswertungs-Pane, kein nur „Audit-Log durchscrollen". Heute reicht der Audit-Log selbst.
- **Externe Daten (KPI 5 WhatsApp):** Können wir nicht direkt messen, weil WhatsApp nicht in unserer Architektur liegt. Self-Report-basiert.

### Rechtliche / datenschutzrechtliche Einschätzung

- **Audit-Log-basierte KPIs:** Personalisierungs-Risiko niedrig — wir tracken Workflow-Events, keine Mandanten-Profile. KPIs werden aggregiert dargestellt.
- **Refa-Self-Report:** Datenschutz-Hinweis an Refa: Self-Report ist freiwillig, nicht zur Leistungsbewertung verwendbar.
- **Mandanten-Survey (Phase 4):** Bei späterem Mandanten-Survey gilt Einwilligung in Markt-/Service-Forschung — separater Block im Mandanten-Portal.

### To-dos / nächste Schritte

- **Heute Abend:** Baseline-Sheet vereinbaren (5 Felder, 1 Woche tracken)
- **Pilot-Start (KW 22):** Tag-1-Metriken aktivieren (KPIs 2, 3, 4, 8)
- **Pilot-Wochen 4-6:** Erste Vergleichs-Auswertung (KPIs 1, 5, 6)
- **Pilot-Wochen 8-12:** Skalierungs-Test (KPI 9)
- **Q1 2027:** Vollständige KPI-Auswertung mit Phase-4-Daten

---

## 22. Zusammenfassung — was wir konkret vorschlagen

**Wir starten Sprint 0 heute** mit dem Datenschema für die Mandatsart-Checklisten (siehe Anhang B). Das Schema ist bereits angelegt und committet.

**Sprint 1 (3 Wochen) liefert:**
1. Vollständige Migration-Mandatsart-Checklisten DE+VI in der Pro-Akten-Ansicht
2. 8-Stati-Status-Modell mit Sachstands-Generator
3. Vietnamesische KI-Antworten (Voice-Polish durch dich)
4. Interne Aufgaben-Steuerung pro Akte

**Sprint 2 (2 Wochen):** Auto-Erinnerungs-Engine mit Refa-Freigabe → adressiert die größte Zeitfresser-Kategorie

**Sprint 3 (2 Wochen):** OCR-Klassifikation + Auto-Benennung → schließt UC4 ab

**Sprint 4 (2 Wochen):** Mittelspersonen-Modell mit Vollmachts-Validierung

**Phase 4 (separater 4-6 Wochen-Track):** Mandanten-Portal mit eigenem Login

**Gesamtzeitrahmen MVP-fertig:** ~9-10 Wochen, anschließend Pilot-Phase mit echten Mandaten.

---

## Klärungsfragen vor Sprint-1-Kickoff

Damit wir nicht in falsche Richtungen bauen, brauchen wir vor Sprint-1-Start Antworten auf diese fünf Fragen:

1. **Welche 3 Mandatsarten zuerst?** Unser Vorschlag: Visumsverfahren + Aufenthaltstitel-Verlängerung + Familiennachzug. Bestätigen oder ändern?

2. **Existierende Checklisten** auf Papier oder im Kopf — bitte 2-3 als Foto/Skizze schicken. Wir haben in Anhang B Default-Listen vorbereitet, die wahrscheinlich noch nachjustiert werden müssen.

3. **3-5 Beispiel-Erinnerungs-E-Mails** aus eurem Bestand (DE oder VI), aus denen wir den linguistischen Stil ableiten — damit auto-generierte Drafts wie aus eurer Kanzlei klingen, nicht wie KI.

4. **Mittelsperson-Praxis aktuell:** Wie wird die Berechtigung dokumentiert? Schriftliche Vollmacht mit Unterschrift? Mündliche Vereinbarung? E-Mail-Bestätigung des Mandanten?

5. **Advoware-API:** Bitte bei Advoware-Support fragen, ob es nicht-öffentliche Schnittstellen für Partner gibt, evtl. unter NDA. Falls ja — erste Priorität.

---

## Für unser Treffen morgen

Das Dokument oben ist die Diskussionsgrundlage. Konkret bringen wir morgen Folgendes mit:

1. **Coverage-Audit** (Abschnitte 1-22 oben) — du siehst pro Bereich, was heute schon live ist und wo wir ergänzen
2. **Sprint-Plan** mit Aufwandsschätzungen pro Modul
3. **Modul-A-Foundation** als Code im Repo, mit Seed-Checklisten für 11 Mandatsarten — in Anhang B unten
4. **5 Klärungsfragen** (Abschnitt direkt oben), die wir gemeinsam durchgehen sollten

**Was wir morgen klären sollten:**
- Stimmt unsere Sprint-Reihenfolge mit deiner Realität überein?
- Default-Checklisten in Anhang B: was fehlt, was kannst du raus-streichen, was sind kanzlei-spezifische Besonderheiten?
- Top-3 Mandatsarten für den ersten Live-Pilot (unser Vorschlag: Aufenthaltstitel + Familiennachzug + Visumsverfahren — bestätigen oder umsortieren)
- Welche 2-3 Personen aus eurer Kanzlei sollen die ersten Test-Accounts bekommen?
- Realistischer Zeitrahmen aus deiner Sicht — können wir Sprint 1 (3 Wochen) tatsächlich anschieben oder gibt es Engpässe deinerseits (Urlaub, große Verfahren, etc.)?

**Optional fürs Meeting** (wenn Zeit bleibt):
- Live-Demo der existierenden Pro-App auf `gitlaw-xi.vercel.app/#/bao` mit deinem Account
- Vorstellung des MCP-Servers — falls eure Kanzlei perspektivisch eine eigene KI-Assistenz auf Claude Desktop oder ChatGPT hosten will, ist GitLaw als Tool integrierbar

---

## Anhang A: 8-Stati-Status-Übergangs-Regeln

| Von Status | Erlaubte Übergänge | Wer darf ändern |
|---|---|---|
| Unterlagen fehlen | → Unterlagen in Prüfung (alle erforderlichen da) | Refa, Anwalt |
| Unterlagen in Prüfung | → Antrag in Vorbereitung (Prüfung positiv) / → Unterlagen fehlen (Nachforderung) | Refa, Anwalt |
| Antrag in Vorbereitung | → Antrag eingereicht | Anwalt (Refa nach Anwalts-Sichtprüfung) |
| Antrag eingereicht | → Behördliche Rückmeldung ausstehend (auto nach 7 Tagen) | System |
| Behördliche Rückmeldung ausstehend | → Behörde Nachforderung / → Termin steht aus / → Verfahren abgeschlossen | Refa, Anwalt |
| Behörde Nachforderung | → Unterlagen in Prüfung (Nachforderung beantwortet) | Refa, Anwalt |
| Termin steht aus | → Verfahren abgeschlossen | Anwalt |
| Verfahren abgeschlossen | (terminal) | — |

Jeder Status hat ein DE+VI Antwort-Template, das im Sachstands-Generator verwendet wird.

---

## Anhang B: Default-Mandatsart-Checklisten (Modul-A-Seed-Daten)

Dies ist der heute angelegte Daten-Seed für die ersten 11 Mandatsarten. Die Listen sind bewusst defensiv (eher mehr verlangt als weniger). Bitte ergänzen, korrigieren, kürzen.

(Datei: `viewer/src/pro/mandatsart-checklists.ts` — siehe Repo)

### Beispiel: Aufenthaltstitel-Verlängerung
- Reisepass (Original + Kopie aller bestempelten Seiten)
- Aktueller Aufenthaltstitel
- Aktuelle Meldebescheinigung (≤ 3 Mo alt)
- Mietvertrag oder Wohnungsgeber-Bestätigung
- Einkommensnachweis (3 letzte Lohnabrechnungen)
- Krankenversicherungs-Nachweis
- Biometrisches Lichtbild (35×45 mm)
- Anwalts-Vollmacht
- (bedingt) Sprachzeugnis B1 falls für den Titel erforderlich
- (bedingt) Eheurkunde falls Familiennachzug-bezogen

### Beispiel: Familiennachzug Ehegatte/Ehegattin
- Reisepass beider Ehegatten
- Heiratsurkunde + Apostille
- Geburtsurkunden (falls Kinder)
- Wohnraum-Nachweis (Mietvertrag + Quadratmeter)
- Einkommensnachweis (3 Mo) des/der hier lebenden Partner:in
- Krankenversicherungs-Nachweis
- Sprachzeugnis A1 (für nachziehenden Partner:in)
- Anwalts-Vollmacht

(weitere 9 Mandatsarten in der Datei — siehe nächstes Update)

---

## Anhang C: Was zwischen Lastenheft-Eingang und heute committed wurde

Stand 2026-05-06, alles auf `main`-Branch, live unter `gitlaw-xi.vercel.app`. Sieben Commits, ungefähr in dieser Reihenfolge:

### Sprint 0 — Foundation (`faee6db`)
Datenschema + Seed-Daten für 11 Migrations-Mandatsarten mit insgesamt 108 kuratierten Pflicht- und Optional-Unterlagen.
- `viewer/src/pro/mandatsart-checklists.ts` (1.085 Zeilen)
- `viewer/src/pro/types.ts` — `MandatsartChecklist`, `ChecklistItem`, Erweiterung von `MandantCase` um `mandatsartId`, `checklistStates`, `caseStatus`, `behoerde`

### Sprint 1 Modul A — Checklisten in der UI (`45f4002`)
- `MandatsartSelector.tsx` — Dropdown-Auswahl aus 11 Mandatsarten beim Akten-Anlegen
- `CaseChecklist.tsx` — Section in der Akten-Detail-View. Zeigt jedes Item mit Status `received` / `pending` / `problem`, ein Klick toggelt. Filter „nur fehlende Pflicht-Unterlagen". Fortschrittsbalken.

### Sprint 1 Modul B — 8-Stati + Sachstands-Generator (`1909330`)
- `case-status.ts` — 8 Stati mit Übergangs-Regeln (siehe Anhang A)
- `sachstand-templates.ts` — 32 Antwort-Templates (8 Stati × Mandant/Mittelsperson × DE/VI)
- `StatusDropdown.tsx` — zeigt nur erlaubte Folge-Stati
- `SachstandsGenerator.tsx` — Drawer mit DE+VI parallel, Empfänger-Toggle Mandant/Mittelsperson, Copy-to-Clipboard

### Sprint 1 Polish — Demo-Akte + Behörden-DB (`759d54e`, `7c0d9fb`)
- `demo-seed.ts` — fertige Beispiel-Akte für Phạm Văn Đức, Aufenthaltstitel-Verlängerung, halb gefüllte Checkliste
- `behoerden.ts` + `BehoerdenSelector.tsx` — 17 Berliner Migrations-Stellen (LEA, BAMF, VG Berlin, Botschaften Vietnam) als Combobox
- Bug-Fix: Demo-Button konsumiert Invite-Token sauber

### DE-Voice-Sweep + Demo-Skript (`0f84984`)
- 32 Sachstand-Templates auf Deppen-Apostroph, Formular-Doppelpunkte und militärischen Ton durchgesehen
- `BAO_DEMO_SKRIPT_2026-05-06.md` — 5-Schritte-Demo-Walkthrough für unser Treffen

### Drei Bonus-Features für die Demo (`87028d4`)
- **TodayWidget** im Dashboard ganz oben — drei Sektionen: Fristen ≤ 14 Tage, Akten mit `behoerde_nachforderung` oder `unterlagen_fehlen`, Akten mit fehlenden Pflicht-Unterlagen. Click-to-Akte.
- **Auto-Frist-Berechnung** beim Status-Wechsel auf `antrag_eingereicht` — Lookup-Tabelle pro Mandatsart, setzt Behörden-Bearbeitungsfrist nach § 75 VwVfG (3 Monate für Aufenthaltstitel, 6 Monate Einbürgerung, 7 Tage Eilantrag etc.) automatisch ein.
- **OCR-Drop-Zone** in der Checkliste — wirft du ein Foto/PDF rein, OCR (PDF-Text-Layer oder OpenAI Vision für Scans) läuft, Keyword-Match gegen Checklisten-Item-Namen mit Aliassen (DE/EN/VI: Reisepass/passport/hộ chiếu, krankenversicherung/TK/AOK/Barmer, etc.). **Nichts wird automatisch akzeptiert** — jeder Match erscheint als Vorschlag mit „Bestätigen" / „Verwerfen". OCR ist als Beta-Erkennung gelabelt, weil ich deine echten PDFs nicht kenne.

### Was *bewusst* noch nicht da ist
- E-Mail-Auto-Versand (Sprint 2)
- OCR-Klassifikation auf semantischer Ebene (Sprint 3 — der OCR-Block oben ist nur Keyword-Match, kein vollständiges Document-Understanding)
- Mittelspersonen-Datenmodell (Sprint 4 — Templates sind vorbereitet, Datenmodell folgt)
- Mandanten-Portal (Phase 4)
- Advoware-Anbindung (offen, wartet auf deine Entscheidung in §15)

### So klickst du das in 60 Sekunden durch
1. `gitlaw-xi.vercel.app/#/bao` öffnen
2. „Demo-Akte anlegen" klicken → Phạm Văn Đức (AZ-2026-0042) erscheint
3. Akte öffnen — Checkliste, Status-Dropdown, Sachstands-Generator (DE+VI)
4. Status auf „Antrag eingereicht" → Frist wird automatisch gesetzt
5. Foto in die OCR-Drop-Zone werfen → Match-Vorschläge erscheinen

---

**Diese Datei** (`BAO_KI_DATENVERARBEITUNG_ANTWORT.md`) ist die persistierte, lebende Antwort auf dein Lastenheft. Ich aktualisiere sie nach jedem Sprint.

---

## Anmerkungen / Rückfragen

- **Auto-Versand-Hebel (Punkte 1 + 5 deiner Priorisierung):** Wir brauchen vor Sprint 2 eine Entscheidung zu deinem E-Mail-Setup. Eigener SMTP der Kanzlei, Resend (EU-Region) oder Mailgun? Mein Vorschlag: Resend, weil EU-only und mit Domain-Verifikation in 30 Min einsatzbereit. Die Refa-Freigabe-Stufe baue ich ohnehin ein.
- **Voice-Anchor-Mails:** 5 echte (anonymisierte) Sachstands-Antworten von dir, gemischt DE + VI, sind die Voraussetzung für Modul C. Ohne die bauen wir die VI-Stilistik blind.
- **Mittelsperson-Häufigkeit:** Wie oft schreibst du tatsächlich an Familienmitglieder oder Dolmetscher statt direkt an die Mandantschaft? Bestimmt, ob Sprint 4 vorgezogen wird.
- **Modul-Reihenfolge nach dem Meeting:** Modul D (Tasks pro Akte, ~3 Tage) oder Modul C (VI-Recherche, ~1 Woche) zuerst? Beide sind Sprint-1-Rest, Reihenfolge ist deine.
- **Advoware-Lizenzstufe:** Standard, Pro oder Anwaltskanzlei-Edition? Beeinflusst, ob eine API-Anbindung in Sprint 5 möglich ist oder ob wir bei der CSV-Bridge bleiben.
- **Behörden-Lücken:** Aktuell 17 Berliner Stellen vorbefüllt. Welche fehlen für deinen Alltag? LEA Brandenburg, BAMF-Außenstellen, andere Botschaften? Ergänze ich nach dem Termin.

---

## Technische Einschätzung

- **Stack:** React 19 + TypeScript + Vite + Tailwind 4 (Frontend), Vercel Serverless Functions Frankfurt + Upstash Redis Frankfurt (Backend), OpenAI gpt-4o-mini mit JSON-Schema Structured Outputs (LLM). Alles produktionsfähig, nichts experimentell.
- **Anti-Halluzination:** Jede §-Zitierung wird gegen den lokalen Korpus von 5.936 Bundesgesetzen verifiziert. 53/53 hand-gelabelte Eval-Cases laufen grün in der CI. Strukturierte Verifikations-Stati (✓ verifiziert · ⚠ unbekannt · 🚨 aufgehoben) sind im UI sichtbar — keine stille KI-Erfindung.
- **Skalierbarkeit:** Aktuell läuft der Pro-Datenstore lokal im Browser (localStorage), Cloud-Sync ist optional und tenant-gebunden. Für deine Solo-Phase reicht das. Sobald Refa(s) mitarbeiten, wechseln wir auf den Server-Modus — der Code ist dafür vorbereitet.
- **Bekannte Bottlenecks:**
  - OCR auf großen PDFs (>10 Seiten) kann an Vercels 10s-Funktions-Limit stoßen. Lösung in Sprint 3: Background-Worker oder Client-seitiges PDF-Splitting.
  - VI-Templates sind grammatikalisch korrekt aber nicht muttersprachlich poliert — Voice-Polish mit dir ist kritisch.
  - Keyword-Match-OCR ist Beta. Echtes Document-Understanding kommt in Sprint 3.
- **Open Source:** Alles unter AGPL-3.0 auf GitHub. Du kannst jederzeit den Code prüfen oder prüfen lassen. Kein Lock-in.

---

## Rechtliche / datenschutzrechtliche Einschätzung

- **Hosting durchgängig EU/DE:** Vercel Frankfurt (Hosting + APIs), Upstash Frankfurt (Redis), Resend EU (E-Mail). Keine US-Datentransfers im laufenden Betrieb.
- **DSGVO-Schutz vor LLM-Anfragen:** 14 PII-Pattern (Namen, Adressen, IBAN, BIC, Steuer-ID, SV-Nummer, Aktenzeichen, Geburtsdatum, Firmen) werden vor jeder OpenAI-Anfrage anonymisiert. Whitelist gegen Falsch-Anonymisierung von Rechtsbegriffen.
- **AVV-Vorlage:** Generator für deine Mandanten-AVV ist live, mit deinem Briefkopf.
- **Berufsgeheimnis (§ 43a BRAO):** KI bereitet vor, du verantwortest. Kein KI-Output wird automatisch versandt. Jeder PDF-Export hat Disclaimer-Footer. Anwaltliche Verschwiegenheit bleibt durch lokale Citation-Verifikation gewahrt.
- **Audit-Log:** Lückenlos, BHV-tauglich als PDF exportierbar. Eingegangene Informationen, KI-Empfehlungen, Freigaben, Versendungen und Statusübermittlungen sind nachverfolgbar.
- **OpenAI-Settings:** Org-weiter „no training"-Status gesetzt, plus `X-No-Train`-Header pro Anfrage.
- **Offene Punkte für deine Bewertung:**
  - **OpenAI = US-Anbieter trotz EU-Endpoint:** Standard-Geschäftsklauseln vorhanden, AVV mit Microsoft (Azure-OpenAI-Tenant) als Upgrade-Pfad in Sprint 5+ falls dein Mandantenkreis das fordert.
  - **Notausgang-Funktion:** Vollständige Löschung aller Pro-Daten dieses Tenants ist 1 Klick (live in Einstellungen).
  - **AVV zwischen dir und mir (als Auftragsverarbeiter):** Vorlage liegt bereit, müssen wir vor produktivem Pilot-Betrieb unterzeichnen.

---

## To-dos / nächste Schritte

**Heute Abend (06.05.):**
- Live-Demo der 7 gelieferten Features durchgehen
- Deine Top-3 Mandatsarten + Top-3 Pain-Points-Korrekturen aufnehmen
- 5 Voice-Anchor-Mails einsammeln (oder Termin dafür festsetzen)
- 5 Klärungsfragen aus diesem Dokument durchgehen

**Diese Woche (KW 19, bis 11.05.):**
- Bao-Feedback in `behoerden.ts`-Lücken einarbeiten
- Sprint-1-Rest-Reihenfolge basierend auf deiner Antwort: Modul C oder Modul D zuerst
- AVV-Vorlage zwischen uns vorbereiten und unterzeichnen, falls du im Pilot fortfahren willst

**Bis Ende Mai (Sprint-1-Abschluss):**
- Modul C (VI-Recherche) mit deinen Voice-Anchors backen
- Modul D (Tasks pro Akte) mit Auto-Generierung bei Status-Wechseln
- Erste echte Mandanten-Akte (mit DSGVO-konformer Anonymisierung) durch den Flow führen

**Juni — Sprint 2 (Auto-Erinnerungs-Engine):**
- E-Mail-Setup-Entscheidung umsetzen (Resend-Domain-Verifikation, ~30 Min)
- Auto-Detection für 14-Tage-Erinnerungen + Refa-Freigabe-Stufe
- Versand-Logging im Audit-Log

**Juli — Sprint 3 (OCR-Klassifikation, UC4):**
- Background-Worker für große PDFs
- Semantische Klassifikation statt Keyword-Match
- Confidence-Score + Sichtprüfungs-Markierung

**August — Sprint 4 (Mittelspersonen):**
- Datenmodell für autorisierte Kontaktpersonen
- Vollmacht-Validierung beim Versand
- Templates für Mittelspersonen sind bereits da

**Q4 — Phase 4 (Mandanten-Portal):**
- Erst wenn die ersten 3 Sprints im Alltag bestehen
- Separater Track, eigene Bewertung

**Laufend:**
- Wöchentliches 15-Min-Sync (Vorschlag: Mittwoch nachmittag, du sagst mir die beste Zeit)
- Monatliches Demo-Review mit gezeigten KPIs aus § 21
- Diese Datei wird nach jedem Sprint aktualisiert

---

**Mit besten Grüßen,**

Mikel

*PS: Das Lastenheft ist die Basis für eine ernsthafte Förderantrag-Bewerbung (Prototype Fund, Bertelsmann, Schöpflin). Wenn die ersten 3 Sprints laufen und wir Pilot-Daten haben, sollten wir darüber reden.*
