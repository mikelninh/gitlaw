# GitLaw Pro · Migrationsakte — kanonischer Tag-1-Workflow

**Source of Truth:** Diese Datei beschreibt den einen Arbeitsablauf für Mandant:in, Kanzlei-Assistenz/Mitarbeitende und Anwalt/Anwältin. E-Mail, WhatsApp, Brief und Scanner sind nur Eingangskanäle. **Die GitLaw-Akte ist die Ground Source of Truth.**

## Das Ziel in einem Satz

Jede beteiligte Person soll beim Öffnen der Akte sofort sehen:

> **Was fehlt? Was ist eingegangen? Was muss ich jetzt tun? Was ist geprüft?**

Keine Person muss AI, Prompts, RAG, OCR oder technische Architektur verstehen.

---

## 0 · Bevor ein Mandant einen echten Upload-Link bekommt

1. Mitarbeitende wählen die **konkrete Verfahrens-/Mandatsart** und zuständige Behörde.
2. GitLaw schlägt eine Dokumenten-Checkliste als **ENTWURF** vor.
3. Anwalt/Anwältin prüft den konkreten Fall, ergänzt/entfernt Dokumente und markiert bedingte Nachweise als erforderlich oder **NICHT ERFORDERLICH**.
4. Nur Anwalt/Owner klickt **CHECKLISTE FÜR DIESEN FALL FREIGEBEN**.
5. Die Freigabe ist an Checklisten-ID + Template-Version gebunden. Ändert sich die Vorlage, ist eine neue Freigabe erforderlich.
6. Erst danach darf der echte Mandantenlink aktiviert werden – und auch nur, wenn alle Real-Client-Gates aus `GO_LIVE_CHECKLIST.md` erfüllt sind.

**Warum:** Migrationsrechtliche Nachweise hängen von Aufenthaltstitel, Lebenssituation, Familienbezug, Einkommen, Behörde und aktuellem Verfahren ab. Eine statische Vorlage ist eine Arbeitshilfe, keine juristische Wahrheit.

---

# Die sieben Dokumentzustände

Jedes benötigte Dokument hat genau einen verständlichen Status:

| Sichtbar | Interner Zustand | Bedeutung | Nächste Aktion |
|---|---|---|---|
| **FEHLT** | `missing` | noch nichts vorhanden | Mandant:in um Upload bitten |
| **ANGEFRAGT** | `requested` | bereits nachgefordert | nicht doppelt nachfragen; warten |
| **EINGEGANGEN** | `received` | Datei ist da | in Prüfqueue |
| **ZU PRÜFEN** | `needs_review` | Datei wartet auf menschliches Review | Mitarbeitende prüfen |
| **BESTÄTIGT** | `approved` | verwendbare Unterlage explizit bestätigt | nichts tun |
| **NEU ANFORDERN** | `rejected` | unlesbar/falsch/unvollständig/veraltet | konkreten Grund an Mandant:in senden |
| **NICHT ERFORDERLICH** | `not_required` | im konkreten Fall bewusst nicht benötigt | Entscheidung + Grund auditieren |

**Wichtig:** Ein Upload – auch durch Mitarbeitende oder Anwalt – ist niemals automatisch **BESTÄTIGT**. Eingang und fachliches Review sind getrennte Ereignisse.

---

# Drei Oberflächen, drei Jobs

## A · Mandant:in

Die Mandantenansicht zeigt nur:

### 1. Was fehlt?
- **Bitte hochladen**
- **Bitte erneut hochladen** + verständlicher Grund

### 2. Was ist schon erledigt?
- **Eingegangen**
- **Wird geprüft**
- **Bestätigt**

### 3. Genau eine Hauptaktion
> **Unterlage hochladen**

Foto oder PDF reicht. Smart Upload/OCR darf eine Zuordnung **vorschlagen**, aber der Mandant bestätigt die Zuordnung. OCR entscheidet niemals über juristische Verwendbarkeit.

Wenn die fallbezogene Checkliste noch nicht anwaltlich freigegeben ist:

> **Ihre Unterlagenliste wird von der Kanzlei vorbereitet. Sie müssen gerade nichts tun.**

Kein unfreigegebener Dokumentenkatalog wird als verbindlich angezeigt.

---

## B · Kanzlei-Assistenz / Mitarbeitende

Die Teamansicht hat nur vier Arbeitskörbe:

### **NEU EINGEGANGEN**
Dokumente aus Mandantenportal, E-Mail, WhatsApp, Brief-Scan, Kanzlei-Scan.

### **ZU PRÜFEN**
Pro Dokument:
- **Bestätigen**
- **Neu anfordern** + Grund
- ggf. korrekt zuordnen

### **FEHLT — NACHFORDERN**
GitLaw zeigt ausschließlich wirklich fehlende/rejected Dokumente. Ein bereits eingegangener oder in Prüfung befindlicher Nachweis wird nicht erneut angefordert.

### **BEREIT FÜR ANWALT**
Nur wenn:
- fallbezogene Checkliste aktuell anwaltlich freigegeben ist;
- jedes erforderliche Dokument **BESTÄTIGT** oder **NICHT ERFORDERLICH** ist;
- kein Dokument mehr **ZU PRÜFEN** ist.

Mitarbeitende können **nicht** die Gesamtakte juristisch freigeben.

---

## C · Anwalt / Anwältin

Der Anwalt bekommt keine Upload-Inbox, sondern idealerweise nur Akten mit:

> **BEREIT FÜR ANWALT**

Er sieht auf einer Seite:
- die freigegebene fallbezogene Dokumentenliste;
- Status jedes Nachweises;
- Dokumente und Versionen;
- Herkunft: Portal / E-Mail / WhatsApp / Brief-Scan / Kanzlei;
- Upload-/Eingangszeitpunkt;
- wer das Dokument geprüft hat;
- Review-Kommentar;
- offene Fragen;
- relevante verifizierte Rechtsquellen, sofern GitLaw AI-Unterstützung genutzt wurde;
- Audit-Trail.

Finale Aktionen:

### **AKTE FREIGEBEN**
Nur Anwalt/Owner.

### **ZURÜCK ANS TEAM**
Mit konkretem fehlenden/falschen Punkt.

Die Gesamtfreigabe ist eine neue, explizite Handlung. Sie wird niemals aus „100 % Dokumente vorhanden“ automatisch abgeleitet.

---

# So kommen E-Mail, WhatsApp und Brief sauber hinein

## Tag 1: absichtlich simpel

Keine automatische Mailbox- oder WhatsApp-Integration erforderlich.

Mitarbeiter öffnet die Akte → **Unterlage hinzufügen** → Datei hineinziehen → Quelle wählen:

- E-Mail
- WhatsApp
- Brief / Scan
- Kanzlei-Scan
- Kanzlei-Upload
- Sonstiges

Dann Dokumentenart auswählen/bestätigen.

Das dauert Sekunden und verhindert, dass ein komplexer Connector vor dem echten Workflow-Proof zum Betriebsrisiko wird.

**Regel:** Nach dem Import ist der ursprüngliche Kanal nicht mehr die Wahrheit. Die kanonische GitLaw-Akte ist es.

## Später

E-Mail-/WhatsApp-Connectoren dürfen Dokumente in dieselbe Intake-Queue kopieren. Sie dürfen nie selbst:
- ein Dokument juristisch bestätigen;
- eine Akte vollständig erklären;
- eine Frist verbindlich setzen;
- einen Antrag versenden/einreichen.

---

# Provenance / Audit pro Dokument

Mindestens erfassen:

- stabile Dokument-ID
- Fall-ID / Tenant
- Checklisten-Item-ID
- Original-Dateiname
- MIME-Type / Größe
- kryptografischer Hash/Checksum
- `sourceChannel`
- Eingangs-/Uploadzeitpunkt
- hochgeladen/importiert von
- Reviewstatus
- geprüft von
- Prüfzeitpunkt
- Review-Kommentar / Ablehnungsgrund
- Ersetzungs-/Löschstatus

Änderungen werden als neue Ereignisse bzw. Versionen nachvollziehbar gemacht. Ein Dokument wird nicht stillschweigend „umgedeutet“.

---

# Die eine nächste Aktion

## Mandant
`WAIT` → nichts tun
`UPLOAD` → fehlende Unterlagen hochladen
`REUPLOAD` → abgelehnte Unterlage erneut hochladen
`IN_REVIEW` → nichts tun; Kanzlei prüft
`COMPLETE` → Unterlagen bestätigt

## Team
`CHECKLIST_FREIGEBEN` → Anwalt muss Liste freigeben
`DOKUMENTE_PRUEFEN` → Eingänge prüfen
`UNTERLAGEN_NACHFORDERN` → fehlende Unterlagen anfragen
`BEREIT_FUER_ANWALT` → an Anwalt übergeben
`ANWALT_FREIGEGEBEN` → Dokumentenphase abgeschlossen

Niemand soll aus zehn möglichen Buttons auswählen müssen.

---

# Kommunikation

## Nachforderung

Nicht:
> „Ihre Unterlagen sind unvollständig.“

Sondern:
> **Uns fehlt noch:** Reisepass – Seite mit Foto. Bitte hier hochladen: [sicherer Fall-Link]

## Ablehnung / neu anfordern

> **Bitte noch einmal hochladen:** Reisepass. Grund: Die untere Hälfte ist abgeschnitten. Bitte alle vier Ecken sichtbar fotografieren.

## Eingegangen

> **Danke. Die Unterlage ist angekommen und wird geprüft.**

## Bestätigt

> **Bestätigt. Sie müssen für dieses Dokument nichts mehr tun.**

---

# Abnahmeregel

Ein Fall darf nur `BEREIT FÜR ANWALT` sein, wenn alle erforderlichen Items **BESTÄTIGT** oder **NICHT ERFORDERLICH** sind.

Nur Anwalt/Owner darf **AKTE FREIGEBEN**.

AI darf:
- Dokumentart vorschlagen;
- OCR/Text extrahieren;
- fehlende Felder vorschlagen;
- mögliche Inkonsistenzen markieren;
- Entwürfe vorbereiten;
- verifizierbare Quellen vorschlagen.

AI darf nicht:
- juristische Vollständigkeit final bestätigen;
- ein Dokument eigenständig als verwendbar freigeben;
- finale Aktenfreigabe durchführen;
- externe Kommunikation oder Einreichung ohne menschliche Freigabe ausführen.

---

# Tag-1-Onboarding für die Kanzlei

**15 Minuten, kein Techniktraining.**

1. **3 Min:** „E-Mail/WhatsApp/Brief sind Eingang. GitLaw ist die Akte.“
2. **3 Min:** Team übt einen Dokumentimport.
3. **3 Min:** Team bestätigt ein Dokument und fordert eines neu an.
4. **3 Min:** Anwalt gibt eine fallbezogene Checkliste frei und anschließend eine synthetische vollständige Akte.
5. **3 Min:** Jeder zeigt selbst, wo seine nächste Aktion steht.

Bestehensregel: Niemand muss Begriffe wie AI, Prompt, RAG, API, JSON oder Vector Database erklären können.
