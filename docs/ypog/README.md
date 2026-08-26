# GitLaw × YPOG — Legal AI Proof Sprint

This package translates GitLaw/GitLaw Pro into evidence for a production-oriented Legal AI engineering role.

It is deliberately not a portfolio-only layer. Every public claim should point to one of:

1. code / architecture already present in GitLaw;
2. a frozen observed benchmark;
3. a deterministic CI contract;
4. a lawyer-reviewed benchmark result;
5. an explicitly labelled synthetic demonstration.

## Current evidence map

| YPOG-style capability | GitLaw evidence | Current status |
|---|---|---|
| hybrid RAG / retrieval | BM25 + semantic + graph retrieval | implemented; broad quality needs improvement |
| citation verification | deterministic citation-resolution suite | implemented; 53/53 is not end-to-end accuracy |
| structured evaluation | `evals/` + YPOG proof gate | implemented |
| multi-provider inference | OpenAI / Anthropic / Gemini gateway | implemented |
| quality / latency / cost selection | benchmark template + gateway telemetry | framework ready; real comparative benchmark pending |
| agentic workflows | supervised agent roles + tool calls | implemented architecture |
| LLMOps / observability | `agent_runs`, tool calls, cost, latency, iteration guards | implemented architecture |
| tenant isolation / RBAC | tenant-scoped data model + session roles | implemented architecture |
| red teaming | 20-case seed suite | seed only; execution against running system pending |
| human evaluation | lawyer scorecard | protocol ready; external lawyer evidence pending |
| document/OCR pipeline | agent role + quality policy | partial / needs stronger executable proof |
| production legal quality | release criteria | **BLOCKED** pending lawyer-reviewed benchmark |

## Honest baseline

The frozen historical 20-question run records:

- Retrieval@1: **0.25**
- Retrieval@3: **0.55**
- Retrieval@5: **0.65**
- answer faithfulness: **not meaningfully measured**
- answer relevance: **not meaningfully measured**

That is a failure baseline, not a production-readiness claim.

Run:

```bash
node scripts/ypog-proof-gate.mjs
```

The expected state today is:

```text
engineering_gate: PASS
legal_quality_release_gate: BLOCKED_PENDING_LAWYER_REVIEWED_BENCHMARK
```

## Target proof ladder

### P1 — integrity
Existing unit/integration tests, tenant isolation, deterministic citation checks, provider routing and audit contracts remain green.

### P2 — frozen broad retrieval baseline
Historical weaknesses are preserved as observed evidence.

### P3 — lawyer-reviewed ground truth
Create >=100 frozen cases across >=8 categories with expected issues, sources, missing facts, acceptable outcomes and abstention conditions.

### P4 — answer + evidence quality
Measure source recall, citation precision, unsupported material claims, issue spotting, missing-fact detection, abstention and lawyer correction burden.

### P5 — adversarial safety
Execute the red-team suite against a running deployment; critical violations must be zero.

### P6 — model routing benchmark
Compare candidate models by route on quality, latency, cost, structured-output reliability, privacy configuration and operational resilience.

### P7 — realistic matter workflow
Run anonymised/synthetic realistic documents through intake → research → change impact → draft → lawyer review → receipt/audit.

### P8 — external legal review
Independent legal professionals review failure taxonomy, thresholds and cases. Their disagreement remains evidence, not something to smooth away.

## Release rule

Do not market GitLaw Pro as lawyer-grade production Legal AI merely because CI is green. Engineering integrity and legal-quality evidence are separate gates.

## Artifacts

- `evals/ypog/baseline.json`
- `evals/ypog/release_criteria.json`
- `evals/ypog/red_team_cases.json`
- `evals/ypog/agent_policy.json`
- `evals/ypog/agent_trace_example.json`
- `evals/ypog/model_benchmark.template.json`
- `docs/ypog/HUMAN_EVAL_SCORECARD.md`
- `scripts/ypog-proof-gate.mjs`

None of these documents represents an endorsement or requirement from YPOG. They are GitLaw's proposed evidence standard derived from the public role requirements.
