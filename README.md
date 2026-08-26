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
| External benchmark families pinned | **3** |
| Full external benchmark runs claimable | **0 / 3** |
| Lawyer-approved German Gold | **0 / 500 strict target** |

**Important:** 53/53 measures citation-resolution cases, not complete legal-answer accuracy. The historical 20-question broad RAG run is preserved as a **failure baseline**, not hidden: Retrieval@1 = 0.25, Retrieval@3 = 0.55, Retrieval@5 = 0.65, while answer faithfulness/relevance were not meaningfully measured in that run.

## Evaluation first: reuse public ground truth

GitLaw does **not** rebuild a benchmark when a strong public benchmark already measures the same capability. Public benchmarks give external comparability; scarce lawyer-review time is reserved for German-law and law-firm-specific evidence.

```text
PUBLIC EXTERNAL BENCHMARKS
LegalBench-RAG · LegalBench · Legal RAG Bench
                ↓
         GERMAN LEGAL GOLD
   500 reviewed · 200 frozen target
                ↓
      ADVERSARIAL / SECURITY
          200-case target
                ↓
         LAW-FIRM SHADOW
          100 matters target
```

The three public benchmark families are pinned to explicit upstream revisions:

- **LegalBench-RAG** — retrieval comparability over legal contracts/privacy/M&A/NDA material; its character-span precision/recall scoring contract is implemented locally.
- **LegalBench** — external legal-reasoning comparability; task licenses must be checked individually.
- **Legal RAG Bench** — 100-question end-to-end RAG benchmark whose oracle/factorial methodology is used to separate retrieval failures from reasoning/context-use failures.

**Claim boundary:** these external benchmarks are not German-law accuracy. They complement — never replace — lawyer-reviewed German ground truth.

See [`docs/ypog/BENCHMARK_PYRAMID.md`](docs/ypog/BENCHMARK_PYRAMID.md) and [`evals/external/`](evals/external/).

## Strict production Legal AI proof

The proof package separates **engineering integrity**, **external benchmark evidence**, **German-law quality**, **agent safety** and **real-world usefulness**.

Run:

```bash
node scripts/ypog-proof-gate.mjs
node scripts/external-benchmark-gate.mjs
node scripts/german-gold-gate.mjs
```

Expected current outcome:

```text
engineering_gate: PASS
external benchmark registration: PASS
German Gold anti-inflation contract: PASS
legal_quality_release_gate: BLOCKED_PENDING_EXTERNAL_AND_LAWYER_EVIDENCE
```

That blocker is intentional. Green CI, a public benchmark score or a synthetic trace is not evidence of lawyer-grade German-law accuracy.

### GitLaw's deliberately strict 10/10 bar

A 10/10 claim requires all mandatory layers, including:

- **>=500** lawyer-reviewed German-law cases;
- **>=200** cases frozen as an unseen holdout before tuning;
- **>=12** distinct legal task families;
- **>=5** independent lawyer reviewers;
- critical-authority Recall@5 **>=97%** with **zero critical source omissions** on the release holdout;
- citation precision **>=99.5%**;
- unsupported material claims **<=0.2%**;
- correct abstention **>=98%**;
- **>=200** adversarial cases with zero P0 safety failures;
- zero cross-tenant leaks, approval bypasses, stale approvals accepted or autonomous consequential releases;
- **>=100** governed shadow matters comparing lawyer-alone vs GitLaw-assisted work;
- no increase in critical legal miss rate, plus measured time-to-review-ready and material-correction rate.

These are GitLaw's evidence criteria, **not YPOG requirements**.

## Eval Lab

The repo now contains:

- frozen historical and component baselines;
- pinned external benchmark manifest + evidence ledger;
- LegalBench-RAG-compatible character-span scorer;
- Oracle-vs-RAG failure decomposition;
- German Legal Gold schema + anti-inflation ledger;
- lawyer human-evaluation scorecard;
- machine-readable supervised-agent policy;
- adversarial case suite + execution ledger;
- multi-provider quality/latency/cost benchmark template;
- inspectable synthetic agent trace;
- CI gates that keep benchmark claims, safety boundaries and evidence status from silently drifting.

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

The next meaningful proof is not another feature. It is **executed external benchmarks + German lawyer-reviewed ground truth + adversarial evidence + governed shadow workflow evidence**.

---

Solo-built by [Michael Ninh](https://mikelninh.github.io/) in Berlin. · AGPL-3.0
