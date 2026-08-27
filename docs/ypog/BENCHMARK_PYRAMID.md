# GitLaw Benchmark Pyramid

GitLaw does not build a proprietary benchmark when a strong public benchmark already measures the same capability. Public benchmarks provide **external comparability**; scarce lawyer time is reserved for **German-law and law-firm-specific ground truth**.

## Layer 1 — public external benchmarks

### LegalBench-RAG

Purpose: retrieval over legal contracts / privacy / M&A / NDA material.

Use it for:
- retrieval precision / recall;
- character-level retrieval quality;
- comparing chunking, embeddings, hybrid retrieval and reranking.

Do **not** use it to claim German-law accuracy. The code is MIT, while the benchmark is generated from ContractNLI, CUAD, MAUD and PrivacyQA; source-dataset usage terms must be respected individually.

Pinned upstream: `zeroentropy-ai/legalbenchrag@431bc8f2488a81569ab7259fa633dcc50ab77f9a`.

### LegalBench

Purpose: legal reasoning tasks contributed by legal and computational experts.

Use it for:
- issue spotting;
- rule recall / application;
- interpretation;
- task-specific reasoning evaluation.

LegalBench is a mixed-license collection. Only compatible tasks may be used, and each task's license must be recorded. A LegalBench result is external reasoning evidence, not German-law production evidence.

Pinned upstream: `HazyResearch/legalbench@b46bf4ffae90524b2b72aaa30e7745fe9db64481`.

### Legal RAG Bench

Purpose: end-to-end RAG evaluation and retrieval-vs-reasoning decomposition.

Use it for the factorial/oracle methodology:

```text
same question
   ├── gold / oracle passage → generator → oracle correctness
   └── retrieved passages    → generator → RAG correctness
```

This allows failures to be classified as retrieval ceiling, reasoning/context-use failure, or task/model ceiling instead of calling every bad answer a hallucination.

Pinned upstream: `isaacus-dev/legal-rag-bench@9e30a36d1ef58cd35ec4ed724ef3e5edc6b0d00b`.

## Layer 2 — German Legal Gold

External English/Australian/US-oriented benchmarks cannot answer whether GitLaw is reliable on German legal work.

Strict target:
- >=500 lawyer-reviewed German-law cases;
- >=200 cases frozen before model/retrieval tuning;
- >=12 task families;
- >=5 independent lawyer reviewers across the program;
- public or synthetic candidates may be prepared by AI, but **unreviewed candidates never count as gold**.

Each gold case should contain facts, task, critical issues, critical authorities, acceptable alternatives, missing facts, correct abstention behavior, temporal scope, claim-level support labels and reviewer provenance.

## Layer 3 — adversarial and security evidence

Strict target: >=200 adversarial cases, with **zero P0 failures** for cross-tenant disclosure, approval bypass, autonomous consequential release, stale approval acceptance and escaped agent bounds.

A written policy is not an executed test. The red-team ledger distinguishes `EXECUTED`, `PARTIAL`, `POLICY_ONLY` and `PENDING`.

## Layer 4 — law-firm shadow evidence

Strict target:
- >=100 governed shadow matters;
- >=5 independent lawyer reviewers;
- lawyer-alone vs GitLaw-assisted comparison;
- time-to-review-ready;
- material correction rate;
- critical issue / authority miss rate;
- trust calibration;
- no weakening of required review or confidentiality controls.

## 10/10 means all layers pass

A strong external benchmark score cannot compensate for weak German-law evidence. A strong German-law benchmark cannot compensate for a tenant leak. A fast workflow cannot compensate for materially wrong legal analysis.

The release gate therefore remains blocked until **all mandatory layers** have evidence.
