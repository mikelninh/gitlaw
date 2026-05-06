# GitLaw Agent Improvements

## Ziel

Diese Liste priorisiert nicht "mehr AI", sondern bessere Agenten entlang des echten Kanzlei-Flows:

`intake -> dokumente -> OCR/translation -> recherche -> entwurf -> freigabe`

---

## 1. Intake Agent

### Status heute

- strukturiert Eingaben sauber
- gut fuer klare Faelle
- noch konservativ bei chaotischen Inputs

### Naechste Verbesserungen

1. fehlende Pflichtinfos explizit markieren
2. automatische Intake-Zusammenfassung fuer Assistenz
3. bessere Frist-Erkennung aus Freitext

### Hebel

- weniger Rueckfragen
- schnellerer Uebergang von Eingang zu Akte

---

## 2. Document Agent

### Status heute

- sauberer Upload in Akte
- interner Dateiname
- Vault-ID, Provider, Checksumme

### Naechste Verbesserungen

1. staerkere Dokumentklassifikation aus Inhalt
2. Duplikat-Erkennung via Checksumme
3. automatische Dokument-Labels fuer Bescheid, Vertrag, Chat, Foto

### Hebel

- bessere Ordnung
- weniger manuelle Sortierung

---

## 3. OCR Agent

### Status heute

- stark fuer Textdatei, Bild, PDF mit Textlayer
- Hauptluecke bei echten Scan-PDFs

### Naechste Verbesserungen

1. echter Scan-PDF OCR-Worker
2. Seitenweise OCR + Fehlerhinweise
3. sichtbarer Qualitaetsindikator pro OCR-Ergebnis

### Hebel

- realer Dokumentalltag wird erst damit voll abgedeckt

---

## 4. Translation Agent

### Status heute

- nuetzlich fuer DE-Arbeitsfassungen
- Qualitaet haengt stark von OCR-Qualitaet ab

### Naechste Verbesserungen

1. bessere Markierung unsicherer Stellen
2. Satz-/Abschnittsweise Anzeige Quelle vs. DE-Fassung
3. klare Review-Tools fuer Anwalt/Assistenz

### Hebel

- hoeheres Vertrauen bei mehrsprachigen Mandaten

---

## 5. Research Agent

### Status heute

- strukturierte Antworten mit Zitaten
- gut bei klaren Fragen
- nicht gleich stark bei unscharfen oder engen Spezialfaellen

### Naechste Verbesserungen

1. klarere Antwortstruktur nach "Risiko / Ansatz / naechster Schritt"
2. staerkere Einbettung von Dokumentkontext
3. spaeter echte Kanzlei-/Praxisprofile je Rechtsgebiet

### Hebel

- weniger Nachdenken bis zum ersten brauchbaren Arbeitsstand

---

## 6. Citation Verification Layer

### Status heute

- Zitate sind strukturiert
- aber noch nicht stark genug als eigener harter Verifikationslayer

### Naechste Verbesserungen

1. serverseitige Paragraphen-Verifikation pro Zitat
2. sichtbarer Verifikationsstatus im UI
3. spaeter Quelle + Excerpt noch haerter absichern

### Hebel

- juristisches Vertrauen
- geringeres Halluzinationsrisiko

---

## 7. Drafting Agent

### Status heute

- starker Standardflow bei Vorlagen
- Dokumentkontext kann uebernommen werden
- noch nicht maximal "fast versandfertig"

### Naechste Verbesserungen

1. staerkere Uebernahme aus Recherche + Dokument in Felder
2. bessere Schlussformel- und Rechtsgrundlagen-Logik
3. Qualitaetscheck vor PDF / E-Mail

### Hebel

- direkter ROI
- genau hier spueren Kanzleien Zeitgewinn

---

## 8. Memory Agent

### Status heute

- approved memory existiert
- Wiederverwendung noch eher Basisfunktion als spuerbarer Kanzlei-Lernmotor

### Naechste Verbesserungen

1. staerkeres Matching fuer aehnliche Fragen
2. Memory nach Praxisbereich labeln
3. spaeter "war hilfreich / war stoerend" Rueckkanal

### Hebel

- echter Kanzlei-Moat
- bessere Antworten ueber Zeit

---

## 9. Workflow Recommendation Agent

### Status heute

- erster transparenter, regelbasierter Agent im Dashboard und in der Akte
- leitet aus Frist, Dokumentstatus, OCR, Uebersetzung, Recherche und Entwurf den naechsten Schritt ab

### Naechste Verbesserungen

1. Empfehlungen pro Rolle differenzieren
2. spaeter lernen, welche Empfehlungen in der Praxis angenommen werden
3. Empfehlungen mit Frist-/Dringlichkeitsgewicht noch feiner priorisieren

### Hebel

- weniger Leerlauf
- staerkeres Gefuehl von "das System fuehrt mich"

---

## 10. Trust / Persistence Layer

### Status heute

- Sessions, RBAC, tenant-bound sync, Vault und erste serverseitige Entities stehen
- noch nicht voll server-first

### Naechste Verbesserungen

1. serverseitige Hydration fuer Kernobjekte
2. localStorage langfristig von Primaerquelle zu Fallback degradieren
3. EU-Storage-Upgrade fuer Produktionsvertrauen

### Hebel

- Produktionsreife
- Multi-User-Faehigkeit

---

## Prioritaet der naechsten Sprints

1. Scan-PDF OCR Worker
2. Server-side Hydration fuer `cases`, `research`, `letters`
3. Citation Verification Layer haerter ziehen
4. Recommendation Agent verfeinern
5. Memory Agent vertiefen
