# Architecture

System overview, tech choices, and why each piece is where it is.

## Top-level layout

```
gitlaw/
├── viewer/              React 19 + TypeScript + Vite + Tailwind 4 frontend
│   └── src/pro/         Pro-tier components (closed beta)
├── api/                 Vercel Serverless Functions (TypeScript)
├── parser/              German law fetcher + paragraph chunker (Python)
├── rag/                 FAISS index + LangChain retrieval (Python)
├── gitlaw_mcp/          Model Context Protocol server (Python)
├── data/                Auto-generated artefacts (laws, leitsätze)
├── scripts/             CLI tools (eval, build, test runners)
└── deploy/              Docker, Fly.io, GitHub Actions configs
```

## Data flow — citizen Q&A

```
User question → /api/ask
  ↓
DSGVO-Anonymizer (14 PII patterns, local)
  ↓
RAG: FAISS top-K (98K vectors, 5,936 laws)
  ↓
OpenAI gpt-4o-mini with JSON-Schema structured output
  ↓
Citation Verifier (lookup against 5,936 markdown files)
  ↓
De-anonymizer (restores names locally)
  ↓
Response with verification badges (✓ verified · ⚠ unknown · 🚨 superseded)
```

Every citation is verified against the local corpus. 53/53 hand-labelled eval cases pass in CI.

## RAG pipeline (Python)

- **Embeddings:** OpenAI `text-embedding-3-small` (1536-dim)
- **Vector store:** FAISS (local file, ~98K vectors)
- **Chunking:** paragraph-level (1 paragraph = 1 vector). Coarse enough to retain legal context, fine enough for precise retrieval.
- **Index source:** `parser/chunk.py` walks all 5,936 markdown law files, extracts paragraphs by heading regex (`### § N`), embeds, indexes.
- **Top-K:** 5 paragraphs per query, with re-ranking by query-paragraph cosine + heuristic boosts for exact §-matches.

## Citation verification

- Every `§` reference returned by the LLM is parsed via regex (`§ \d+[a-z]?`)
- Looked up by heading match in `data/laws/<law-id>.md`
- Verification stati: `verified`, `law-unknown`, `paragraph-not-found`, `superseded` (recognises range markers like `§§ 2 bis 3f weggefallen`)
- Result rendered as colored badge in UI; raw verification status also appears in Audit-Log

53 eval cases in `scripts/eval/`, run on every PR via GitHub Actions.

## Pro-tier extensions

`viewer/src/pro/` is a separate route tree (`#/pro/*`) gated by invite tokens. Architecture additions:

- **Pro session:** signed JWT-style token with `tenantId` + `role` + `scopes`, stored in localStorage, sent as `Bearer` on every Pro API call
- **Tenant isolation:** every Pro endpoint checks `tenantId` against requested resource; cross-tenant reads return 403
- **Cloud-Sync (optional):** tenant-bound auto-push to Upstash Redis Frankfurt, opt-in per Anwält:in
- **Anti-Halluzination via RAG-Verified-Output:** Pro research uses same verifier as citizen-tier
- **5-Rollen-RBAC:** Owner / Paralegal / Assistant / Member / Viewer with reduced scope per role

## MCP server (gitlaw_mcp/)

Implements the [Model Context Protocol](https://modelcontextprotocol.io/) spec.

Tools exposed:
- `search_laws(query, top_k)` — semantic + lexical search over 5,936 laws
- `verify_citation(paragraph)` — lookup against corpus
- `get_paragraph(law_id, paragraph)` — exact text retrieval
- `traverse_graph(paragraph, depth)` — citation graph navigation (94K nodes / 200K edges)
- `explain_paragraph(law_id, paragraph)` — fetches AI-explained version if cached

Use cases: Claude Desktop, Cursor, Continue, custom agents.

## Citation graph

- **Nodes:** 94,178 paragraphs (one per § across all laws)
- **Edges:** 200,464 explicit cross-references extracted via regex pass
  - 199,301 intra-law (within same law)
  - 1,163 cross-law
- **Build:** `python -m gitlaw_mcp.graph_builder` (~6 seconds full rebuild)
- **Use:** "verwandte Paragraphen"-Drawer in citizen app, MCP `traverse_graph` tool

## Deployment topology

| Layer | Provider | Region |
|---|---|---|
| Citizen app | GitHub Pages | global CDN |
| Pro app | Vercel | Frankfurt (fra1) |
| Pro APIs | Vercel Serverless Functions | Frankfurt |
| Cache + KV | Upstash Redis | Frankfurt |
| LLM | OpenAI | EU endpoint |
| E-mail (planned) | Resend | EU |
| Static law corpus | bundled with build | n/a |

All hosting in EU/Germany — DSGVO requirement for legal-tech.

## Key files for first-time readers

- `parser/chunk.py` — how laws become embeddings
- `rag/retrieve.py` — top-K retrieval + re-ranking
- `api/ask.ts` — citizen Q&A endpoint with anonymizer + RAG + verification
- `api/pro/akte-summary.ts` — example of Pro endpoint with auth + tabu-prompt
- `viewer/src/pro/SachstandsGenerator.tsx` — bilingual template generator (DE+VI, 32 templates)
- `viewer/src/pro/case-status.ts` — 8-state workflow with transition rules
- `gitlaw_mcp/server.py` — MCP server entry point
- `scripts/eval/citation_verifier_eval.py` — citation verification tests

## Why the choices were made

- **AGPL-3.0 not MIT** — protects against closed-source SaaS clones in legal-tech
- **OpenAI gpt-4o-mini not GPT-4** — cost (10× cheaper), latency (sub-2s), structured outputs are reliable enough
- **FAISS not Pinecone/Weaviate** — local file is enough for 98K vectors, no per-query API cost, full control over index format
- **HashRouter not BrowserRouter** — required for GitHub Pages without server rewrites
- **Vercel Frankfurt + Upstash Frankfurt** — DSGVO over latency. Saves the AVV negotiation pain.
- **Anonymizer as middleware not service** — minimal latency, no external dependency for what's essentially regex
