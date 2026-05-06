# GDPR/DSGVO Readiness (GitLaw Pro)

Stand: 2026-04-30  
Scope: `viewer/` + `api/` (Vercel Pro endpoints, Cloud Sync, local Pro storage)

## 1) Kurzfazit

GitLaw Pro hat bereits starke Grundlagen (Anonymizer, Audit-Log, Datenexport, lokale Datenhaltung, AVV-Template), ist aber **noch nicht voll produktionsreif** fuer Kanzlei-Compliance in DE/EU ohne klare Betriebsprozesse.

Wichtigste offene Punkte vor breiter Nutzung mit echten Mandatsdaten:

1. Verbindliche DPA/AVV + Transferdokumentation fuer OpenAI/US (inkl. SCC/TIA).
2. Rollen- und Zugriffskontrolle fuer Cloud-Sync (kanzleiKey-only reicht nicht).
3. Loesch- und Aufbewahrungskonzept inkl. Fristen/Automatisierung.
4. TOM-Dokumentation + Incident/Breach-Prozess (Art. 32, 33, 34 DSGVO).
5. Verzeichnis von Verarbeitungstaetigkeiten + Rechtsgrundlagenmapping.

## 2) Bereits umgesetzt im Produkt

- DSGVO-Schutzmodus mit Auto-Anonymisierung vor KI-Anfragen (`viewer/src/pro/anonymize.ts`).
- Lokale Datenhaltung im Browser als Default (`viewer/src/pro/store.ts`).
- Export/Import kompletter Pro-Daten (`viewer/src/pro/sync.ts`).
- "Alles loeschen" Funktion fuer lokale Pro-Daten (`viewer/src/pro/ProSettings.tsx`).
- Audit-Log pro Aktion (`viewer/src/pro/store.ts`).
- AVV-Entwurf als PDF (`viewer/src/pro/ProSettings.tsx`, `viewer/src/pro/avv-pdf.ts`).

## 3) In diesem Update gehaertet

- API CORS von `*` auf Allowlist fuer bekannte Origins begrenzt.
- Security Header + `Cache-Control: no-store` auf API-Antworten.

Geaenderte Dateien:

- `api/_http.ts` (neu)
- `api/ask.ts`
- `api/ask-pro.ts`
- `api/sync/[key].ts`

## 4) Gap-Analyse (Prioritaet)

## P0 (vor produktiver Kanzlei-Nutzung)

1. **DPA/AVV + Drittlandtransfer**
- OpenAI-Calls sind aktuell US-bezogen moeglich.
- Erforderlich: AVV/DPA mit Anbieter, SCC (EU 2021/914), TIA, dokumentierte Zusatzmassnahmen.

2. **AuthN/AuthZ fuer Sync**
- Aktuell: `kanzleiKey` als einzige Zugriffskontrolle.
- Erforderlich: Benutzer-Login, Rollen, pro-Kanzlei Zugriffstoken, Key-Rotation.

3. **Data Retention & Deletion Policy**
- Server-Sync TTL existiert, aber kein kanzleiweites Loeschkonzept/Policy-Dokument.
- Erforderlich: konfigurierbare Aufbewahrungsfristen, Loeschnachweis, Mandatsabschluss-Loeschlauf.

4. **Breach Runbook (72h)**
- Erforderlich: Meldeprozess, Verantwortliche, Entscheidungsmatrix Art. 33/34, Vorlagen.

## P1 (kurz danach)

1. **Verzeichnis Verarbeitungstaetigkeiten (Art. 30)**
- Je Datenkategorie: Zweck, Rechtsgrundlage, Empfaenger, Frist, Schutzmassnahmen.

2. **DSFA/DPIA Trigger-Check**
- Pruefen, ob bei realem Betrieb eine DSFA noetig wird (sensible Sachverhalte, Skalierung, neue Profiling-Features).

3. **Mandantenrechte-Prozess**
- Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit (SLA + Ablauf).

4. **Auftragskontrolle & Logging**
- Admin-Audit fuer Sync/Admin-Aktionen zentralisieren und manipulationssicher archivieren.

## P2 (Enterprise-/Großkanzlei-Reife)

1. SSO + MFA.
2. Verschluesselung ruhender Sync-Daten mit tenant-spezifischem Schluessel.
3. ISO 27001 / BSI C5 orientierte Controls.
4. Externe Security-Pruefung (PenTest + Secure Code Review).

## 5) Was Bao und andere Anwaelt:innen sofort beeindruckt

1. **"Compliance Cockpit" in Pro Settings**
- Live-Status fuer: DSGVO-Modus, AVV hinterlegt, Sync aktiv, letzte Loeschung, letzte Export-Datei.

2. **1-Klick "Mandatsdaten anonymisieren + recherchieren"**
- Vorher/Nachher Diff mit erkannter PII + Freigabebutton.

3. **Recherchenachweis PDF**
- Jede KI-Antwort mit: Frage, Zeitstempel, zitierten Paragraphen, Verifikationsstatus, Bearbeiter.

4. **Fristen- und Loeschkalender**
- Mandat abgeschlossen -> vorgeschlagener Loeschzeitpunkt + dokumentierter Vollzug.

5. **Breach-Ready Paket**
- Notfallkarte (wer macht was in 72h), Kontaktliste, meldefertige Vorlage.

## 6) Konkreter 14-Tage Plan

1. Implementiere Login + Rollen fuer Sync (kein key-only Zugriff mehr).
2. Baue "Compliance Cockpit" UI inkl. Policy-Hinweisen in `ProSettings`.
3. Fuege strukturierte Retention-Regeln je Datentyp hinzu.
4. Erstelle VVT + TOM + Breach-Runbook als versionierte Dateien im Repo.
5. Dokumentiere OpenAI-Transfer (SCC/TIA) und EU-Alternative (Azure OpenAI EU).

## 7) Rechtliche Referenzen (Primarquellen)

- DSGVO (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- SCC Drittlandtransfer (EU) 2021/914: https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj
- BDSG (Deutschland): https://www.gesetze-im-internet.de/bdsg_2018/
- BRAO § 43a (Berufspflichten): https://www.gesetze-im-internet.de/brao/__43a.html

Hinweis: Dies ist eine technische Readiness-Einschaetzung, keine verbindliche Rechtsberatung.
