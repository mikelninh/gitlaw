# GitLaw ⚖️

**Source-grounded legal AI across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: the likely issue, missing facts, relevant paragraphs, uncertainty and a practical next step.

**[Try GitLaw →](https://mikelninh.github.io/gitlaw/)** · [Research workspace](https://mikelninh.github.io/gitlaw/#/research) · [Mietrecht pilot](https://mikelninh.github.io/gitlaw/#/mietrecht) · **[GitLaw Pro playground](https://mikelninh.github.io/gitlaw/#/pro-demo)**

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
- **GitLaw Pro playground** — 8 synthetic matters across multiple practice areas with facts, tasks, documents, research, source review, drafts, human review gates and local audit replay
- **Authenticated Pro pilot** — separate from the public playground; real pilot boundaries remain protected
- **MCP + APIs** — legal search, lookup and citation-verification tools for agents

Mietrecht is the first deeper vertical, **not GitLaw’s product boundary**.

## Release assurance

GitLaw does not use “build succeeded” as a synonym for “product works.” Different surfaces have different proof levels:

| Surface / risk | Automated proof |
| --- | --- |
| Public Pro playground | Browser E2E: search/filter → document review → source review → research → draft → blocked review gate → explicit human resolution → local release → audit |
| Mobile Pro demo | Browser regression asserts **no horizontal overflow at 390 px** |
| Law-firm pilot | Edge-case suite + assistant-console HTTP E2E + document-ground-truth, portal-navigation and agent-capability contracts |
| Pilot privacy / authority | Fail-closed tests for identifiers, secrets, productive access, execution tools, consent, professional secrecy and final lawyer authority |
| Citation integrity | Citation-resolution regression preserved in pilot CI and MCP evals |
| Viewer | TypeScript/Vite production build + cross-domain routing regressions |
| MCP server | Dedicated MCP CI plus optional Fly deployment; missing deployment credentials must skip cleanly rather than produce a false-red release |

The law-firm pilot edge cases deliberately include malformed German CSV, duplicate case IDs, unsupported office-file uploads, missing reviewers, non-lawyer final reviewers, missing consent/approval gates, PII/secrets, consequential action requests, excessive retention, incomplete/duplicate reviews, unsupported claims, broken citations and unverified ROI baselines.

Key workflows:

- `.github/workflows/viewer-ci.yml`
- `.github/workflows/pro-demo-e2e.yml`
- `.github/workflows/law-firm-pilot-ci.yml`
- `.github/workflows/mcp-ci.yml`

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

The core principle is simple: **retrieval, evidence and verification should remain inspectable separately from generation.**

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

The public Pro browser E2E runs in GitHub Actions because it installs a pinned Chromium harness and exercises the built viewer as a user would.

## Run the MCP demo

```bash
python -m gitlaw_mcp.demo
```

## Boundary

GitLaw assists research and preparation. It does **not** replace qualified legal advice or make consequential legal decisions autonomously.

The next meaningful proof is broader evaluation with legal professionals on anonymised matters — not simply adding more features.

---

Solo-built by [Michael Ninh](https://mikelninh.github.io/) in Berlin. · AGPL-3.0
