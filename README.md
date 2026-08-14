# GitLaw ⚖️

**Source-grounded legal decision support across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: the likely issue, missing facts, relevant paragraphs, uncertainty and a practical next step.

**[Try GitLaw](https://mikelninh.github.io/gitlaw/)** · **[Research workspace](https://mikelninh.github.io/gitlaw/#/research)** · **[Mietrecht pilot](https://mikelninh.github.io/gitlaw/#/mietrecht)**

## What it proves

- hybrid legal retrieval across the German federal-law corpus
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
| Citation-resolution eval | **53/53** |

**Important:** 53/53 measures citation-resolution cases, not complete legal-answer accuracy.

## How it works

```text
German federal laws + case-law sources
                 ↓
        ingest + normalize
                 ↓
       exact / BM25 / FAISS
                 ↓
          hybrid retrieval
                 ↓
      paragraph graph lookup
                 ↓
 deterministic citation check
                 ↓
   explanation / workflow output
                 ↓
            human review
```

Retrieval and citation verification are inspectable separately from generation. Missing or unverifiable sources remain visible instead of being smoothed over by the model.

## Product surfaces

### Citizen decision support
Plain-language questions become a structured orientation: issue, relevant sources, missing facts, uncertainty and possible next steps.

### Legal research
Search and navigation across the federal-law corpus with exact lookup, lexical retrieval, semantic retrieval and related-paragraph exploration.

### Mietrecht pilot
A deeper domain pack for German tenancy law that shows how a broad legal engine can gain stronger domain-specific workflows without pretending the whole product is only about tenancy.

### MCP + APIs
GitLaw exposes legal-search and verification primitives that other agents can compose rather than reimplementing legal retrieval themselves.

Current MCP tools include:

- `search_laws`
- `hybrid_search`
- `verify_citation`
- `lookup_paragraph`
- `find_related_paragraphs`
- `list_laws`

## Engineering choices

- **Grounded:** outputs point back to inspectable sources.
- **Bounded:** professional actions stay behind human review.
- **Testable:** retrieval and citation failures become evaluation cases.
- **Composable:** APIs and MCP expose small legal primitives.
- **Honest:** unknown, stale or unsupported claims remain visible.

## Stack

`Python · FastAPI · React · TypeScript · BM25 · FAISS · embeddings · MCP · Pydantic · Zod · CI evals`

## Run locally

```bash
# Citizen interface
cd viewer
npm install
npm run dev

# MCP demonstration
python -m gitlaw_mcp.demo
```

More detail lives in [`wiki/`](wiki/), including architecture, development, privacy boundaries and roadmap.

## Current boundary

GitLaw is a substantial live prototype, not a security-certified legal SaaS product. Broader professional deployment still requires external security/privacy review, stronger operational controls and evaluation with qualified legal professionals on representative matters.

**GitLaw supports research and preparation. It does not replace legal advice or make final legal decisions.**

---

Built by [Michael Ninh](https://github.com/mikelninh) in Berlin. · [AGPL-3.0](LICENSE)
