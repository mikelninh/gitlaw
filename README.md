# GitLaw ⚖️

**RAG-grounded German legal research with verified citations + a closed-beta workflow tier for law firms.**

> Solo-built by [Mikel Ninh](https://github.com/mikelninh) in Berlin · open source under [AGPL-3.0](LICENSE) · in active pilot with a Berlin migration-law firm (May 2026)

| | |
|---|---|
| **Citizen app (free)** | [gitlaw-xi.vercel.app](https://gitlaw-xi.vercel.app/) · [gitlaw.app](https://mikelninh.github.io/gitlaw/) |
| **Pro tier (closed beta)** | [/#/pro](https://gitlaw-xi.vercel.app/#/pro) — invite-only |
| **Wiki** | [Home](wiki/Home.md) · [Architecture](wiki/Architecture.md) · [Features](wiki/Features.md) · [Legal & Privacy](wiki/Legal-and-Privacy.md) · [Development](wiki/Development.md) · [Roadmap](wiki/Roadmap.md) |
| **For recruiters** | [`portfolio.html`](portfolio.html) — JD requirements mapped 1:1 to code paths |
| **Conventions** | [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) · [CHANGELOG.md](CHANGELOG.md) |

---

## What it does

**5,936 German federal laws** indexed paragraph-level, queryable via fuzzy + semantic search. **AI-generated explanations** for the 112 most-asked paragraphs, in plain German. Every AI answer is **citation-verified** against the local corpus — 53/53 hand-labelled eval cases pass in CI. **94K-node citation graph** lets users navigate from one § to all related ones in one click.

For lawyers, GitLaw Pro is a **mandate workflow tier**: 11 Mandatsart-Checklisten with 108 curated Pflicht-Items, 8-state Workflow with transition rules, 32 Sachstand-Templates Deutsch+Vietnamese, OCR-Drop-Zone with auto-rename, branded PDF/Word export, signed Pro-Sessions with 5-Rollen-RBAC, frankfurt-only hosting, full audit log.

## Stats

| | |
|---|---|
| Federal laws indexed | **5,936** (1.3M lines of legal text) |
| Paragraphs (graph nodes) | **94,178** |
| Cross-references (graph edges) | **200,464** (199K intra-law · 1,163 cross-law) |
| FAISS vectors | **98,367** |
| Citizen letter templates | **20** (16 free · 4 premium) |
| Pro letter templates | **59** (Notariat · Migration · Familie · Sozial · Steuer · allgemein) |
| Pro Sachstand-Templates | **32** (8 Stati × Mandant/Mittelsperson × DE/VI) |
| Curated BGH/BVerfG-Leitsätze | **40** zu Top-30 §§ |
| Live-Rechtsprechungs-Index | **150K+ Urteile** via OpenLegalData |
| Citation eval (CI) | **53/53 cases · 100% pass-rate** |
| Languages | **6 citizen** (DE/Leichte Sprache/TR/AR/EN/UK) · **5 Pro-Intake** (DE/VI/TR/AR/EN, RTL für Arabisch) |
| Updates | **weekly auto-update** (laws + Leitsätze via GitHub Action) |

---

## Citizen tier — `gitlaw.app`

Free, donations-funded, no account needed.

- 🔍 **Search 5,936 laws** — fuzzy + semantic (FAISS, 98K vectors)
- 💡 **AI-explained paragraphs** — 112 §§ in plain German, generated with OpenAI structured outputs, cached on disk
- 💬 **Chat with follow-up questions** — personalized for 12 user profiles
- 🛡 **Anti-hallucination badges** — `✓ verified` / `⚠ unknown` / `🚨 superseded`. Recognises range markers (`§§ 2 bis 3f weggefallen` covers § 3 NetzDG)
- 🔗 **Verwandte Paragraphen** — citation-graph drawer per cited § (94K nodes / 200K edges)
- 📝 **20 letter templates** — Widerruf Online-Kauf · Kündigung Mietvertrag · Einspruch Bußgeld · Widerspruch Nebenkosten · DSGVO-Auskunft · etc.
- 📰 **Gesetz des Tages** + Reform-Diffs — daily highlight, week-old changes
- ♿ **A11y** — A-/A+ text, darkmode, keyboard navigation, theme buttons over typing
- 🌍 **6 UI languages** with on-the-fly answer translation

### Top demanded letter templates (search volume / month)

| Template | Searches/Mo |
|---|---|
| 🛒 Widerruf Online-Kauf | 40K |
| 🔧 Reklamation | 25K |
| 🏠 Kündigung Mietvertrag | 22K |
| 🚗 Einspruch Bußgeld | 20K |
| 💧 Widerspruch Nebenkosten | 18K |
| + 15 more | 150K+ |

---

## GitLaw Pro — closed-beta lawyer tier

Separate route at `/#/pro`, invite-token-gated, currently in active pilot.

### What it does

| Area | Functionality |
|---|---|
| **Mandant:innen-Akten** | CRUD with §§ 187/188 BGB Frist-Tracker, auto-Frist after § 75 VwVfG, mandate-typed checklists, status workflow |
| **11 Mandatsart-Checklisten** *(Sprint 1)* | 108 curated Pflicht-Items · status per item · "only missing required"-filter · Item-Description per item explains why needed |
| **8-Stati-Workflow** *(Sprint 1)* | `unterlagen_fehlen` → `antrag_in_vorbereitung` → `antrag_eingereicht` → `behoerdliche_rueckmeldung_ausstehend` → `behoerde_nachforderung` → `termin_steht_aus` → `verfahren_abgeschlossen`, with transition rules |
| **Sachstand-Generator DE+VI** *(Sprint 1)* | 32 templates auto-filled with Mandantenname, Behörde, Aktenzeichen, Frist · Mandant ↔ Mittelsperson toggle · DE ↔ VI toggle |
| **Behörden-Combobox** *(Sprint 1)* | 17 Berliner migration agencies pre-filled (LEA, BAMF, VG Berlin, Botschaften Vietnam) |
| **Heute-Widget** *(Sprint 1)* | Dashboard top: deadlines ≤14 days, Behörden-Rückfragen, missing required docs, red **Eilantrag-Eskalation** for 7-day cases |
| **OCR-Drop-Zone** *(Sprint 1)* | PDF text-layer + OpenAI Vision for scans · keyword-match suggestions with DE/EN/VI aliases · auto-rename `Reisepass_Mandant_2026-05-06.pdf` · readability hint |
| **Tasks pro Akte (Modul D)** *(Sprint 1)* | Auto-generation on status changes · 7 task types · "Behörde nachfassen 14 days after Antrag eingereicht" etc. |
| **Akte-Zusammenfassung** *(Sprint 1)* | LLM summary with **§14-tabu prompt** — explicitly forbids Erfolgsprognosen, strategic decisions, contested authority/court communication |
| **Recherche with 3-tier evidence** | KI-Antwort with verified citations + (1) curated BGH/BVerfG-Leitsätze (40) · (2) live OpenLegalData (150K+ Urteile) · (3) deep-links Beck/dejure/openjur |
| **Anti-hallucination badges** | Same verifier as citizen-tier · 53/53 eval cases passing in CI |
| **Word + branded PDF export** | Editable .docx with Briefkopf · PDF with verification status per citation · disclaimer footer |
| **5-Rollen-RBAC** *(Sprint 1)* | Owner / Paralegal (Refa) / Assistant (Hilfskraft) / Member / Viewer · scope-restricted per role |
| **DSGVO-Schutz-Modus** | 14 PII-pattern anonymizer + 50-token whitelist before any LLM call |
| **CSV-Akten-Import** | DATEV / RA-Micro / advoware / Excel auto-column-detection |
| **Cloud-Sync** | Tenant-bound, signed Pro-Session, Upstash Frankfurt |
| **Audit-Log** | Lückenlos, BHV-tauglich PDF export |
| **Mehrsprachiges Intake-Formular** | DE/VI/TR/AR/EN with triage block (Dringlichkeit + Frist + Anhang-Metadaten) |
| **AVV-Vorlagen-Generator** | Auf eigenem Briefkopf |

### Sprint 1 (May 2026, 8 days)

Built between **2026-04-29** (Lastenheft received from pilot lawyer) and **2026-05-06** (today's pilot meeting). 88% of MVP requirements live, 100% by end of May. See [CHANGELOG.md](CHANGELOG.md) and [wiki/Features](wiki/Features.md) for the full liste.

---

## MCP Server — GitLaw as a tool for any LLM client

[![MCP CI](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml/badge.svg)](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml) [![Citation Eval: 53/53](https://img.shields.io/badge/citation_eval-53%2F53_(100%25)-brightgreen)](gitlaw_mcp/tests/cases.json) [![Transport: stdio + SSE](https://img.shields.io/badge/transport-stdio_%2B_SSE-blue)](gitlaw_mcp/README.md)

The full corpus + citation verification is exposed as a [Model Context Protocol](https://modelcontextprotocol.io) server — Claude Desktop, Cursor, Continue, or your own agent can call GitLaw tools natively.

```python
# An LLM calls verify_citation("§ 999 StGB")
{
  "verified": false,
  "reason": "paragraph_not_found",
  "law": { "name": "Strafgesetzbuch", "abbreviation": "StGB" },
  "hint": "StGB exists, but '§ 999' was not found."
}
```

**Six tools:**
- `search_laws` — FAISS retrieval (98K vectors)
- `verify_citation` — anti-hallucination with structured failure modes
- `lookup_paragraph` — exact §-text retrieval
- `list_laws` — corpus enumeration (4,852 abbreviations)
- `find_related_paragraphs` — citation-graph traversal
- `hybrid_search` — vector + graph combined

Plus the resource `gitlaw://law/{abbr}` for full law texts.

**Three deploy paths:**
- **stdio** local — Claude Desktop / Cursor / own agents ([setup](gitlaw_mcp/README.md))
- **HTTP/SSE** on Fly.io Frankfurt — push-to-deploy ([`fly.toml`](fly.toml))
- **AWS ECS Fargate** via Terraform — VPC + ALB + EFS + Secrets Manager + Autoscaling ([`deploy/aws/`](deploy/aws/README.md))

Demo without an API key: `python -m gitlaw_mcp.demo`

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind 4, HashRouter, react-router-dom 7 |
| Citizen RAG | LangChain + FAISS + OpenAI Embeddings (`text-embedding-3-small`) |
| Pro AI | OpenAI gpt-4o-mini with JSON-Schema structured outputs |
| Pro backend | Vercel Serverless Functions + Upstash Redis (Frankfurt) + signed Pro sessions (HMAC-SHA256) |
| Citation verification | Local lookup against 5,936 markdown files (`### § N` heading match) |
| Knowledge graph | 94K paragraphs + 200K cross-references, sharded per-law as JSON |
| MCP transport | stdio (local) + SSE (Fly.io) + ECS Fargate (AWS) |
| PDF / Word | jsPDF (branded templates) + docx (editable export) |
| Anonymizer | 14 regex PII patterns + 50 whitelist tokens |
| Updates | GitHub Actions (weekly law + Leitsatz refresh via OpenAI structured outputs) |
| Hosting | GitHub Pages (citizen) + Vercel + Upstash Frankfurt (Pro + APIs) |
| Observability | JSON-structured logs per MCP tool call (request_id, latency_ms, status) — Datadog/Loki/Sentry-ready |

---

## Run locally

```bash
# Citizen viewer
cd viewer && npm install && npm run dev
# → http://localhost:5173

# Pro tier (same dev server, different route)
# → http://localhost:5173/#/pro?invite=DEMO

# API (Vercel functions, requires OPENAI_API_KEY in .env.local)
npx vercel dev
```

Full setup details: [wiki/Development](wiki/Development.md).

---

## Privacy & legal

- **Hosting durchgängig EU/Frankfurt:** Vercel + Upstash + Resend (planned)
- **DSGVO-Anonymizer** before every LLM call (14 PII patterns + whitelist)
- **OpenAI no-training:** org-setting + `X-No-Train` header
- **Audit-Log:** lückenlos, BHV-tauglich PDF export
- **Berufsgeheimnis (§ 43a BRAO):** architectural lock — no auto-send, every PDF has disclaimer footer
- **AVV templates** for Mikel ↔ pilot firm and pilot firm ↔ clients

GitLaw is a research and template tool. **AI-generated answers and letters do not replace legal advice.** Every output requires Anwält:in review before use.

Full privacy concept and external-audit recommendations: [wiki/Legal-and-Privacy](wiki/Legal-and-Privacy.md).

---

## Roadmap

- [x] 5,936 laws indexed · 98K vectors · semantic search
- [x] AI-explained paragraphs (112 §§) · 12 user profiles · 6 languages
- [x] 20 citizen letter templates · 59 Pro templates (6 packs)
- [x] **3-tier Rechtsprechung** (deep-links · 40 curated BGH/BVerfG-Leitsätze · OpenLegalData live)
- [x] **GitLaw Pro Beta** — Akten · verified research · branded templates · Frist-Calc · Cloud-Sync · AVV
- [x] **Migration-MVP Sprint 1** *(May 2026)* — 11 Mandatsart-Checklisten · 8-Stati-Workflow · Sachstand-Generator DE+VI · Behörden-DB · OCR-Drop-Zone · Tasks · 5-Rollen-RBAC · Akte-Zusammenfassung
- [x] **MCP Server** — 6 tools · 3 deploy paths · 53/53 citation eval passing
- [ ] **Sprint 2** *(June 2026)* — Auto-Erinnerungs-Engine · Refa-Freigabe · Resend EU integration
- [ ] **Sprint 3** *(July 2026)* — Semantic OCR with gpt-4o-vision · Confidence-Scores · Background workers for large PDFs
- [ ] **Sprint 4** *(August 2026)* — Mittelsperson data model · Vollmachts-Validierung · Magic-Link-Auth
- [ ] **Phase 4** *(Q4 2026)* — Mandanten-Portal · external Pen-Test
- [ ] **External DSGVO audit** before productive scaling
- [ ] **Azure OpenAI EU-Region** for Großkanzlei AVV requirements

Full roadmap: [wiki/Roadmap](wiki/Roadmap.md).

---

## Ecosystem — Open-Source Digital Democracy

This project is part of an open-source ecosystem for digital democracy:

| Project | Question | Link |
|---|---|---|
| **FairEint** | What should Germany do differently? | [github.com/mikelninh/faireint](https://github.com/mikelninh/faireint) · [Live](https://mikelninh.github.io/faireint/) |
| **GitLaw** | What does the law actually say? | [github.com/mikelninh/gitlaw](https://github.com/mikelninh/gitlaw) · [Live](https://gitlaw-xi.vercel.app/) |
| **Public Money Mirror** | Where is the tax money going? | [github.com/mikelninh/Public-Money-Mirror](https://github.com/mikelninh/Public-Money-Mirror) |
| **SafeVoice** | Who is being attacked online? | [github.com/mikelninh/safevoice](https://github.com/mikelninh/safevoice) |

All projects: [github.com/mikelninh](https://github.com/mikelninh) · Support: [Ko-fi](https://ko-fi.com/mikel777) · [GitHub Sponsors](https://github.com/sponsors/mikelninh)

---

## License

**AGPL-3.0** for the entire repository.

AGPL closes the SaaS loophole: anyone offering this software as a network service must publish their changes under the same license. For a legal-tech tool that protects long-term openness — nobody can take this code and ship it as a closed commercial fork.

Commercial license without AGPL copyleft obligations: [mikel_ninh@yahoo.de](mailto:mikel_ninh@yahoo.de).

---

## Contact

- **Operator:** Mikel Ninh, Berlin · [mikel_ninh@yahoo.de](mailto:mikel_ninh@yahoo.de)
- **Beta access GitLaw Pro:** same e-mail
- **Job applications / portfolio context:** [`portfolio.html`](portfolio.html) — JD requirements mapped 1:1 to code paths

> *„Demokratie sollte Open Source sein."*
