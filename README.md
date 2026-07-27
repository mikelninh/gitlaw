# GitLaw ⚖️

**Verified legal research and workflow infrastructure grounded in 5,936 German federal laws.**

GitLaw helps citizens and legal professionals find the relevant source, inspect why it was retrieved and notice when the system is uncertain. It combines hybrid retrieval, a paragraph-level citation graph, deterministic citation checks, APIs, MCP tools and human-reviewable workflows.

[![Citation resolution eval: 53/53](https://img.shields.io/badge/citation_resolution-53%2F53-brightgreen)](gitlaw_mcp/tests/cases.json)
[![MCP CI](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml/badge.svg)](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

## Explore

| Surface | Link | Honest status |
| --- | --- | --- |
| **Citizen app** | [Live app](https://gitlaw-xi.vercel.app/) · [GitHub Pages](https://mikelninh.github.io/gitlaw/) | Public research interface |
| **Source code** | [GitHub repository](https://github.com/mikelninh/gitlaw) | Public, AGPL-3.0 |
| **GitLaw Pro** | Closed-beta workflow tier | Pilot, not general production |
| **MCP server** | [`gitlaw_mcp/`](gitlaw_mcp/) | Working stdio and HTTP/SSE tools |
| **Architecture** | [`wiki/Architecture.md`](wiki/Architecture.md) | Technical design and boundaries |
| **Roadmap** | [`wiki/Roadmap.md`](wiki/Roadmap.md) | Current next steps and go-live gates |

## Current state — July 2026

| Area | What works today | Boundary |
| --- | --- | --- |
| **Legal corpus** | 5,936 federal laws, paragraph-level normalization and cross-reference graph | Federal corpus only; source freshness must remain monitored |
| **Research** | Exact lookup, BM25, semantic retrieval and related-paragraph navigation | Retrieval support, not legal advice |
| **Citation verification** | Generated paragraph references can be resolved against the local corpus | `53/53` measures citation resolution cases, **not complete legal-answer accuracy** |
| **Citizen experience** | Public search and explanation interface, with multiple UI languages | Explanations require source inspection and may still be incomplete |
| **MCP and APIs** | Six legal search and verification tools | Consumers must preserve uncertainty and source metadata |
| **GitLaw Pro** | Case checklists, document handling, deadlines, templates, exports and audit-oriented workflows | Closed beta; no claim of mature enterprise deployment |
| **Security and operations** | Signed-session and role-boundary architecture exists | External security review, penetration testing and operational hardening remain open |

> **Portfolio claim:** GitLaw is a substantial, live and testable solo-built system with a real pilot context. It is not yet a security-certified, scaled legal SaaS product.

## Proof at a glance

| Metric | Current repository claim |
| --- | ---: |
| Federal laws indexed | **5,936** |
| Paragraph / graph nodes | **94,178** |
| Cross-references | **200,464** |
| FAISS vectors | **98,367** |
| Hand-labelled citation-resolution cases passing | **53/53** |
| Curated high-court principles | **40** |
| Searchable decisions via OpenLegalData | **150K+** |

Metrics are useful only when they support a real workflow. The important question is whether a user can reach the right source, understand what is known and see when the system cannot verify a claim.

## What the product does

A professional workflow can move through GitLaw like this:

1. Open or import a matter.
2. Load the relevant checklist and required-document structure.
3. Extract text from supplied documents.
4. Research the issue with hybrid retrieval and graph navigation.
5. Resolve every cited paragraph against the corpus.
6. Prepare an editable status update or document.
7. Require qualified human review before external use.
8. Record the action and supporting evidence.

GitLaw assists research and preparation. It does **not** make final legal decisions or communicate externally without review.

## Architecture

```text
German federal laws + case-law sources
               │
               ▼
      ingestion + normalization
               │
       ┌───────┴────────┐
       ▼                ▼
 BM25 / exact      FAISS vectors
 retrieval         semantic search
       └───────┬────────┘
               ▼
        hybrid ranker
               │
       citation graph lookup
               │
               ▼
      local citation verifier
               │
       ┌───────┴────────┐
       ▼                ▼
 citizen interface   Pro workflows
 React / TypeScript  cases / exports
       │                │
       └───────┬────────┘
               ▼
       MCP tools + APIs + audit
```

Core choices:

- Retrieval is inspectable separately from generation.
- Citation verification is local and deterministic.
- Structured outputs constrain workflow states.
- Missing, unknown and superseded sources remain visible.
- Professional outputs stay behind human review.

## MCP tools

- `search_laws`
- `hybrid_search`
- `verify_citation`
- `lookup_paragraph`
- `find_related_paragraphs`
- `list_laws`

Run the API-key-free demonstration:

```bash
python -m gitlaw_mcp.demo
```

See [`gitlaw_mcp/README.md`](gitlaw_mcp/README.md) for setup and schemas.

## What I personally owned

I took GitLaw from an open-ended problem to a live system and made the main product and engineering decisions across:

- corpus ingestion and paragraph normalization;
- BM25 + FAISS hybrid retrieval;
- citation graph construction;
- deterministic citation verification;
- MCP contracts and transports;
- FastAPI / serverless boundaries;
- React and TypeScript interfaces;
- evaluations and CI checks;
- auditability, privacy and human-review boundaries;
- multiple deployment paths.

I have not yet led a mature enterprise rollout or large engineering team. GitLaw demonstrates end-to-end ownership of a substantial product while keeping the remaining gaps explicit.

## Next milestones

1. **Pilot evaluation:** measure task success and citation usefulness with legal professionals on anonymized matters.
2. **Authorization hardening:** expand tenant-isolation and role-boundary tests.
3. **Operational readiness:** monitoring, incident procedures, deletion workflows and backup validation.
4. **Independent review:** external privacy/security review and penetration test before broader professional use.
5. **Evidence quality:** grow the retrieval and answer-evaluation corpus beyond citation resolution alone.

The detailed plan and go-live gates live in [`wiki/Roadmap.md`](wiki/Roadmap.md).

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 · TypeScript · Vite · Tailwind |
| Retrieval | BM25 · FAISS · embeddings |
| Backend | FastAPI · serverless functions · Redis |
| Agent interfaces | MCP · structured tool schemas |
| Validation | Pydantic / JSON Schema · Zod |
| Knowledge graph | 94K paragraph nodes · 200K references |
| Deployment | GitHub Pages · Vercel · Fly.io · AWS reference path |
| Reliability | CI evals · structured logs · retries · cost and latency tracking |

## Run locally

```bash
# Citizen interface
cd viewer
npm install
npm run dev

# API and Pro workflows
npx vercel dev

# MCP demonstration
python -m gitlaw_mcp.demo
```

Full instructions: [`wiki/Development.md`](wiki/Development.md)

## Production gates

Before broader professional deployment, GitLaw still requires:

- external security and privacy review;
- penetration testing;
- hardened multi-tenant authorization tests;
- operational monitoring and incident procedures;
- broader evaluation with qualified legal professionals;
- clear contractual and data-processing agreements.

GitLaw is a research and workflow tool. **It does not replace legal advice.** Professional outputs require review by a qualified lawyer.

## Documentation

- [Architecture](wiki/Architecture.md)
- [Feature reference](wiki/Features.md)
- [Privacy and legal boundaries](wiki/Legal-and-Privacy.md)
- [Development guide](wiki/Development.md)
- [Roadmap](wiki/Roadmap.md)
- [Changelog](CHANGELOG.md)

Solo-built by [Michael Ninh](https://github.com/mikelninh) in Berlin.

## License

[AGPL-3.0](LICENSE)
