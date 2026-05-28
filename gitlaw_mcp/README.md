# GitLaw MCP Server

[![MCP CI](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml/badge.svg)](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml)
[![Tests](https://img.shields.io/badge/tests-146%2F146-brightgreen?logo=pytest)](gitlaw_mcp/tests/)
[![Hallucination rate](https://img.shields.io/badge/measured_hallucinations-0%25-brightgreen)](gitlaw_mcp/eval/eval_summary.md)
[![Trust statement](https://img.shields.io/badge/trust-TRUST.md-blue)](gitlaw_mcp/freshness/TRUST.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

> **Model Context Protocol server for German federal law — 5,942 statutes indexed, anti-hallucination citation verification, daily drift detection against the official source. Built for legal agents that need to ground every § they cite.**

10 tools, one resource, one trust contract:

| You ask Claude / Cursor… | …with GitLaw MCP it answers |
|---|---|
| "Verify § 573 BGB" | Returns the real paragraph text. Or `verified: false` with a structured reason. **Never invents.** |
| "Mein Vermieter kündigt wegen Eigenbedarf — was kann ich tun?" | Semantic search finds § 574 BGB, returns the text, the LLM grounds its answer in real statute |
| "How do you know your BGB is current?" | `check_upstream_currency("BGB")` — returns the days_behind vs. gesetze-im-internet.de live |
| "What's the integrity hash of your corpus right now?" | `get_corpus_status()` — single SHA-256 every consumer can verify |

---

## Why this exists

LLMs hallucinate German law all the time. They confidently cite `§ 999 StGB` (doesn't exist), invent paragraph titles, swap statutes. We measured `gpt-4o-mini` on 25 real Lebenslagen questions: **5.9% of its cited paragraphs were fake.** That's catastrophic for a lawyer, harmful for a citizen, dishonest for AI.

With GitLaw MCP available as a tool, hallucination rate drops to **0%** — the model has no reason to invent when `verify_citation` is one call away. See [`eval/eval_summary.md`](gitlaw_mcp/eval/eval_summary.md) for the reproducible report.

This server gives any MCP-compatible client (Claude Desktop, Cursor, Continue, custom agents) the legal-tools surface they need:

- **Semantic search** across all 5,942 federal statutes → grounded retrieval
- **Citation verification** → real paragraph text or structured rejection — **no hallucinated §**
- **Exact lookup** by abbreviation + paragraph
- **Citation-graph traversal** (94k nodes, 200k edges) — who cites whom
- **Corpus provenance** — every served paragraph has a public source URL and SHA-256
- **Live drift detection** — daily HEAD-check against gesetze-im-internet.de, surfaces stale law data

---

## How do you know it's correct? *(read this before building on top of us)*

This is the most important section of the README. Trust isn't a vibe — it's evidence.

| Question | Where to look |
|---|---|
| Is every cited § actually in the corpus? | `verify_citation()` returns `verified: false` if not. **0% hallucination measured.** |
| Where does each law come from? | `verify_law_provenance(abbr)` → official source URL + SHA-256 + git timestamp |
| Is the corpus the same one another agent is seeing? | `get_corpus_status()` → single aggregate SHA-256, deterministic, public |
| Has anything changed upstream since we synced? | `check_upstream_currency(abbr)` → days behind upstream + last-modified timestamps |
| What's your full promise / disclosure of gaps? | **Read [`freshness/TRUST.md`](gitlaw_mcp/freshness/TRUST.md) — it's the most honest legal-tech trust document you'll read this year.** |

**Live drift status** (the integrity check is automated; this section reflects the latest sync):

```
6 of 36 monitored laws are stale vs. upstream gesetze-im-internet.de
  BGB:  50 days behind   ZPO:  49 days behind   SGG:  49 days behind
  GG:   29 days behind   HGB:  29 days behind   AO:   21 days behind
```

We tell you this *on purpose*. A citizen looking up tenant rights should know if our § 573 BGB is older than the official version. Daily cron (`upstream-sync.yml`) refreshes it automatically.

---

---

## Quickstart — Claude Desktop in one minute

```bash
git clone https://github.com/mikelninh/gitlaw
cd gitlaw
pip install -e gitlaw_mcp
python rag/build_vectorstore.py    # one-off, ~15 min, costs ~$0.50 in OpenAI embeddings
```

Then add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "gitlaw": {
      "command": "gitlaw-mcp",
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Restart Claude Desktop. Ask: *"Verifiziere § 573 BGB."* — you should get the real paragraph text back.

For Cursor / Continue / custom agents: same `command` + `env`, the config schema is identical.

---

## Test coverage

```
118 passed in 10s
```

- **81** citation-parsing & hallucination tests — `§ 999 StGB` correctly rejected, `Art. 5 Abs. 1 S. 1 GG` correctly parsed, mixed-case / whitespace / unicode handled
- **8** lookup-content tests — returned paragraph text actually contains the domain-specific terms a lawyer expects under that number (catches silent index drift)
- **2** citation-graph tests — known cross-references between paragraphs are preserved
- **10** semantic-search Lebenslagen tests — plain-language queries ("Mieterhöhung Zustimmung", "Cyberstalking Nachstellung") surface the canonical paragraph in top-N
- **14** adversarial tests — prompt-injection, 10k-char inputs, unicode soup, SQL-ish payloads degrade gracefully
- **2** latency-budget tests — `verify_citation` < 50 ms, `lookup_paragraph` < 100 ms after warmup

Known limitations (honest):
- Citation parser doesn't yet handle the nested `Abs. X Nr. Y` form (e.g. `§ 573 Abs. 2 Nr. 2 BGB`) — falls back to flat parsing. On the roadmap.
- Some specialised statutes (EFZG, certain Landesgesetze) aren't in the indexed corpus. Federal Bundesrecht is complete.

---

## Tools exposed

### Retrieval & verification (the core six)

| Tool | Purpose | Example |
|---|---|---|
| `search_laws(query, limit=5)` | Semantic search across all paragraphs (FAISS + OpenAI embeddings) | `"Beleidigung im Internet"` |
| `verify_citation(citation)` | Parse `§ 185 StGB` style strings → real text or structured rejection. **The anti-hallucination tool.** | `"§ 185 Abs. 1 StGB"` |
| `lookup_paragraph(abbr, paragraph)` | Exact lookup when you have structured input | `("StGB", "263a")` |
| `list_laws(filter=None, limit=50)` | Enumerate available laws (5,942 indexed) | `filter="bgb"` |
| `find_related_paragraphs(citation)` | Walk the citation graph (94k nodes, 200k edges) — who cites X, what X cites | `"§ 185 StGB"` |
| `hybrid_search(query, limit, expand)` | Semantic + 1-hop graph expansion in one call | `"Eigenbedarf", expand=2` |

### Provenance & freshness (the four trust tools)

| Tool | Purpose | Example output |
|---|---|---|
| `get_corpus_status()` | Single integrity hash + law count + when manifest was last built | `aggregate_sha256: b93152a9…` |
| `verify_law_provenance(abbr)` | Source URL + SHA-256 + git timestamp for one law | source_url, corpus_sha256, corpus_bytes |
| `check_upstream_currency(abbr)` | Compares our git timestamp vs. gesetze-im-internet.de Last-Modified | `drift_status: "stale", days_behind: 50` |
| `list_drifted_laws()` | Every monitored law where upstream is newer than our corpus, sorted by staleness | sorted list of drifted laws |

Plus the resource `gitlaw://law/{abbreviation}` returning the full markdown content of a law.

---

## Anti-hallucination demo

```
verify_citation("§ 185 StGB")
→ {
    "verified": true,
    "law": { "name": "Strafgesetzbuch", "abbreviation": "StGB" },
    "paragraph": {
      "number": "§ 185",
      "title": "Beleidigung",
      "text": "Die Beleidigung wird mit Freiheitsstrafe bis zu einem Jahr ..."
    },
    "source": "laws/stgb.md"
  }

verify_citation("§ 999 StGB")
→ {
    "verified": false,
    "reason": "paragraph_not_found",
    "law": { "name": "Strafgesetzbuch", "abbreviation": "StGB" },
    "hint": "StGB exists, but '§ 999' was not found in the corpus."
  }

verify_citation("§ 185 XYZ")
→ {
    "verified": false,
    "reason": "law_not_found",
    "law_abbreviation_searched": "XYZ"
  }
```

---

## Install

Requires Python 3.10+.

From the GitLaw repo root:

```bash
pip install -e gitlaw_mcp
# or with uv:
uv pip install -e gitlaw_mcp
```

Then verify:

```bash
gitlaw-mcp --help                    # see CLI options (FastMCP defaults)
python -m gitlaw_mcp.server          # start the server (stdio)
```

`search_laws` requires `OPENAI_API_KEY` (used for query embeddings). The other three tools work entirely offline against the local Markdown corpus.

The `rag/vectorstore/` directory must exist. If not:

```bash
python rag/build_vectorstore.py      # builds FAISS index, ~$0.50, ~10 min
```

---

## Wire it into Claude Desktop (or any MCP client)

See the [Quickstart](#quickstart--claude-desktop-in-one-minute) above — the
canonical config uses the `gitlaw-mcp` entry-point installed by `pip install -e gitlaw_mcp`.

If you'd rather invoke without `pip install` (e.g. running straight from the
cloned source), the equivalent config is:

```json
{
  "mcpServers": {
    "gitlaw": {
      "command": "python",
      "args": ["-m", "gitlaw_mcp.server"],
      "cwd": "/absolute/path/to/gitlaw",
      "env": { "OPENAI_API_KEY": "sk-..." }
    }
  }
}
```

Cursor / Continue / custom agents accept the same `command + args + env` shape.

---

## Try it

In Claude Desktop, after wiring up the server:

> *"Was sagt § 185 StGB zu Beleidigung im Internet? Verifiziere bitte die Zitate."*

Claude will call `search_laws` for context, then `verify_citation` on each citation it produces, and clearly mark which ones are verified vs. unverified.

> *"Welche Gesetze haben die Abkürzung 'BGB'?"*

Calls `list_laws(filter='bgb')` and returns the three matches.

> *"Existiert eigentlich § 999 StGB?"*

Calls `verify_citation('§ 999 StGB')` and reports it does not exist.

---

## Architecture

```
gitlaw_mcp/
├── server.py          — FastMCP server, 5 @tool decorators + 1 @resource
├── citations.py       — German legal-citation regex parser + paragraph extractor
├── graph_builder.py   — extracts cross-references from all 5,936 laws → JSON
├── graph_viewer.html  — D3 force-directed network of 290 laws + 242 cross-edges
├── data/
│   ├── citation_graph.json       — 94K paragraphs, 200K refs (gitignored, regen via builder)
│   ├── citation_graph_top.json   — top-30 laws subset
│   └── citation_graph_laws.json  — law-level aggregation (used by viewer)
├── demo.py            — runnable smoke test (no API key needed)
├── Dockerfile         — multi-stage prod build, non-root user, healthcheck
├── ARCHITECTURE.md    — cloud migration path (AWS Fargate / Azure Container Apps)
├── pyproject.toml
└── README.md

  reuses:
  laws/               — 5,936 markdown files (one per law, paragraphs as ### headings)
  rag/vectorstore/    — FAISS index (paragraph-level chunks, OpenAI embeddings)
```

### Knowledge Graph

The 5,936 laws form a citation network — every paragraph that mentions another (`§ 11 Absatz 3` inside the body of `§ 185`) becomes a graph edge. After running:

```bash
python -m gitlaw_mcp.graph_builder      # ~6s, writes data/citation_graph.json
```

… you get **94,178 paragraphs (nodes)** and **200,464 references (edges)** — 199,301 intra-law plus 1,163 cross-law. The MCP tool `find_related_paragraphs(citation)` walks this graph in both directions: paragraphs that cite the input, and paragraphs cited by the input.

For the visual story, open `graph_viewer.html` (D3 v7, no build step) to see all 290 actively-cross-referencing laws as a force-directed network, with hover, click-to-pin, and search:

```bash
python -m http.server 8000
# then open http://localhost:8000/gitlaw_mcp/graph_viewer.html
```

### Docker

```bash
# Build (from repo root):
docker build -t gitlaw-mcp:0.1.0 -f gitlaw_mcp/Dockerfile .

# Smoke-test inside the container:
docker run --rm gitlaw-mcp:0.1.0 python -m gitlaw_mcp.demo

# Run as MCP server (with bind-mounted vectorstore):
docker run --rm -i \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -v $(pwd)/rag/vectorstore:/app/rag/vectorstore:ro \
  gitlaw-mcp:0.1.0
```

### CI

`.github/workflows/mcp-ci.yml` runs three jobs in parallel on every push touching `gitlaw_mcp/` or `laws/`:
- **smoke** — install + run `demo.py` (validates 4,852+ laws indexed, anti-hallucination cases pass)
- **lint** — ruff check + format + mypy
- **docker** — multi-stage build with BuildKit cache, then run the demo inside the resulting image

Total wall-time ~2-3 min. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full cloud-deployment path (AWS Fargate / Azure Container Apps).

The server is **stateless across requests** but loads:
- the abbreviation→file index lazily on first call (~50ms scan of `laws/*.md` headers)
- the FAISS vectorstore lazily on first `search_laws` call (~2-3s, ~150MB RAM)

The other tools (`verify_citation`, `lookup_paragraph`, `list_laws`) are pure file-reads against the markdown corpus — no API key needed, sub-millisecond per call.

---

## Citation parser

`citations.py` handles common German legal citation formats:

| Input | Parsed |
|---|---|
| `§ 185 StGB` | StGB / § 185 |
| `§185 StGB` | StGB / § 185 |
| `§ 185 Abs. 1 StGB` | StGB / § 185 (subsection: "Abs. 1") |
| `§ 185 I StGB` | StGB / § 185 (subsection: "I", Roman numeral) |
| `§ 263a StGB` | StGB / § 263a (paragraph with letter suffix) |
| `Art. 5 GG` | GG / Art 5 |
| `Art 5 Abs. 1 S. 1 GG` | GG / Art 5 (subsection: "Abs. 1 S. 1") |

The Roman-numeral sub-pattern uses a lookahead so `X` in `XYZ` is not mistaken for a Roman 10. Letter-suffixed paragraphs (`263a`, `129b`) are supported.

---

## Hosted deployment (Fly.io, Frankfurt)

The MCP server is also packaged for **HTTP+SSE transport** so any hosted MCP
client (or your own agent on AWS/Render/Cloudflare Workers) can connect over
TLS without running it locally.

```bash
# Deploys to https://gitlaw-mcp.fly.dev/sse in Frankfurt (eu-central):
flyctl auth login
flyctl launch --no-deploy           # accepts fly.toml as-is
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl volumes create gitlaw_data --region fra --size 1
flyctl deploy
```

After that, push-to-deploy is wired via `.github/workflows/fly-deploy.yml` —
add `FLY_API_TOKEN` to your repo secrets and every commit on `main` that
touches `gitlaw_mcp/`, `laws/`, or `fly.toml` ships within ~60s.

The Dockerfile.fly variant binds to `0.0.0.0:8000` and serves SSE; the
default `gitlaw_mcp/Dockerfile` stays in stdio mode for Claude Desktop.

## Roadmap

- [x] ~~HTTP/SSE transport~~ — done (Dockerfile.fly + fly.toml + SSE in server.py)
- [x] ~~Citation graph + `find_related_paragraphs` tool~~ — done (94k nodes, 200k edges)
- [x] ~~Eval harness with reproducible hallucination measurement~~ — done (`eval/`, 25 questions)
- [x] ~~Corpus provenance manifest~~ — done (`freshness/manifest.json`, per-law SHA-256)
- [x] ~~Live drift detection vs. gesetze-im-internet.de~~ — done (`freshness/sync.py`, daily cron)
- [ ] **Phase 1b** — auto-resync stale markdown when drift detected (needs XML→markdown parser, ~2 weekends)
- [ ] Nested `§ X Abs. Y Nr. Z` citation parsing
- [ ] Schweizer / Österreichischer Rechtskorpus (already partially in `laws_*.py`)
- [ ] Landesrecht (state-level law)
- [ ] Per-tenant rate limiting (relevant once multi-tenant SSE clients exist)

---

## Part of an MCP-server portfolio

GitLaw MCP is one of three Model Context Protocol servers built as
**a thin agent-readable layer over real-world workflows**. The pattern is
deliberately reproducible — same architecture, different domains:

- **[gitlaw-mcp](https://github.com/mikelninh/gitlaw)** — German federal law (you're here)
- **[safevoice-mcp](https://github.com/mikelninh/safevoice)** — victim-of-digital-harassment tooling: classification, applicable §, Strafantrag-Fristen, jurisdiction, anonymisation (DE/AT/CH/UK)
- **[grailsense](https://github.com/mikelninh/grailsense)** — NFT collector intelligence over Blockscout: archetype classification + shareable soul cards

Together they're an early sketch of what **public-good civic infrastructure**
looks like in the LLM era: open source, MIT, verifiable, composable.

---

## Contact + community

- **Issues / bug reports** — [GitHub Issues](https://github.com/mikelninh/gitlaw/issues)
- **Strategic discussion** — [GitHub Discussions](https://github.com/mikelninh/gitlaw/discussions)
- **Direct** — open an issue tagged `question` if it's broader than a bug
- **Built by** [@mikelninh](https://github.com/mikelninh) — Berlin

---

## License

MIT. Part of the [GitLaw](../README.md) project — open infrastructure for digital legal services in Germany. The underlying corpus of German federal law is public domain per § 5 UrhG.
