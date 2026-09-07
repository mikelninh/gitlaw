# GitLaw ⚖️

**Source-grounded legal research across 5,936 German federal laws.**

GitLaw turns an unstructured legal question into something a person can inspect: relevant paragraphs, a bounded answer, visible uncertainty and the next research step.

**[Try the live proof →](https://mikelninh.github.io/gitlaw/)** · **[Agent Security Gauntlet →](https://mikelninh.github.io/gitlaw/security/)**

> The point is not “AI writes legal text.” The point is that **retrieval, evidence and verification remain inspectable separately from generation.**

## The workflow

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

## What is implemented

- one canonical application retrieval service in `rag/retrieval.py`
- hybrid retrieval by default: FAISS dense + BM25, fused with Reciprocal Rank Fusion
- paragraph-level source links and cross-reference structure
- deterministic citation resolution
- structured outputs with visible uncertainty
- APIs and MCP tools for agent workflows
- human-review boundaries for consequential legal work
- deterministic agent security control plane outside the model
- regression tests that turn discovered failures into permanent checks

The CLI and FastAPI surface both use the same canonical retrieval service so retrieval behaviour cannot silently drift between demos and application code.

## Proof at a glance

| Signal | Current repository evidence |
| --- | ---: |
| Federal laws indexed | **5,936** |
| Paragraph / graph nodes | **94,178** |
| Cross-references | **200,464** |
| FAISS vectors | **98,367** |
| Citation-resolution regression | **53 / 53** |
| Agent-security golden cases | **50** |

**53/53 is a citation-resolution regression set, not a claim of complete legal-answer accuracy.**

A separate small grounding benchmark in `rag/eval/` checks whether representative legal questions retrieve the expected statutory provision. It deliberately reports retrieval grounding only; semantic legal-answer quality still requires human-labelled evaluation.

## Agent security: assume the model can be manipulated

GitLaw does not rely on the LLM to police its own authority. The security proof asks whether manipulated model output can cross deterministic boundaries and create impact.

```text
untrusted user / PDF / RAG / tool / peer agent
                    ↓
                 model
          (assume compromise)
                    ↓
       deterministic control plane
 auth → tenant → role → capability → scope
       → provenance → approval → budget
                    ↓
          allow / block / review
```

The **Agent Security Gauntlet** contains 50 inspectable adversarial golden cases mapped across all ten OWASP Top 10 for Agentic Applications 2026 categories. CI fails if a case no longer matches its expected policy outcome; the highest-priority invariant is **zero critical impact escapes**.

Examples include indirect prompt injection in documents, poisoned RAG context, tool misuse, cross-tenant access, privilege abuse, secret/system-prompt extraction, invented execution tools, compromised peer agents and runaway tool loops.

See [`security/THREAT_MODEL.md`](security/THREAT_MODEL.md) for the exact claims, residual gaps and methodology. This is an engineering proof, **not** a certification or claim of complete production security.

## Why the architecture matters

```text
German federal-law corpus
          ↓
ingest + normalize
          ↓
BM25 / exact / FAISS
          ↓
canonical hybrid ranker
          ↓
paragraph graph lookup
          ↓
local citation verifier
          ↓
React UI + APIs + MCP
```

A generated answer is never the sole source of truth. The system keeps the source layer independently inspectable so errors can be found, reproduced and turned into tests.

## Release assurance

Different surfaces have different proof levels:

- public research flow → browser/routing regressions
- mobile demo → narrow-layout regression checks
- canonical retrieval → offline contract tests + explicit hybrid default
- citation integrity → dedicated resolution evals
- MCP → dedicated CI and typed contracts
- agent security → adversarial golden cases + deterministic policy gate + CI evidence report
- law-firm pilot work → edge cases, capability contracts and explicit professional authority

The repository deliberately tests malformed inputs, duplicate cases, unsupported uploads, missing reviewers, PII/secrets, consequential-action requests, broken citations and other failure modes.

## What is not proven

- complete legal-answer accuracy across German law
- production reliability for every law-firm system/vendor
- that prompt injection can always be detected
- complete production security or third-party dependency integrity
- that a synthetic public demo equals a real law-firm pilot
- autonomous consequential legal action

GitLaw assists research and preparation. **Qualified human authority remains final.**

## Stack

**Python · FastAPI · React · TypeScript · BM25 · FAISS · embeddings · MCP · Pydantic · Zod · CI evals**

## Run the key proofs

```bash
npm test
npm run security:test
npm run security:report
node --test pilot/law-firm/core.test.mjs
npm install --prefix viewer
npm run build --prefix viewer
python -m gitlaw_mcp.tests.test_eval
python -m unittest rag.tests.test_retrieval
python -m rag.eval.run_grounding_benchmark
```

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin. · AGPL-3.0
