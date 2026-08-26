# GitLaw ⚖️

**Source-grounded legal AI across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: the likely issue, missing facts, relevant paragraphs, uncertainty and a practical next step.

**[Try GitLaw →](https://mikelninh.github.io/gitlaw/)** · [Research workspace](https://mikelninh.github.io/gitlaw/#/research) · [Mietrecht pilot](https://mikelninh.github.io/gitlaw/#/mietrecht) · **[Production Legal AI proof →](https://mikelninh.github.io/gitlaw/ypog/)**

## What it proves

```text
question / matter
   ↓
exact + BM25 + semantic retrieval
   ↓
paragraph graph
   ↓
deterministic citation check
   ↓
structured answer + uncertainty
   ↓
supervised agent workflow
   ↓
human-reviewable next step
```

- hybrid retrieval across the German federal-law corpus
- paragraph-level source links and cross-reference graph
- deterministic citation resolution
- structured outputs with visible uncertainty
- APIs and MCP tools for agent workflows
- GitLaw Pro tenant isolation, agent tracing, cost/iteration guards and auditability
- human-review boundaries for consequential legal work
- regression tests that turn discovered failures into permanent checks

## Proof at a glance

| Signal | Current repository claim |
| --- | ---: |
| Federal laws indexed | **5,936** |
| Paragraph / graph nodes | **94,178** |
| Cross-references | **200,464** |
| FAISS vectors | **98,367** |
| Citation-resolution eval | **53 / 53** |
| Historical broad RAG Retrieval@5 | **0.65 / 20 questions** |

**Important:** 53/53 measures citation-resolution cases, not complete legal-answer accuracy. The historical 20-question broad RAG run is preserved as a **failure baseline**, not hidden: Retrieval@1 = 0.25, Retrieval@3 = 0.55, Retrieval@5 = 0.65, while answer faithfulness/relevance were not meaningfully measured in that run.

## Production Legal AI proof

The YPOG-oriented proof package separates **engineering integrity** from **legal-quality readiness**.

Run:

```bash
node scripts/ypog-proof-gate.mjs
```

Expected current outcome:

```text
engineering_gate: PASS
legal_quality_release_gate: BLOCKED_PENDING_LAWYER_REVIEWED_BENCHMARK
```

That blocker is intentional. A green CI build is not evidence of lawyer-grade legal accuracy.

The package adds:

- frozen baseline integrity checks;
- proposed >=100-case lawyer-reviewed release criteria;
- a 20-case adversarial seed suite;
- machine-readable supervised-agent policy;
- a lawyer human-evaluation scorecard;
- a multi-provider quality/latency/cost benchmark template;
- an inspectable synthetic agent-trace fixture;
- CI that runs the existing GitLaw tests and production viewer build alongside the proof gate.

See [`docs/ypog/`](docs/ypog/) and the [public proof page](https://mikelninh.github.io/gitlaw/ypog/).

## Product surfaces

- **Citizen experience** — plain-language legal orientation with source links
- **Research workspace** — search and inspect the broader federal corpus
- **Mietrecht pilot** — a deeper decision-support flow for one legal vertical
- **GitLaw Pro** — tenant-scoped intake → documents → research → draft → lawyer approval, with agent observability
- **MCP + APIs** — legal search, lookup and citation-verification tools for agents

Mietrecht is the first deeper vertical, **not GitLaw’s product boundary**.

## Engineering choices

```text
German federal-law corpus
          ↓
ingest + normalize
          ↓
BM25 / exact / FAISS
          ↓
hybrid ranker
          ↓
paragraph graph lookup
          ↓
local citation verifier
          ↓
React UI + APIs + MCP
```

The core principle is simple: **retrieval, evidence and verification should remain inspectable separately from generation.**

GitLaw Pro extends that rule to agentic work: **tool calls, cost, latency, approval state and source evidence should remain inspectable separately from the final prose.**

## Stack

**Python · FastAPI · React · TypeScript · BM25 · FAISS · embeddings · MCP · Pydantic · Zod · CI evals**

## Run the MCP demo

```bash
python -m gitlaw_mcp.demo
```

## Boundary

GitLaw assists research and preparation. It does **not** replace qualified legal advice or make consequential legal decisions autonomously.

The next meaningful proof is a frozen >=100-case benchmark reviewed by legal professionals, followed by executed red-team tests and realistic matter workflows — not simply adding more features.

---

Solo-built by [Michael Ninh](https://mikelninh.github.io/) in Berlin. · AGPL-3.0
