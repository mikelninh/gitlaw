# GitLaw ⚖️

**Alle 5.936 deutschen Bundesgesetze — durchsuchbar, AI-erklärbar, mit Musterbriefen.**

Zwei Welten unter einem Dach:

- **GitLaw** — kostenlos für alle Bürger:innen. Open Source. Donations-finanziert.
  → [gitlaw.app](https://mikelninh.github.io/gitlaw/) bzw. [gitlaw-xi.vercel.app](https://gitlaw-xi.vercel.app/)
- **GitLaw Pro** — Anwält:innen-Tier mit Branding, Akten, KI-Recherche-Verifikation, Fristen, Cloud-Sync.
  → [gitlaw-xi.vercel.app/#/pro/preise](https://gitlaw-xi.vercel.app/#/pro/preise) · ab €19/Mo Lite · €79 Solo · €149/RA Kanzlei

1,3 Mio. Zeilen Recht. 98.367 semantische Vektoren. 31 Musterbriefe (20 Bürger + 11 Anwält:innen). 6 Sprachen.

---

## 🆓 GitLaw — Bürger:innen-Version

### Features
- 🔍 **Alle Gesetze durchsuchen** — Fuzzy + semantisch (FAISS, 98K Vektoren)
- 💡 **AI-Erklärungen** — 112 Paragraphen in einfacher Sprache
- 💬 **Chat mit Folgefragen** — personalisiert für 12 Profile, 6 Sprachen
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
| **Daily Companion** | Dashboard mit Fristen-Übersicht, Mandant:innen-Eingängen, „Diese Woche gespart"-Widget |
| **Recherche mit Belegen** | KI-Antwort + jedes zitierte § wird gegen unsere 5.936 Gesetze verifiziert. Klick → Drawer mit Volltext + persönliche Notiz-Funktion |
| **Mandant:innen-Akten** | CRUD mit Frist-Tracker (Calc aus Bescheid-Datum), Mandant:in-E-Mail, Status, Such- & Filter-Tabs |
| **31 Schreiben-Templates** | 5 allgemeine + 12 Notariats + Custom Templates mit `{{platzhalter}}`-Syntax |
| **Branded PDF-Export** | Logo + Kanzlei-Anschrift + Disclaimer-Footer auf jedem Dokument |
| **Mandant:innen-Intake** | QR-Code für Erstanfragen-Formular, Antwort landet in Akte |
| **Audit-Log** | Lückenlose Aktions-Chronologie, BHV-tauglich als PDF exportierbar |
| **DSGVO-Anonymisierer** | Ein-Klick PII-Replacement (Namen, Adressen, IBAN) vor KI-Anfragen |
| **Cloud-Sync** | Auto-Push an Upstash-Redis (Frankfurt). Werner+Jasmin teilen Akten via Kanzlei-Schlüssel |
| **AVV-Vorlagen-PDF** | Mustertext-Generator auf eigenem Briefkopf |

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
| Anwalts-Musterbriefe (Pro) | **17** (5 Allgemein + 12 Notariat) |
| Sprachen | **6** (DE, Leicht, TR, AR, EN, UK) |
| Aktualisierung | **Wöchentlich automatisch** |

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
| PDF | jsPDF (Branded Templates + AVV) |
| QR | qrcode.react |
| ZIP | jszip (Akten-Bundle) |
| Updates | GitHub Actions (wöchentlich aus gesetze-im-internet.de) |
| Hosting | GitHub Pages (Bürger) + Vercel (Pro + APIs) |

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

## 📜 Lizenz / Open-Core-Modell

- **Bürger:innen-Viewer + Gesetzes-Korpus** — MIT-Lizenz, Open Source für immer.
- **Pro-Tier-Code** — im Repo einsehbar, kommerzielle Nutzung benötigt Lizenz.
  Plan: nach 4 Jahren MIT (Business Source License → Open Source).

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
- [x] **Daily-Companion-Design** mit personalisiertem Greeting + Wochenstatistik
- [ ] **BGH-Urteils-Integrator** (openjur.de)
- [ ] **DATEV-Stammdaten-Sync**
- [ ] **Mobile App** (iOS für Termin)
- [ ] **Mehrere Pro-Domain-Packs** (Steuer, Familie, Sozialrecht)

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

**Beta-Anfrage GitLaw Pro:** [pro@gitlaw.app](mailto:pro@gitlaw.app)

> *„Demokratie sollte Open Source sein."*
