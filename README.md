# GitLaw ⚖️

**Alle 5.936 deutschen Bundesgesetze — durchsuchbar, AI-erklärbar auf Deutsch, mit Musterbriefen.**

Zwei Welten unter einem Dach:

- **GitLaw** — kostenlos für alle Bürger:innen. Open Source (AGPL-3.0). Donations-finanziert.
  → [gitlaw.app](https://mikelninh.github.io/gitlaw/) bzw. [gitlaw-xi.vercel.app](https://gitlaw-xi.vercel.app/)
- **GitLaw Pro** — Anwält:innen-Tier mit Branding, Akten, KI-Recherche-Verifikation, Fristen, Cloud-Sync, mehrsprachige Mandantenaufnahme (DE/VI/TR/AR/EN).
  → [gitlaw-xi.vercel.app/#/pro/preise](https://gitlaw-xi.vercel.app/#/pro/preise) · ab €19/Mo Lite · €79 Solo · €149/RA Kanzlei

1,3 Mio. Zeilen Recht · 98.367 semantische Vektoren · 31 Musterbriefe (20 Bürger + 11 Anwält:innen) · UI + Core-Workflows auf Deutsch · Pro-Intake-Form in 5 Sprachen (DE/VI/TR/AR/EN) für Kanzleien mit mehrsprachiger Klientel.

---

## 🆓 GitLaw — Bürger:innen-Version

### Features
- 🔍 **Alle Gesetze durchsuchen** — Fuzzy + semantisch (FAISS, 98K Vektoren)
- 💡 **AI-Erklärungen** — 112 Paragraphen in einfacher Sprache
- 💬 **Chat mit Folgefragen** — personalisiert für 12 Profile · antwortet auf Deutsch (Runtime-Sprachwahl über OpenAI möglich, nicht statisch übersetzt)
- 📝 **20 Musterbriefe** — Widerruf, Reklamation, Kündigung, DSGVO …
- 📰 **Gesetz des Tages** + 🏠 **Themen-Buttons**
- ♿ **A-/A+** Schriftgröße · 🌙 Darkmode · Themen-Buttons statt Tippen

### Top Musterbriefe (Suchvolumen / Monat)

| Brief | Suchen/Mo |
|-------|----------|
| 🛒 Widerruf Online-Kauf | 40K |
| 🔧 Reklamation | 25K |
| 🏠 Kündigung Mietvertrag | 22K |
| 🚗 Einspruch Bußgeld | 20K |
| 💧 Widerspruch Nebenkosten | 18K |
| + 15 weitere | 150K+ |

---

## 💼 GitLaw Pro — für Anwält:innen

Eigenständiger Bereich unter `/#/pro` — Beta, Invite-only.

### Was es macht

| Bereich | Funktion |
|---|---|
| **Daily Companion** | Dashboard mit Fristen-Übersicht, Mandant:innen-Eingängen, „Diese Woche gespart"-Widget, persönlicher Begrüßung |
| **Recherche mit 3-Stufen-Belegen** | KI-Antwort mit verifizierten Zitaten + (1) kuratierte BGH/BVerfG-Leitsätze + (2) Live-Lookup OpenLegalData (1.000+ Treffer/§) + (3) Deep-Links Beck/dejure/openjur |
| **Mandant:innen-Akten** | CRUD mit Frist-Tracker (Calc aus Bescheid-Datum, §§ 187/188 BGB-konform), Mandant:in-E-Mail, Status, Such- & Filter-Tabs |
| **59 Schreiben-Templates** | 5 allgemein + 12 Notariat + 12 Migration + 10 Familien + 10 Sozial + 10 Steuer + Custom mit `{{placeholder}}` |
| **Branded PDF-Export** | Logo + Kanzlei-Anschrift + Disclaimer-Footer auf jedem Dokument |
| **Mandant:innen-Intake** | QR-Code für Erstanfragen-Formular in 5 Sprachen (DE/VI/TR/AR/EN, RTL für Arabisch), Antwort landet in Akte |
| **CSV-Akten-Import** | Auto-Spalten-Erkennung aus DATEV / RA-Micro / advoware / Excel — Mapping → Bulk-Create |
| **Audit-Log** | Lückenlose Aktions-Chronologie, BHV-tauglich als PDF exportierbar |
| **DSGVO-Schutz-Modus** | Auto-Anonymisierung vor jeder KI-Anfrage: 14 PII-Pattern (Namen, Adressen, IBAN, BIC, Steuer-ID, SV-Nr., Aktenzeichen, Geb-Datum, Firmen) + Whitelist gegen Falsch-Anonymisierung von Rechtsbegriffen |
| **Cloud-Sync** | Auto-Push an Upstash-Redis Frankfurt. Werner+Jasmin teilen Akten via Kanzlei-Schlüssel. Sync-Indikator im Header |
| **Personal Welcome-Pages** | `/#/bao`, `/#/rubin`, `/#/werner`, `/#/jasmin` — 1-Klick-Login + Branding pre-loaded |
| **AVV-Vorlagen-PDF** | Mustertext-Generator auf eigenem Briefkopf |
| **Wöchentliches Auto-Update** | GitHub-Action prüft jeden Sonntag mit OpenAI Structured Outputs ob neue BGH-Urteile zu den Top-30 § → öffnet PR mit Diff |

### Preise

| Tier | Preis | Wofür |
|---|---|---|
| **Solo Lite** | €19/Mo | Reinschnuppern, 5 Akten + 10 Recherchen/Mo |
| **Solo** ⭐ | €79/Mo | Standard-Solo-Anwält:in, alles unbegrenzt |
| **Kanzlei** | €149/RA/Mo | Server-Sync, Rollen, ab 2 Anwält:innen |
| **Notariat-Add-on** | +€50/Mo | 12 Notar-Templates (Vollmacht, Erbschein, Pflichtteil etc.) |

**60-Tage-Geld-zurück-Garantie:** wenn nicht ≥ €1.000 Zeit gespart, volle Rückerstattung.

→ Details + Vergleich vs. RA-Micro/DATEV/Beck: [gitlaw-xi.vercel.app/#/pro/preise](https://gitlaw-xi.vercel.app/#/pro/preise)

---

## 📊 Zahlen

| Metrik | Stand |
|--------|-------|
| Gesetze | **5.936** |
| Zeilen | **1.303.451** |
| FAISS-Vektoren | **98.367** |
| Bürger-Musterbriefe | **20** (16 frei, 4 Premium) |
| Anwalts-Musterbriefe (Pro) | **59** (5 Allgemein + 12 Notariat + 12 Migration + 10 Familie + 10 Sozial + 10 Steuer) |
| Verifizierte BGH/BVerfG-Leitsätze | **40** zu Top-30 Paragraphen (BGB · StGB · AufenthG · SGB · StPO · GewSchG) |
| Live-Rechtsprechungs-Index | **150 K+ Urteile** über OpenLegalData-Proxy |
| Sprachen | **5 Pro-Intake** (DE/VI/TR/AR/EN) + **6 Bürger** (DE/Leicht/TR/AR/EN/UK) |
| Aktualisierung | **Wöchentlich automatisch** (Gesetze + Leitsätze) |

---

## 🛠 Tech-Stack

| Layer | Stack |
|-------|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind 4 |
| Routing | HashRouter (GH-Pages-kompatibel) + react-router-dom 7 |
| Bürger-RAG | LangChain + FAISS + OpenAI Embeddings |
| Pro-AI | OpenAI gpt-4o-mini mit JSON-Schema Structured Outputs |
| Pro-Backend | Vercel Serverless Functions + Upstash Redis (Frankfurt) |
| Citations-Verifikation | Lokal gegen 5.936 Markdown-Files (`### § N`-Heading-Lookup) |
| Rechtsprechung Stufe 1 | Deep-Links zu Beck-Online / dejure.org / openjur.de |
| Rechtsprechung Stufe 2 | 30 kuratierte JSON-Files mit BGH/BVerfG-Leitsätzen aus rechtsprechung-im-internet.de (Public Domain), wöchentlich automatisch aktualisiert via GitHub-Action |
| Rechtsprechung Stufe 3 | OpenLegalData-Proxy mit Upstash-Cache (60d TTL) — 150 K+ Urteile durchsuchbar |
| PDF | jsPDF (Branded Templates + AVV-Generator) |
| QR | qrcode.react (mit Vollbild-Modus für Termin) |
| ZIP | jszip (Akten-Bundle: PDFs + Audit + meta.txt) |
| CSV-Import | RFC 4180-Parser, UTF-8/Win-1252-Tolerant, Auto-Mapping für DATEV/RA-Micro/advoware |
| Anonymizer | 14 Regex-Pattern + 50 Whitelist-Tokens, Auto-Modus persistiert in localStorage |
| Updates | GitHub Actions (Gesetze + BGH-Leitsätze) |
| Hosting | GitHub Pages (Bürger) + Vercel + Upstash Frankfurt (Pro + APIs) |

---

## 🚀 Lokal starten

```bash
# Bürger:innen-Viewer
cd viewer && npm install && npm run dev

# Optional: lokale RAG-API
pip install langchain langchain-openai faiss-cpu
python rag/build_vectorstore.py
python -m uvicorn rag.server:app --port 8001
```

Pro-Tier lokal: `http://localhost:5173/#/pro?invite=DEMO`

---

## 📜 Lizenz

**AGPL-3.0** für das gesamte Repository (Bürger-Viewer, Pro-Tier-Code, Gesetzes-Korpus, RAG-Stack).

Warum AGPL: anders als MIT oder Apache verpflichtet AGPL jeden, der die Software als Netzwerk-Service anbietet (auch Forks, auch SaaS-Rebrands), seine Änderungen ebenfalls Open Source zu stellen. Für ein Legal-Tech-Tool heißt das: wenn jemand das hier nimmt und als geschlossenes kommerzielles Produkt verkauft, verletzt er die Lizenz. Das schützt die Offenheit langfristig.

Wer eine kommerzielle Lizenz ohne AGPL-Copyleft-Pflichten will: [mikel_ninh@yahoo.de](mailto:mikel_ninh@yahoo.de) schreiben.

Anwält:innen sehen unseren Code → Vertrauen. Falls die Firma stirbt → Code lebt weiter.

---

## 🗺 Roadmap

- [x] 5.936 Gesetze + 98K Vektoren + Semantische Suche
- [x] AI-Erklärungen + Chat + 12 Personas + 6 Sprachen
- [x] 20 Musterbriefe + Premium-Paywall
- [x] PDF + Share + Favoriten + Paragraph-Links
- [x] Gesetz des Tages + Reform-Diffs
- [x] Auto-Updates + RAG API
- [x] **GitLaw Pro Beta** — Akten, Recherche-Verifikation, branded Templates, Frist-Calc, Cloud-Sync, AVV
- [x] **Notariat-Pack** (12 Templates: Vollmacht, Erbschein, Pflichtteil, Patientenverfügung …)
- [x] **Migration-Pack** (12 Templates: Aufenthaltstitel, Familiennachzug, Einbürgerung …) + Vietnamese Intake
- [x] **Familienrecht-Pack** (10 Templates: Scheidung, Sorge, Unterhalt, Gewaltschutz …)
- [x] **Sozialrecht-Pack** (10 Templates: SGB-II/V/VI/IX-Widersprüche, SG-Klagen, BerHG)
- [x] **Steuerrecht-Pack** (10 Templates: Einspruch, AdV, Selbstanzeige § 371 AO, FG-Klage)
- [x] **Daily-Companion-Design** mit personalisiertem Greeting + Wochenstatistik
- [x] **3-Stufen-Rechtsprechung** (Deep-Links + 40 kuratierte BGH-Leitsätze + OpenLegalData-Live)
- [x] **Wöchentliches Auto-Update** der Leitsätze via GitHub-Action + OpenAI Structured Outputs
- [x] **CSV-Akten-Import** aus DATEV / RA-Micro / advoware / Excel
- [x] **DSGVO-Schutz-Modus** mit Auto-Anonymisierung (14 PII-Pattern + Whitelist)
- [x] **Personal Welcome-Pages** für Beta-Tester (`/#/bao`, `/#/rubin`, `/#/werner`, `/#/jasmin`)
- [ ] **Mobile App** (iOS/Android — vorerst PWA via Browser tauglich)
- [ ] **Echtes RBAC** (Partner:in vs. Associate-Rechte)
- [ ] **Azure OpenAI EU-Region** (für Großkanzlei-AVV-Anforderungen)
- [ ] **Beck-Online SSO-Bridge** (proprietary, prüfen)

---

## 🌐 Ökosystem — Digitale Demokratie

Dieses Projekt ist Teil eines Open-Source-Ökosystems für digitale Demokratie:

| Projekt | Frage | Link |
|---------|-------|------|
| **FairEint** | Was sollte Deutschland anders machen? | [GitHub](https://github.com/mikelninh/faireint) · [Live](https://mikelninh.github.io/faireint/) |
| **GitLaw** | Was steht im Gesetz? | [GitHub](https://github.com/mikelninh/gitlaw) · [Live](https://gitlaw-xi.vercel.app/) |
| **Public Money Mirror** | Wohin fließt das Steuergeld? | [GitHub](https://github.com/mikelninh/Public-Money-Mirror) |
| **SafeVoice** | Wer wird online angegriffen? | [GitHub](https://github.com/mikelninh/safevoice) |

Alle Projekte: [github.com/mikelninh](https://github.com/mikelninh) · Unterstützen: [Ko-fi](https://ko-fi.com/mikel777) · [GitHub Sponsors](https://github.com/sponsors/mikelninh)

---

**Beta-Anfrage GitLaw Pro:** [mikel_ninh@yahoo.de](mailto:mikel_ninh@yahoo.de)

> *„Demokratie sollte Open Source sein."*
