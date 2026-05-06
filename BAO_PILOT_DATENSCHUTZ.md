# Pilot-Datenschutz-Konzept — GitLaw Pro × Kanzlei Nguyen

**Stand:** 2026-05-06
**Geltungsbereich:** Pilot-Phase Mai-August 2026
**Zweck:** Klare Trennlinie zwischen Demo (heute) und produktivem Pilot (mit echten Mandantendaten)

---

## 1. Heute Abend (06.05.) — Demo-Phase

**Geltend für:** Erstes Live-Meeting, gemeinsames Durchklicken, technisches Onboarding.

**Erlaubte Daten:**
- Fiktive Demo-Akte (Phạm Văn Đức, AZ-2026-0042) — komplett synthetisch
- Anonymisierte Beispiel-Bilder für OCR (z.B. Stock-Photo Reisepass)
- Bao's Kanzlei-Stammdaten (Name, Anschrift, Briefkopf) — sind keine Mandantendaten

**Verboten:**
- Echte Mandanten-Namen, Adressen, Geburtsdaten
- Echte Mandanten-PDFs in OCR-Drop-Zone
- Echte Sachstand-Anfragen mit Klartext-Mandanten-Bezug

**Schutzmaßnahmen:**
- Cloud-Sync deaktiviert (Default)
- Inkognito-Browser-Fenster empfohlen
- Bei Bildschirm-Share: kein Beta-Token-URL zeigen (vor dem Consume)

**Recht­liche Grundlage:** Berechtigtes Interesse Art. 6 Abs. 1 lit. f DSGVO (Software-Test mit fiktiven Daten — keine personenbezogenen Daten verarbeitet).

---

## 2. Pre-Pilot-Phase (KW 19-21, bis 25.05.) — Vorbereitung produktiver Pilot

**Was passieren muss bevor ein echter Mandant rein darf:**

### 2.1 AVV-Vertrag

- **AVV zwischen Mikel Ninh (Auftragsverarbeiter) und Kanzlei Nguyen (Auftraggeber)** muss unterzeichnet sein.
- Vorlage liegt bereit in `gitlaw/legal/avv-vorlage.pdf` (oder per E-Mail).
- Inhalt: Datenkategorien, Zweck, Dauer, Subunternehmer (Vercel, Upstash, OpenAI, Resend), Löschkonzept, Auditrechte.
- **Status: ⏳ ausstehend, vor 25.05. zu unterzeichnen.**

### 2.2 DSGVO-Anonymizer-Verifikation

- Gemeinsame Live-Sitzung (~30 Min): Bao gibt Klarnamen ein, wir verfolgen im Browser-Netzwerk-Tab welche Daten OpenAI tatsächlich erreichen.
- Erwartung: Klarnamen werden zu `[NAME-1]`, `[ADRESSE-1]`, `[GEBDATUM-1]` etc. ersetzt.
- **Wenn ein einziger Klarname durchrutscht:** Anonymizer wird gefixt bevor produktiver Pilot startet.
- **Status: ⏳ ausstehend.**

### 2.3 Mandanten-Einwilligungs-Block im Intake

- Intake-Formular bekommt vor Pilot-Start einen Pflicht-Block:
  > „Ich willige ein, dass meine Daten zum Zweck der Mandatsbearbeitung in GitLaw Pro (Auftragsverarbeiter Mikel Ninh, Berlin, Hosting Vercel + Upstash Frankfurt) verarbeitet werden. KI-gestützte Vorbereitung von Schreiben, Erinnerungen und Sachstandsmitteilungen ist eingeschlossen. Diese Einwilligung kann ich jederzeit widerrufen."
- Inkl. AGB-Verlinkung und Widerrufsrecht.
- **Status: ⏳ wird vor 22.05. eingebaut (1 Tag Arbeit).**

### 2.4 Bao's Lokales Setup

- Browser für Pilot-Nutzung: **dedizierter Browser-Profil** (z.B. Chrome-Profil „Kanzlei-GitLaw") ohne andere Tabs/Erweiterungen
- Geräte-Sperre nach 5 Min Inaktivität
- Bei Geräte-Wechsel: Cloud-Sync nutzen oder Daten aktiv mitnehmen
- **Status: Bao-eigene Verantwortung, von uns dokumentiert.**

### 2.5 Token-Rotation

- Aktueller Token `BETA-NGUYEN` ist Pilot-Token. Vor produktivem Live-Gang wird ein neuer, längerer Token generiert.
- Alter Token wird invalidiert (Server-seitige Block-Liste, kommt mit Sprint 2).
- **Status: ⏳ Sprint 2 (Juni).**

---

## 3. Produktive Pilot-Phase (ab KW 22, ab 26.05.) — mit echten Mandanten

**Voraussetzung:** Punkte 2.1-2.5 abgeschlossen.

### 3.1 Datenklassen + Schutzlevel

| Datenklasse | Wo sie lebt | Schutzlevel |
|---|---|---|
| Mandanten-Stammdaten (Name, Adresse, GebDatum) | Browser-localStorage + optional Cloud-Sync (Upstash Frankfurt) | Anonymisiert vor LLM-Aufruf |
| Behörden-Korrespondenz (Bescheide, Anträge) | localStorage als Metadata; Volltext nur lokal (Akten-Anhänge) | Behörden-Daten sind weniger sensibel als Mandantendaten, aber mit-anonymisiert |
| KI-generierte Drafts (Sachstand, Schreiben) | localStorage + Audit-Log | Bleibt lokal bis Anwalt versendet |
| OCR-Texte | nicht persistiert (transient) — OpenAI Vision-Aufruf läuft, Antwort wird in UI gezeigt, nicht gespeichert | Anonymizer NACH OCR-Antwort, bevor weitere LLM-Verarbeitung |
| Audit-Log | localStorage + optional Cloud-Sync | Lückenlos, BHV-tauglich |

### 3.2 LLM-Aufruf-Pipeline (was passiert technisch)

```
Mandanten-Klartext (z.B. "Phạm Văn Đức, geb. 12.03.1985, Mietvertrag Berliner Str. 5")
  ↓
DSGVO-Anonymizer (14 Patterns, lokal vor Versand)
  ↓
Anonymisierter Klartext: "[NAME-1], geb. [DATUM-1], Mietvertrag [ADRESSE-1]"
  ↓
HTTPS + TLS 1.3 → OpenAI EU-Endpoint (Frankfurt)
  ↓
OpenAI: gpt-4o-mini, Org-Setting "no training" + X-No-Train-Header
  ↓
Antwort kommt zurück mit den Tags
  ↓
Lokaler De-Anonymizer ersetzt zurück zu Klarnamen
  ↓
Rendering im Browser
```

**Kritischer Punkt:** Wenn der Anonymizer ein PII-Pattern verpasst, geht Klartext durch. Deshalb 2.2 (Verifikation).

### 3.3 OCR-Sonderbehandlung

- **OpenAI Vision** (für Scans ohne Text-Layer) sieht das **komplette Bild**. Anonymizer kann bei Bildern nichts vor-redaktieren.
- **Mitigation:** OCR wird nur auf explizite Anwender-Aktion ausgeführt (Drop-Zone, kein Auto-OCR auf Eingangs-Mails).
- **Mandanten-Einwilligung:** Im Intake-Block muss Mandant der OCR-Verarbeitung zustimmen.
- **Sprint 3 (Juli):** Evaluation ob lokales Embedding-Modell (z.B. CLIP) die Vision-Aufrufe ablösen kann — dann verlassen Bilder das Frankfurt-Hosting nicht.

### 3.4 Was bei einem Datenleck passiert

1. **Sofort-Maßnahme:** `eraseAllProData()` — vollständiges Löschen aller Pro-Daten dieses Tenants im Browser. Cloud-Sync-Daten bleiben (separate Aktion).
2. **Cloud-Daten:** Tenant-Schlüssel auf Server-Seite invalidieren (kommt mit Sprint 2).
3. **DSGVO-Meldung:** Innerhalb 72h an Berliner Datenschutzaufsicht (Art. 33 DSGVO) — Bao verantwortet, ich liefere technische Details.
4. **Mandanten-Information:** Wenn hohes Risiko, Mandanten direkt informieren (Art. 34 DSGVO).
5. **Audit-Log einfrieren:** Aktuelles Log wird kopiert, Original-Datei nicht überschrieben — als Beweissicherung.

### 3.5 Lösch-/Archivierungs-Konzept

- **Aktiver Mandant:** Daten bleiben so lange in der Akte wie das Mandat läuft.
- **Mandat abgeschlossen:** Standard-Aufbewahrungsfrist 6 Jahre (§ 50 BRAO). Daten werden archiviert (Cold Storage), nicht gelöscht.
- **Aufbewahrungsfrist abgelaufen:** Automatisches Lösch-Skript (kommt mit Sprint 4) — heute manuell via Notausgang pro Akte.
- **Mandanten-Widerruf der Einwilligung:** Daten werden binnen 30 Tagen gelöscht, soweit nicht gesetzliche Aufbewahrungspflicht entgegensteht.

---

## 4. Was wir nicht sind und nicht garantieren

**Nicht der Master-Speicher der Mandanten-Akte.** Das bleibt Advoware. GitLaw Pro ist der Workflow-/KI-Beschleuniger.

**Nicht 100 % unverwundbar.** Kein Software-Anbieter kann das garantieren. Was wir bieten:
- Open-Source-Quellcode (AGPL-3.0) — jederzeit von dir oder externem Auditor prüfbar
- Frankfurt-Hosting durchgängig
- Audit-Log lückenlos
- Architekturelle Mensch-im-Loop-Sicherung (kein Auto-Versand)

**Empfehlungen für maximale Sicherheit:**
- Externer DSGVO-Audit vor produktivem Pilot mit echten Daten (~€2-5k extern, ~3-5 Werktage)
- Externer Pen-Test vor Phase 4 (Mandanten-Portal) — wenn Bao das fordert, kalkuliere ich das mit ein
- Quartalsweise Quellcode-Diff-Review (1 Stunde, mit deinem IT-Berater)

---

## 5. Notfall-Kontakte

- **Mikel Ninh** (technischer Verantwortlicher, Auftragsverarbeiter): mikel_ninh@yahoo.de · Berlin
- **Bao Nguyen** (Auftraggeber, Datenschutz-Verantwortlicher): [Bao's Kontakt]
- **Berliner Beauftragte für Datenschutz**: mailbox@datenschutz-berlin.de · 030/13889-0
- **Vercel EU Data Privacy**: privacy@vercel.com
- **Upstash Compliance**: support@upstash.com

---

## 6. Unterzeichnung

Dieses Dokument wird Bestandteil des AVV. Beide Parteien bestätigen mit Unterschrift, dass sie die Maßnahmen verstanden haben und einhalten.

**Mikel Ninh** _________________________   Datum: __________

**Bao Nguyen** _________________________   Datum: __________
