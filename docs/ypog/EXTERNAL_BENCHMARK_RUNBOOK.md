# External Benchmark Runbook

This runbook defines how GitLaw uses third-party legal benchmarks without silently changing revisions, licenses or claim scope.

## Global rules

For every run, record:

- benchmark id;
- pinned upstream repository commit;
- dataset revision/hash when available;
- task/subset selection;
- applicable dataset/task license;
- GitLaw commit;
- retriever / embedding / reranker configuration;
- model provider + exact model identifier when generation is involved;
- runtime date/time;
- latency and cost where applicable;
- complete per-case output or failure classification;
- aggregate metrics;
- claim scope.

Never replace the pinned revision merely because upstream `main`/`master` changed. Review and intentionally update the manifest.

## LegalBench-RAG

Pinned code: `zeroentropy-ai/legalbenchrag@431bc8f2488a81569ab7259fa633dcc50ab77f9a`

Upstream data is generated from ContractNLI, CUAD, MAUD and PrivacyQA. Confirm each source dataset's usage terms before downloading/regenerating benchmark data. Do not commit source-derived corpus/benchmark files to GitLaw by default.

GitLaw provides `evals/external/legalbenchrag_score.py`, which implements the pinned benchmark's character-span overlap precision/recall contract for retrieval output.

Required result metadata:

```json
{
  "benchmark": "legalbench-rag",
  "upstream_commit": "431bc8f2488a81569ab7259fa633dcc50ab77f9a",
  "dataset_snapshot": "...",
  "retriever": "...",
  "avg_precision": 0.0,
  "avg_recall": 0.0,
  "claim_scope": "external retrieval comparability only"
}
```

## LegalBench

Pinned code/data tree: `HazyResearch/legalbench@b46bf4ffae90524b2b72aaa30e7745fe9db64481`

LegalBench is a mixed-license task collection. Before selecting a task:

1. inspect the task README/source;
2. record the task's license/source license;
3. confirm it is compatible with the intended evaluation use;
4. pin the task data to the benchmark commit;
5. record task-specific scoring logic.

Do not produce one aggregate `LegalBench accuracy` that hides task composition. Report per task/family plus an explicitly defined aggregate if useful.

## Legal RAG Bench

Pinned code: `isaacus-dev/legal-rag-bench@9e30a36d1ef58cd35ec4ed724ef3e5edc6b0d00b`

Dataset: `isaacus/legal-rag-bench`, `corpus` and `qa` test subsets. The dataset card is authoritative for current dataset-use terms; record the observed license metadata at run time.

API-key-free lexical diagnostic:

```bash
pip install -r rag/requirements.txt
python evals/external/run_legal_rag_bench_bm25.py --json-out legal-rag-bench-bm25.json
```

This executes 100 questions against all 4,876 passages and reports Hit@1/5/10 and MRR. It is deliberately labelled `EXTERNAL_BM25_RETRIEVAL_DIAGNOSTIC`: it is not GitLaw hybrid retrieval and not the benchmark's full end-to-end RAG result.

For the full benchmark, preserve the upstream factorial structure and record the embedding model, generative model, judge, `k`, prompt, provider revision/date and output rows. Use `evals/external/oracle_vs_rag.py` to convert already-scored RAG/oracle outcomes into failure classes.

## Failure accounting

A failed setup/run is evidence too. Classify it separately from model quality:

- `DATA_ACCESS_FAILURE`
- `LICENSE_REVIEW_BLOCKED`
- `DEPENDENCY_FAILURE`
- `PROVIDER_FAILURE`
- `RETRIEVAL_FAILURE`
- `REASONING_OR_CONTEXT_USE_FAILURE`
- `TASK_OR_MODEL_CEILING`
- `EVALUATION_PIPELINE_FAILURE`

Do not delete or hide a bad run merely because a later version improves.

## Relationship to German Gold

External results never increment `evals/german_gold/manifest.json`. Only qualified human review can change a case to `approved_gold`, and holdout cases must be frozen before tuning against their outcomes.
