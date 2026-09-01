# GitLaw ⚖️

**Source-grounded legal AI across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: relevant source paragraphs, a bounded answer, visible uncertainty and a practical next step.

**[Try the recruiter-first live proof →](https://mikelninh.github.io/gitlaw/)**

## In 20 seconds

```text
question
   ↓
exact + BM25 + semantic retrieval
   ↓
paragraph / citation graph
   ↓
deterministic source resolution
   ↓
structured answer + uncertainty
   ↓
human-reviewable next step
```

The key idea is not “AI writes legal text.” It is that **retrieval, evidence and verification remain inspectable separately from generation.**

## What it proves

- hybrid retrieval across the German federal-law corpus;
- paragraph-level source links and cross-reference structure;
- deterministic citation resolution;
- structured outputs with visible uncertainty;
- APIs and MCP tools for agent workflows;
- human-review boundaries for consequential legal work;
- regression tests that turn discovered failures into permanent checks.

## Proof at a glance

| Signal | Current repository claim |
| --- | ---: |
| Federal laws indexed | **5,936** |
| Paragraph / graph nodes | **94,178** |
| Cross-references | **200,464** |
| FAISS vectors | **98,367** |
| Citation-resolution eval | **53 / 53** |

**Important:** 53/53 measures citation-resolution regression cases, not complete legal-answer accuracy.

## Public proof vs. deeper product work

The public page is intentionally simplified for a recruiter or hiring manager: **question → sources → answer preview → why it matters → technical depth**.

The repository contains deeper work around research workflows, Mietrecht, law-firm pilot boundaries, authenticated/professional surfaces, MCP/API capabilities and release assurance. Those layers are engineering evidence, not claims that a synthetic public demo equals production legal software.

## Release assurance

GitLaw does not use “build succeeded” as a synonym for “product works.” Different surfaces have different proof levels:

| Surface / risk | Automated proof |
| --- | --- |
| Public / demo workflows | Browser and routing regressions for the user-facing research flow |
| Mobile demo | Regression checks for narrow layouts |
| Law-firm pilot | Edge-case suite + assistant-console HTTP E2E + document-ground-truth, portal-navigation and agent-capability contracts |
| Pilot privacy / authority | Fail-closed tests for identifiers, secrets, productive access, execution tools, consent, professional secrecy and final lawyer authority |
| Citation integrity | Citation-resolution regression preserved in pilot CI and MCP evals |
| Viewer | TypeScript/Vite production build + cross-domain routing regressions |
| MCP server | Dedicated MCP CI plus optional deployment; missing deployment credentials must skip cleanly rather than produce a false-red release |

The law-firm pilot edge cases deliberately include malformed German CSV, duplicate case IDs, unsupported office-file uploads, missing reviewers, non-lawyer final reviewers, missing consent/approval gates, PII/secrets, consequential action requests, excessive retention, incomplete/duplicate reviews, unsupported claims, broken citations and unverified ROI baselines.

### What is **not** proven

- complete legal-answer accuracy across German law;
- production reliability for every law-firm system/vendor;
- that a synthetic public demo is equivalent to a real law-firm pilot;
- autonomous consequential legal action — GitLaw intentionally keeps that outside model authority.

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

## Stack

**Python · FastAPI · React · TypeScript · BM25 · FAISS · embeddings · MCP · Pydantic · Zod · CI evals**

## Run the key proofs

```bash
# Core/package tests
npm test

# Law-firm pilot edge cases
node --test pilot/law-firm/core.test.mjs

# Viewer build
npm install --prefix viewer
npm run build --prefix viewer

# MCP citation regression
python -m gitlaw_mcp.tests.test_eval
```

## Run the MCP demo

```bash
python -m gitlaw_mcp.demo
```

## Boundary

GitLaw assists research and preparation. It does **not** replace qualified legal advice or make consequential legal decisions autonomously.

The next meaningful proof is broader evaluation with legal professionals on anonymised matters — not simply adding more features.

---

Solo-built by [Michael Ninh](https://mikelninh.github.io/product-architect/) in Berlin. · AGPL-3.0
