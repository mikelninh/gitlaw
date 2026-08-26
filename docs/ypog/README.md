# GitLaw × YPOG — Legal AI Proof Sprint

This package translates GitLaw/GitLaw Pro into evidence for a production-oriented Legal AI engineering role.

It is deliberately not a portfolio-only layer. Every public claim should point to one of:

1. executable code / architecture already present in GitLaw;
2. a frozen observed benchmark;
3. a pinned external benchmark;
4. a deterministic CI contract;
5. lawyer-reviewed German-law evidence;
6. an explicitly labelled synthetic demonstration.

## Current evidence map

| Capability | Evidence | Current status |
|---|---|---|
| hybrid RAG / retrieval | BM25 + semantic + graph retrieval | implemented; broad quality needs stronger evidence |
| external retrieval comparability | LegalBench-RAG | pinned; full run pending |
| external reasoning comparability | LegalBench | pinned; licensed task selection + model runs pending |
| retrieval-vs-reasoning decomposition | Legal RAG Bench methodology + local oracle runner | adapter implemented; full run pending |
| citation verification | deterministic citation-resolution suite | implemented; 53/53 is not end-to-end accuracy |
| German-law ground truth | German Gold schema + evidence ledger | **0 approved gold today** |
| structured evaluation | `evals/` + strict proof gates | implemented |
| multi-provider inference | OpenAI / Anthropic / Gemini gateway | implemented |
| quality / latency / cost selection | benchmark template + gateway telemetry | framework ready; real comparative benchmark pending |
| agentic workflows | supervised agent roles + tool calls | implemented architecture |
| LLMOps / observability | `agent_runs`, tool calls, cost, latency, iteration guards | implemented architecture |
| tenant isolation / RBAC | tenant-scoped data model + signed session roles | implemented architecture; dedicated penetration evidence still needed |
| red teaming | seed suite + execution ledger | partially executed; strict target >=200 adversarial cases |
| human evaluation | lawyer scorecard | protocol ready; independent lawyer evidence pending |
| document/OCR boundary | untrusted-document prompt boundary + tests | implemented partial defense; live adversarial file runs still needed |
| production legal quality | strict release criteria | **BLOCKED** pending external + lawyer + shadow evidence |

## Public benchmark strategy

Do not rebuild what strong public benchmarks already provide.

### LegalBench-RAG
Use for legal retrieval comparison. The pinned upstream benchmark reports 6,858 examples and character-span precision / recall. Its source datasets carry their own usage terms; do not blindly vendor the data.

### LegalBench
Use for external legal-reasoning comparison. It currently reports 162 tasks contributed by 40 contributors. It is a mixed-license collection, so task selection must follow each task's license.

### Legal RAG Bench
Use its 100-question / 4,876-passage setup and oracle/factorial methodology to separate retrieval failures from reasoning/context-use failures.

See [`BENCHMARK_PYRAMID.md`](BENCHMARK_PYRAMID.md) and `evals/external/benchmarks.json` for pinned upstream revisions and claim scopes.

**Critical claim boundary:** these benchmarks provide external comparability. None of them can be relabelled as German-law lawyer accuracy.

## Honest GitLaw baseline

The frozen historical 20-question run records:

- Retrieval@1: **0.25**
- Retrieval@3: **0.55**
- Retrieval@5: **0.65**
- answer faithfulness: **not meaningfully measured**
- answer relevance: **not meaningfully measured**

The fresh BM25-only diagnostic records Retrieval@5 = **0.05** on the same small seed. That is a component diagnostic, not the hybrid product score.

Run:

```bash
node scripts/ypog-proof-gate.mjs
node scripts/external-benchmark-gate.mjs
node scripts/german-gold-gate.mjs
```

Expected state today:

```text
engineering_gate: PASS
external benchmark registration: PASS
German Gold anti-inflation contract: PASS
legal_quality_release_gate: BLOCKED_PENDING_EXTERNAL_AND_LAWYER_EVIDENCE
```

## Strict 10/10 proof ladder

### P1 — engineering integrity
Existing tests, tenant isolation, deterministic citation checks, provider routing, dependency audit and agent bounds remain green.

### P2 — external benchmark layer
Run and publish failures on LegalBench-RAG, selected license-compatible LegalBench tasks and Legal RAG Bench. Record upstream revision, dataset snapshot, model snapshot and run time.

### P3 — German Legal Gold
Target **>=500 lawyer-reviewed cases**, including **>=200 frozen holdout cases**, >=12 task families and >=5 independent lawyer reviewers. Public/AI-generated candidates may help preparation but never count as gold before qualified review.

### P4 — retrieval tournament + oracle decomposition
Compare sparse, dense, hybrid and reranked retrieval. Target critical-authority Recall@5 >=97%, MRR >=0.90 and zero critical-source omissions on the release holdout. Use oracle-vs-RAG decomposition to identify whether retrieval or reasoning is limiting performance.

### P5 — claim-level legal quality
Target citation precision >=99.5%, unsupported material claims <=0.2%, zero critical claims contradicted by their cited source, >=95% lawyer acceptable without material correction and correct abstention >=98%.

### P6 — adversarial safety
Target >=200 adversarial cases. P0 outcomes are binary blockers: zero cross-tenant leaks, approval bypasses, autonomous consequential releases, stale approvals accepted or unbounded agent runs.

### P7 — model arena
Compare candidate models by route on quality, groundedness, abstention, latency, cost, structured-output reliability, privacy configuration and operational resilience. Choose the cheapest/fastest option only among models that pass the quality/privacy threshold.

### P8 — law-firm shadow study
Target >=100 governed shadow matters and >=5 independent lawyer reviewers. Compare lawyer-alone vs GitLaw-assisted time-to-review-ready, material correction rate, critical issue/source miss rate and trust calibration. Speed is only a win if safety does not regress.

## Release rule

A public benchmark score cannot compensate for weak German-law evidence. German-law accuracy cannot compensate for a confidentiality failure. Workflow speed cannot compensate for an unsupported material legal claim.

**10/10 means all mandatory layers pass.** Until then the system is explicitly pre-production evidence, not lawyer-grade autonomous Legal AI.

## Artifacts

- `evals/external/benchmarks.json`
- `evals/external/evidence_ledger.json`
- `evals/external/legalbenchrag_score.py`
- `evals/external/oracle_vs_rag.py`
- `evals/german_gold/schema.json`
- `evals/german_gold/manifest.json`
- `evals/ypog/baseline.json`
- `evals/ypog/release_criteria.json`
- `evals/ypog/red_team_cases.json`
- `evals/ypog/red_team_execution.json`
- `evals/ypog/agent_policy.json`
- `evals/ypog/agent_trace_example.json`
- `evals/ypog/model_benchmark.template.json`
- `docs/ypog/HUMAN_EVAL_SCORECARD.md`
- `scripts/ypog-proof-gate.mjs`
- `scripts/external-benchmark-gate.mjs`
- `scripts/german-gold-gate.mjs`

None of these documents represents an endorsement or requirement from YPOG. They are GitLaw's proposed evidence standard derived from the public role requirements.
