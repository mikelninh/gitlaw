# GitLaw ⚖️

**Alle 5.936 deutschen Bundesgesetze — durchsuchbar, AI-erklärbar, personalisiert.**

1,3 Millionen Zeilen Recht. 112 Paragraphen in einfacher Sprache erklärt. 72 personalisierte FAQ-Fragen. Wöchentlich automatisch aktualisiert. Open Source.

> "Sunlight is the best disinfectant." — Louis Brandeis

**[Live Viewer →](https://mikelninh.github.io/gitlaw/)**

---

## Was kann GitLaw?

### 1. Gesetze durchsuchen
Fuzzy-Suche über 5.936 Bundesgesetze. Vom Grundgesetz bis zum Tierschutzgesetz. Klick drauf, lies es, versteh es.

### 2. AI-Erklärungen ("Einfach erklären")
112 Paragraphen in 18 Schlüsselgesetzen sind vorab erklärt — in einfacher Sprache, für einen 16-Jährigen verständlich. Generiert von Claude Opus 4.6. Kostenlos, kein API Key nötig.

### 3. Personalisierter Rechts-Assistent (RAG)
**"Wer bist du?"** → Wähle dein Profil → stelle eine Frage → bekomme eine Antwort die auf DEINE Situation zugeschnitten ist. Basierend auf echten Gesetzestexten, nicht auf Halluzinationen.

12 Profile:

| | | | |
|---|---|---|---|
| 📚 Student/in | 👷 Arbeitnehmer/in | 💼 Selbstständig | 👨‍👩‍👧 Elternteil |
| 👩‍👧 Alleinerziehend | 👵 Rentner/in | 🏠 Mieter/in | 🏘️ Vermieter/in |
| 🔧 Azubi | 🌍 Migrant/in | 🤰 Schwanger | 📋 Arbeitslos |

Jedes Profil hat 6 häufig gestellte Fragen — 72 FAQs insgesamt. Ein Klick = personalisierte Antwort.

### 4. Reform-Diffs
Was ändert sich im Gesetzestext wenn eine Reform umgesetzt wird? Vorher/Nachher Seite an Seite:
- **Rentenreform** → §36 SGB VI: Beitragsjahre statt starres Alter
- **Steuerreform** → §32a EStG: Splitting-Deckelung + Kinderbonus
- **Tierschutz** → Art. 20a GG: "schützt" → "achtet die Würde"
- **Gesellschaftsdienst** → Art. 12a GG: alle Geschlechter + Zivildienst

### 5. Automatische Aktualisierung
Jeden Montag 6:00 UTC parst ein GitHub Action alle Gesetze neu. Änderungen werden als Git-Diff sichtbar. Das IST GitLaw.

---

## Warum nicht einfach ChatGPT fragen?

| | ChatGPT | GitLaw |
|---|---|---|
| Quellen | Keine — du musst vertrauen | Echte Paragraphen, anklickbar |
| Halluzinationen | Erfindet Paragraphen | Unmöglich — nur echte Texte |
| Aktualität | Training-Cutoff | Wöchentlich aktualisiert |
| Personalisierung | Gleiche Antwort für alle | 12 Profile, andere Antwort je nach Situation |
| Reform-Kontext | Keiner | Zeigt was sich ändern WÜRDE |

**Generisches Recht ist nutzloses Recht. Personalisiertes Recht rettet Leben.**

---

## Zahlen

| Metrik | Stand |
|--------|-------|
| Gesetze | **5.936** |
| Paragraphen | **107.715** |
| Zeilen | **1.303.451** |
| AI-Erklärungen | **112** (in 18 Gesetzen) |
| Personalisierte FAQs | **72** (6 pro Profil) |
| Aktualisierung | **Wöchentlich automatisch** |
| Kosten für Nutzer | **€0** |
| FAISS Vektoren | **98.367** (alle Paragraphen embedded) |
| RAG-Suche | **Semantisch** (LangChain + OpenAI Embeddings) |

## Neue Features (April 2026)

- **FAISS Vector Store** — 98.367 Vektoren über ALLE Gesetze. Semantische Suche statt Keyword-Matching.
- **Chat mit Folgefragen** — Echte Konversation, nicht nur einzelne Fragen.
- **PDF-Export** — Jedes Gesetz als PDF herunterladen.
- **Mandanten-Sharing** — Link zu Paragraph + Notiz generieren, an Mandanten schicken.
- **Paragraph-Verlinkung** — `§ 573 BGB` im Text ist ein klickbarer Link zum BGB.
- **Gesetz des Tages** — 20 kuratierte spannende/verrückte/überholte Gesetze, täglich wechselnd.
- **Supabase-Integration** (vorbereitet) — Auth, Notizen, Chat-History, DSGVO-konform.
- **RAG API Server** — FastAPI-Endpoint für den Vector Store.

## Erklärte Gesetze (Tier 1 + 2)

GG (19), StGB (11), BGB (19), SGB V (6), SGB VI (7), SGB II (8), EStG (7), TierSchG (5), NetzDG (3), AufenthG (3), AO (4), ArbZG (4), KSchG (3), MuSchG (3), BEEG (4), AGG (3), GEG (2), StPO (4)

---

## Lokal starten

```bash
# Viewer
cd viewer
npm install
echo "VITE_OPENAI_API_KEY=sk-dein-key" > .env  # Für RAG-Fragen
npm run dev    # http://localhost:5175/gitlaw/

# Parser (Gesetze neu parsen)
pip install requests lxml
python parser/fetch_index.py     # Index holen
python parser/fetch_fast.py      # Alle parsen (~10 Min)
python parser/build_index.py     # Viewer-Index bauen
```

## Tech

| Komponente | Stack |
|-----------|-------|
| Parser | Python + lxml + requests |
| Viewer | React + TypeScript + Vite + Tailwind + Fuse.js |
| RAG | **LangChain + FAISS + OpenAI Embeddings** (98K Vektoren) |
| RAG API | **FastAPI** server für Vector Store Queries |
| AI-Erklärungen | Claude Opus 4.6 (vorab generiert, als JSON gecacht) |
| Auth & DB | **Supabase** (PostgreSQL + Auth + RLS) |
| PDF Export | **jsPDF** |
| Auto-Updates | GitHub Actions (wöchentlich) |
| Deployment | GitHub Pages (Viewer) + Hetzner/Railway (API) |

## Roadmap

- [x] Phase 1: Alle Gesetze durchsuchbar
- [x] AI-Erklärungen (112 Paragraphen in 18 Gesetzen)
- [x] Personalisierter RAG (12 Profile, 72 FAQs)
- [x] Reform-Diffs (4 Reformen)
- [x] Wöchentliche Auto-Updates
- [x] FAISS Vector Store (98K Vektoren, semantische Suche)
- [x] Chat mit Folgefragen (Konversations-History)
- [x] PDF-Export
- [x] Mandanten-Sharing (Link + Notiz)
- [x] Paragraph-Verlinkung (30+ Gesetze)
- [x] Gesetz des Tages (20 kuratierte Gesetze)
- [x] Supabase-Schema (Auth, Notizen, Chat-History, DSGVO)
- [x] RAG API Server (FastAPI)
- [ ] Supabase UI-Integration (Login, Profil, Notizen)
- [ ] Versions-Vergleich (Git-Diffs für Gesetzesänderungen)
- [ ] Phase 3: Lobbying-Transparenz

## Verwandt

- **[Deutschland 2030](https://github.com/mikelninh/deutschland-2030)** — 9 evidenzbasierte Reformen für Deutschland

## Lizenz

MIT — Demokratie sollte Open Source sein.
