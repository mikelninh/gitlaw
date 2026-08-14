# GitLaw ⚖️

**Source-grounded legal AI across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: the likely issue, missing facts, relevant paragraphs, uncertainty and a practical next step.

**[Try GitLaw →](https://mikelninh.github.io/gitlaw/)** · [Research workspace](https://mikelninh.github.io/gitlaw/#/research) · [Mietrecht pilot](https://mikelninh.github.io/gitlaw/#/mietrecht)

## What it proves

```text
question
   ↓
exact + BM25 + semantic retrieval
   ↓
paragraph graph
   ↓
deterministic citation check
   ↓
structured answer + uncertainty
   ↓
human-reviewable next step
```

- hybrid retrieval across the German federal-law corpus
- paragraph-level source links and cross-reference graph
- deterministic citation resolution
- structured outputs with visible uncertainty
- APIs and MCP tools for agent workflows
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

**Important:** 53/53 measures citation-resolution cases, not complete legal-answer accuracy.

## Product surfaces

- **Citizen experience** — plain-language legal orientation with source links
- **Research workspace** — search and inspect the broader federal corpus
- **Mietrecht pilot** — a deeper decision-support flow for one legal vertical
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

## Stack

**Python · FastAPI · React · TypeScript · BM25 · FAISS · embeddings · MCP · Pydantic · Zod · CI evals**

## Run the MCP demo

```bash
python -m gitlaw_mcp.demo
```

## Boundary

GitLaw assists research and preparation. It does **not** replace qualified legal advice or make consequential legal decisions autonomously.

The next meaningful proof is broader evaluation with legal professionals on anonymised matters — not simply adding more features.

---

Solo-built by [Michael Ninh](https://mikelninh.github.io/) in Berlin. · AGPL-3.0
