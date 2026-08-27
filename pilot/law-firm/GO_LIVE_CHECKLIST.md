# GitLaw Pro · Migrationsakte — GO LIVE

## Zwei klar getrennte Modi

### 1. DEMO / Workflow-Test

**Darf sofort genutzt und geteilt werden**, wenn ausschließlich synthetische Testdaten verwendet werden.

- keine echten Namen
- keine echten Pässe / Aufenthaltstitel
- keine echten E-Mails, Telefonnummern oder Adressen
- keine echten Aktenzeichen
- keine Gesundheits-/Religions-/Herkunfts-/Strafverfahrensdaten
- keine echten Dokumentdateien

Die öffentlichen Demo-Seiten speichern oder übertragen keine ausgewählten Dateien.

### 2. Real-Client-Mode

**Standardmäßig technisch AUS.**

`GITLAW_REAL_CLIENT_UPLOADS_ENABLED` darf erst `true` werden, nachdem die nachfolgenden Punkte für die konkrete Kanzlei und die konkreten Provider dokumentiert freigegeben sind.

---

# A · Berufsrecht / Verschwiegenheit

Vor Freischaltung anwaltlich dokumentieren:

- [ ] § 43a BRAO / Verschwiegenheit berücksichtigt
- [ ] § 43e BRAO für eingesetzte Dienstleister geprüft
- [ ] Dienstleister sorgfältig ausgewählt
- [ ] erforderliche Verschwiegenheits-/Vertragsverpflichtungen in Textform geschlossen
- [ ] Zugriff der Dienstleister auf das Erforderliche begrenzt
- [ ] § 203 StGB / mitwirkende Personen und Geheimnisschutz berücksichtigt
- [ ] geprüft, ob § 43e Abs. 5 BRAO für eine unmittelbar mandatsbezogene Dienstleistung eine Mandanteneinwilligung erfordert
- [ ] falls erforderlich: Einwilligungsprozess dokumentiert und nachweisbar

**Software beantwortet diese Rechtsfragen nicht selbst.** Sie blockiert den Produktivstart, bis die Kanzlei sie freigegeben hat.

---

# B · DSGVO / Datenschutz

- [ ] Verantwortlicher / Auftragsverarbeiter / ggf. weitere Rollen pro Provider dokumentiert
- [ ] Rechtsgrundlagen pro Verarbeitungstätigkeit dokumentiert
- [ ] Art. 28 DSGVO: erforderlicher AVV / DPA abgeschlossen
- [ ] Unterauftragsverarbeiter/Subprocessor geprüft und dokumentiert
- [ ] Datenflüsse und Speicherorte dokumentiert
- [ ] EU-/EWR-Verarbeitung bevorzugt und konkrete Region technisch verifiziert
- [ ] falls Drittlandtransfer: Transfermechanismus + Risikoentscheidung dokumentiert
- [ ] Lösch-/Aufbewahrungskonzept pro Datenkategorie freigegeben
- [ ] Informationspflichten gegenüber Mandant:innen aktualisiert
- [ ] Betroffenenrechte-Prozess vorhanden
- [ ] Zugriffskontrollen und regelmäßige Rechteprüfung vorhanden

## Art. 9 und Art. 10

Migrationsakten können besonders sensible Inhalte enthalten.

- [ ] Art. 9 DSGVO: besondere Kategorien personenbezogener Daten berücksichtigt (z. B. Gesundheitsdaten, Religion, ethnische Herkunft)
- [ ] Art. 10 DSGVO: Daten zu strafrechtlichen Verurteilungen/Straftaten gesondert berücksichtigt
- [ ] AI/OCR/Indexierung solcher Daten ist in der konkreten Datenschutzbewertung ausdrücklich erfasst

---

# C · Storage — echter Produktionsstandard

**Der bestehende `upstash-beta-vault` mit base64 und 30-Tage-TTL ist kein freigegebener Langzeitstandard für echte Migrationsakten.**

Vor Real-Client-Mode:

- [ ] dedizierter verschlüsselter Object Storage statt Redis-Blob-Vault
- [ ] konkrete **EU**-Region festgelegt und technisch kontrolliert
- [ ] TLS in transit
- [ ] Verschlüsselung at rest
- [ ] idealerweise mandanten-/kanzleibezogene Schlüsselstrategie dokumentiert
- [ ] serverseitige Objekt-IDs statt frei erratbarer URLs
- [ ] kein öffentliches Bucket
- [ ] zeitlich begrenzte/signed Download-URLs oder serverseitiger Auth-Proxy
- [ ] Malware-/Dateitypprüfung vor Nutzung
- [ ] Größenlimits
- [ ] Backups und Restore getestet
- [ ] Löschung umfasst Primärspeicher, abgeleitete Kopien/Thumbnails/OCR-Artefakte und definierte Backup-Lifecycle-Regeln
- [ ] Storage-Zugriff wird auditiert

**Wichtig:** Die 7-Tage-Retention des historischen AI-Replay-Piloten ist nicht die Aufbewahrungsfrist einer echten Kanzleiakte. Für echte Mandatsdokumente gilt ein separat anwaltlich/datenschutzrechtlich freizugebendes Aufbewahrungs- und Löschkonzept.

---

# D · Auth / Berechtigungen

Die bestehende Beta-Invite-Logik ist für Demo/Pilotkomfort geeignet, aber nicht der gewünschte Endzustand für echte hochsensible Mandatsdaten.

Vor Produktivstart:

- [ ] echte Kanzlei-Accounts statt gemeinsamer Zugangsdaten
- [ ] Client erhält ausschließlich Zugriff auf eigene Akte
- [ ] Mitarbeitende sehen nur Tenant + erforderliche/zugewiesene Akten
- [ ] Anwalt/Owner kann Checklisten und Gesamtakten final freigeben
- [ ] Assistenz kann Dokumente prüfen/nachfordern, aber keine Gesamtakte final freigeben
- [ ] MFA für Kanzleirollen
- [ ] kurzlebige bzw. widerrufbare Mandantenlinks
- [ ] Token niemals in Logs/Analytics/Referer ausleiten
- [ ] Session-/Token-Rotation
- [ ] Rate Limits / Brute-Force-Schutz
- [ ] Offboarding entfernt Rechte unverzüglich
- [ ] vierteljährliche Access Review oder geeigneter kürzerer Rhythmus

---

# E · Dokument-Ground-Truth

- [ ] exakte Verfahrensart + Behörde ausgewählt
- [ ] Template ist sichtbar als ENTWURF gekennzeichnet
- [ ] aktuelle behördliche/gesetzliche Quellen für die Vorlage dokumentiert
- [ ] Anwalt prüft die konkrete fallbezogene Liste
- [ ] Anwalt gibt Checkliste für diesen Fall frei
- [ ] Freigabe ist an Checklisten-ID + Template-Version/Hash gebunden
- [ ] Änderung invalidiert alte Freigabe
- [ ] kein Upload gilt durch seinen Kanal automatisch als fachlich geprüft
- [ ] Dokumentquelle wird gespeichert: Portal / E-Mail / WhatsApp / Brief-Scan / Kanzlei
- [ ] jedes Review speichert Prüfer:in, Zeitpunkt und ggf. Grund
- [ ] nur Anwalt/Owner kann **AKTE FREIGEBEN**

---

# F · AI / OCR

- [ ] OCR/Klassifikation ist Vorschlag, keine juristische Freigabe
- [ ] Prompt-/Model-Provider und Datenverwendung dokumentiert
- [ ] Business/API-Trainingseinstellungen geprüft
- [ ] Retention-/Logging-Konfiguration des Providers geprüft
- [ ] sensible Datenkategorien in der Risikoanalyse enthalten
- [ ] Outputs sind für Team/Anwalt überprüfbar
- [ ] Quellen werden vor anwaltlicher Nutzung deterministisch oder menschlich geprüft
- [ ] keine autonomen externen Aktionen
- [ ] keine automatische Mandatsannahme
- [ ] keine automatische finale Fristentscheidung
- [ ] keine automatische Einreichung/Versendung

---

# G · Incident / Betrieb

- [ ] Ansprechpartner für Datenschutz/Security benannt
- [ ] Incident-Runbook vorhanden
- [ ] Datenpanne: Erkennen → Eindämmen → Bewerten → ggf. Melden/Informieren dokumentiert
- [ ] Restore-Test durchgeführt
- [ ] Monitoring ohne Dokumentinhalte/Secrets in Logs
- [ ] Provider-Ausfall führt fail-closed bzw. zu klarer manueller Fallback-Arbeit
- [ ] Export der vollständigen Akte möglich
- [ ] Exit-/Portabilitätsplan vorhanden

---

# H · Tag-1-Abnahme

Vor dem ersten echten Mandanten einmal mit **synthetischen Daten** vollständig proben:

1. [ ] Team legt Fall an
2. [ ] Anwalt gibt fallbezogene Checkliste frei
3. [ ] Demo-Mandant lädt/markiert Dokumente
4. [ ] E-Mail-Dokument wird manuell in dieselbe Akte übernommen
5. [ ] WhatsApp-Dokument wird manuell in dieselbe Akte übernommen
6. [ ] Briefscan wird übernommen
7. [ ] Team bestätigt ein Dokument
8. [ ] Team lehnt ein unlesbares Dokument mit Grund ab
9. [ ] Nachforderung enthält nur wirklich Fehlendes
10. [ ] vollständige Akte wird **BEREIT FÜR ANWALT**
11. [ ] Assistenz kann Gesamtfreigabe nicht ausführen
12. [ ] Anwalt klickt **AKTE FREIGEBEN**
13. [ ] Audit zeigt Quellen und alle Reviewereignisse
14. [ ] Rechte-/Token-Fehler getestet
15. [ ] Export + Lösch-/Retentionprozess getestet

## Go/No-Go

### DEMO GO
Wenn die synthetischen Demo-Tests/CI grün sind.

### REAL CLIENT GO
Nur wenn **alle für das konkrete Setup relevanten Punkte oben dokumentiert freigegeben sind** und `GITLAW_REAL_CLIENT_UPLOADS_ENABLED=true` bewusst durch Admin gesetzt wird.

Fehlt etwas:

> **STOPP — keine echten Mandantendaten hochladen.**
