import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
const sha40 = /^[0-9a-f]{40}$/

const manifest = readJson('evals/external/benchmarks.json')
const ledger = readJson('evals/external/evidence_ledger.json')
const externalBaseline = readJson('evals/external/results/legal_rag_bench_bm25_20260826.json')
const semanticBaseline = readJson('evals/external/results/legal_rag_bench_retrieval_smoke_20260826.json')
const criteria = readJson('evals/ypog/release_criteria.json')

assert(manifest.schema_version === '1.1', 'External benchmark manifest schema drifted')
assert(Array.isArray(manifest.benchmarks) && manifest.benchmarks.length === 3, 'Expected exactly three pinned external benchmark families')
const byId = new Map(manifest.benchmarks.map(b => [b.id, b]))
for (const id of ['legalbench-rag', 'legalbench', 'legal-rag-bench']) {
  assert(byId.has(id), `Missing external benchmark: ${id}`)
  const b = byId.get(id)
  assert(sha40.test(b.upstream_commit), `${id} must pin a 40-char upstream commit SHA`)
  assert(b.counts_for_german_legal_release_gate === false, `${id} must not count as German-law product ground truth`)
  assert(String(b.gitlaw_claim_scope).includes('only'), `${id} claim scope must stay explicitly limited`)
}

const lbr = byId.get('legalbench-rag')
assert(lbr.reported_examples === 6858, 'LegalBench-RAG reported example count changed')
assert(lbr.code_license === 'MIT', 'LegalBench-RAG code license expectation changed')
assert(lbr.data_license_policy === 'INHERITED_PER_SOURCE_DATASET', 'LegalBench-RAG source-data license guard missing')
assert(lbr.data_sources.length === 4, 'LegalBench-RAG source inventory incomplete')

const lb = byId.get('legalbench')
assert(lb.reported_tasks === 162, 'LegalBench task count changed')
assert(lb.data_license_policy === 'FOLLOW_EACH_TASK_LICENSE', 'LegalBench per-task license guard missing')

const lrgb = byId.get('legal-rag-bench')
assert(lrgb.reported_questions === 100 && lrgb.reported_passages === 4876, 'Legal RAG Bench cardinality changed')
assert(lrgb.code_license === 'MIT', 'Legal RAG Bench code license expectation changed')
assert(sha40.test(lrgb.dataset_revision), 'Legal RAG Bench dataset snapshot must be pinned')
assert(lrgb.dataset_license_metadata === 'cc-by-nc-sa-4.0', 'Legal RAG Bench conservative license metadata changed')
assert(lrgb.license_metadata_conflict === true, 'Legal RAG Bench license conflict must remain visible')
assert(lrgb.commercial_use_status === 'BLOCKED_PENDING_LICENSE_CLARIFICATION', 'Commercial reuse must remain blocked pending clarification')

assert(/^1\.\d+$/.test(ledger.schema_version), 'External evidence ledger must remain schema major 1')
assert(ledger.summary.registered === 3, 'External evidence ledger must cover all registered benchmark families')
assert(ledger.summary.component_runs_completed >= 3, 'Expected BM25, semantic retrieval and LegalBench slice evidence')
assert(ledger.summary.full_runs_completed === 0, 'Do not claim a full external suite until actually executed')
assert(ledger.summary.external_full_suite_scores_claimable === 0, 'No full external suite score is claimable yet')

const lbEvidence = ledger.benchmarks.legalbench
assert(lbEvidence.component_run?.status === 'EXECUTED_FOUR_TASK_OPEN_BASELINE_SLICE', 'LegalBench executed slice evidence missing')
assert(lbEvidence.component_run?.github_actions_run_id === 32977330014, 'LegalBench frozen run id drifted')
assert(lbEvidence.component_run?.artifact_id === 9610142063, 'LegalBench frozen artifact id drifted')
assert(lbEvidence.component_run?.model_role === 'OPEN_BASELINE_HARNESS_PROOF_NOT_GITLAW_PRODUCT_MODEL', 'LegalBench baseline must not be relabeled as product quality')
assert(lbEvidence.component_run?.n_tasks === 4 && lbEvidence.component_run?.n_test_total === 2677, 'LegalBench slice cardinality drifted')
assert(lbEvidence.full_run === 'PENDING_FULL_162_TASK_EXECUTION', 'Four-task slice must not be called full LegalBench')

const lrgbRuns = ledger.benchmarks['legal-rag-bench'].component_runs
assert(Array.isArray(lrgbRuns), 'Legal RAG Bench component evidence must be an array')
assert(lrgbRuns.some(r => r.type === 'BM25_RETRIEVAL_DIAGNOSTIC'), 'Executed BM25 evidence missing')
assert(lrgbRuns.some(r => r.type === 'GENERAL_SEMANTIC_RETRIEVAL_TOURNAMENT'), 'Executed semantic retrieval evidence missing')
assert(ledger.benchmarks['legal-rag-bench'].legal_contract_reranker_challenger?.score === null, 'Failed-to-load challenger must not acquire a fake score')
assert(ledger.benchmarks['legal-rag-bench'].legal_contract_reranker_challenger?.status === 'BLOCKED_ONNX_ONLY_STANDARD_CROSSENCODER_LOAD', 'Reranker load blocker must remain explicit')

assert(externalBaseline.status === 'OBSERVED_EXTERNAL_COMPONENT_BASELINE', 'External BM25 result must remain observed')
assert(externalBaseline.dataset_revision === lrgb.dataset_revision, 'External result dataset revision drifted')
assert(externalBaseline.n_questions === 100 && externalBaseline.n_passages === 4876, 'External baseline cardinality drifted')
assert(externalBaseline.metrics.hit_at_1 === 0.14, 'External BM25 Hit@1 changed')
assert(externalBaseline.metrics.hit_at_5 === 0.30, 'External BM25 Hit@5 changed')
assert(externalBaseline.metrics.hit_at_10 === 0.31, 'External BM25 Hit@10 changed')
assert(Math.abs(externalBaseline.metrics.mrr - 0.21812319724933016) < 1e-15, 'External BM25 MRR changed')

assert(semanticBaseline.status === 'OBSERVED_EXTERNAL_RETRIEVAL_TOURNAMENT_BASELINE', 'Semantic tournament status drifted')
assert(semanticBaseline.dataset_revision === lrgb.dataset_revision, 'Semantic tournament dataset revision drifted')
const winner = semanticBaseline.metrics?.hybrid_general_rrf
const reranked = semanticBaseline.metrics?.hybrid_general_reranked
assert(winner?.hit_at_10 === 0.43, 'Frozen hybrid RRF Hit@10 changed')
assert(Math.abs(winner?.mrr - 0.2550817454048586) < 1e-15, 'Frozen hybrid RRF MRR changed')
assert(reranked?.hit_at_10 === 0.32 && reranked.hit_at_10 < winner.hit_at_10, 'Generic reranker regression evidence missing')
const rerankFailure = semanticBaseline.pairwise_failure_analysis?.hybrid_general_reranked_vs_hybrid_general_rrf
assert(rerankFailure?.rescued_top10 === 8 && rerankFailure?.lost_top10 === 19, 'Frozen reranker failure analysis drifted')
for (const modelKey of ['dense_general', 'reranker']) {
  const model = semanticBaseline.models?.[modelKey]
  assert(model && sha40.test(model.revision), `${modelKey} revision must stay pinned`)
  assert(model.license === 'Apache-2.0', `${modelKey} license expectation changed`)
}
assert(semanticBaseline.decision?.current_external_winner === 'hybrid_general_rrf', 'Frozen external winner drifted')
assert(semanticBaseline.decision?.promote_generic_reranker === false, 'Regressing reranker must remain rejected')

for (const required of criteria.external_benchmarks.required) {
  assert(byId.has(required), `10/10 gate requires unregistered external benchmark: ${required}`)
}
assert(criteria.external_benchmarks.may_replace_german_law_ground_truth === false, 'External benchmarks must not replace German ground truth')
assert(criteria.external_benchmarks.may_be_claimed_as_german_law_accuracy === false, 'External scores must not be relabeled German-law accuracy')
assert(manifest.gitlaw_specific_layers.german_gold.target_lawyer_reviewed_cases >= 500, 'German Gold target below strict bar')
assert(manifest.gitlaw_specific_layers.german_gold.frozen_holdout_cases >= 200, 'German frozen holdout below strict bar')
assert(manifest.gitlaw_specific_layers.law_firm_matters.minimum_independent_lawyer_reviewers >= 5, 'Independent lawyer reviewer target too low')

console.log(JSON.stringify({
  external_benchmark_contract: 'PASS',
  ledger_schema: ledger.schema_version,
  executed_component_runs: ledger.summary.component_runs_completed,
  legalbench_slice: lbEvidence.component_run,
  frozen_external_winner: winner,
  rejected_generic_reranker: reranked,
  legal_quality_release_gate: criteria.current_status
}, null, 2))
