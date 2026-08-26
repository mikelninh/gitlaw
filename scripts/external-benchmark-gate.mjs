import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
const sha40 = /^[0-9a-f]{40}$/

const manifest = readJson('evals/external/benchmarks.json')
const ledger = readJson('evals/external/evidence_ledger.json')
const externalBaseline = readJson('evals/external/results/legal_rag_bench_bm25_20260826.json')
const criteria = readJson('evals/ypog/release_criteria.json')

assert(manifest.schema_version === '1.1', 'External benchmark manifest schema drifted')
assert(Array.isArray(manifest.benchmarks) && manifest.benchmarks.length === 3, 'Expected exactly three pinned external benchmark families')

const byId = new Map(manifest.benchmarks.map(b => [b.id, b]))
for (const id of ['legalbench-rag', 'legalbench', 'legal-rag-bench']) {
  assert(byId.has(id), `Missing external benchmark: ${id}`)
  const b = byId.get(id)
  assert(sha40.test(b.upstream_commit), `${id} must pin a 40-char upstream commit SHA`)
  assert(b.counts_for_german_legal_release_gate === false, `${id} must not count as German-law production ground truth`)
  assert(String(b.gitlaw_claim_scope).includes('only'), `${id} claim scope must be explicitly limited`)
}

const lbr = byId.get('legalbench-rag')
assert(lbr.reported_examples === 6858, 'LegalBench-RAG reported example count changed; review upstream before updating')
assert(lbr.code_license === 'MIT', 'LegalBench-RAG code license expectation changed')
assert(lbr.data_license_policy === 'INHERITED_PER_SOURCE_DATASET', 'LegalBench-RAG source-data license guard missing')
assert(lbr.data_sources.length === 4, 'LegalBench-RAG source dataset inventory incomplete')

const lb = byId.get('legalbench')
assert(lb.reported_tasks === 162, 'LegalBench task count changed; review upstream before updating')
assert(lb.data_license_policy === 'FOLLOW_EACH_TASK_LICENSE', 'LegalBench per-task license guard missing')

const lrgb = byId.get('legal-rag-bench')
assert(lrgb.reported_questions === 100, 'Legal RAG Bench question count changed; review upstream before updating')
assert(lrgb.reported_passages === 4876, 'Legal RAG Bench passage count changed; review upstream before updating')
assert(lrgb.code_license === 'MIT', 'Legal RAG Bench code license expectation changed')
assert(sha40.test(lrgb.dataset_revision), 'Legal RAG Bench dataset snapshot must be pinned')
assert(lrgb.dataset_license_metadata === 'cc-by-nc-sa-4.0', 'Conservative Legal RAG Bench license metadata guard changed')
assert(lrgb.license_metadata_conflict === true, 'License metadata/prose mismatch must stay visible until clarified')
assert(lrgb.commercial_use_status === 'BLOCKED_PENDING_LICENSE_CLARIFICATION', 'Commercial benchmark reuse must remain blocked while license metadata conflicts')

// Executed evidence is tracked separately from registered benchmark families.
assert(ledger.schema_version === '1.1', 'External evidence ledger schema drifted')
assert(ledger.summary.registered === 3, 'External evidence ledger must cover all registered benchmark families')
assert(ledger.summary.component_runs_completed >= 1, 'At least the pinned Legal RAG Bench component baseline must remain executed')
assert(ledger.summary.full_runs_completed === 0, 'Do not claim a full external suite until generation/oracle or licensed suites actually run')
assert(ledger.summary.external_full_suite_scores_claimable === 0, 'No full external suite score is claimable yet')
assert(ledger.benchmarks['legal-rag-bench'].component_run === 'EXECUTED_BM25_RETRIEVAL_DIAGNOSTIC', 'Executed Legal RAG Bench component evidence missing')

assert(externalBaseline.status === 'OBSERVED_EXTERNAL_COMPONENT_BASELINE', 'External BM25 result must remain an observed baseline')
assert(externalBaseline.dataset_revision === lrgb.dataset_revision, 'External result dataset revision drifted from benchmark manifest')
assert(externalBaseline.n_questions === 100 && externalBaseline.n_passages === 4876, 'External baseline sample/corpus count drifted')
assert(externalBaseline.metrics.hit_at_1 === 0.14, 'External BM25 Hit@1 changed without explicit baseline update')
assert(externalBaseline.metrics.hit_at_5 === 0.30, 'External BM25 Hit@5 changed without explicit baseline update')
assert(externalBaseline.metrics.hit_at_10 === 0.31, 'External BM25 Hit@10 changed without explicit baseline update')
assert(Math.abs(externalBaseline.metrics.mrr - 0.21812319724933016) < 1e-15, 'External BM25 MRR changed without explicit baseline update')

for (const required of criteria.external_benchmarks.required) {
  assert(byId.has(required), `10/10 gate requires unregistered external benchmark: ${required}`)
}
assert(criteria.external_benchmarks.may_replace_german_law_ground_truth === false, 'External benchmarks must never replace German-law ground truth')
assert(criteria.external_benchmarks.may_be_claimed_as_german_law_accuracy === false, 'External scores must never be relabeled as German-law accuracy')
assert(manifest.gitlaw_specific_layers.german_gold.target_lawyer_reviewed_cases >= 500, 'German Gold target below strict bar')
assert(manifest.gitlaw_specific_layers.german_gold.frozen_holdout_cases >= 200, 'German frozen holdout below strict bar')
assert(manifest.gitlaw_specific_layers.law_firm_matters.minimum_independent_lawyer_reviewers >= 5, 'Independent lawyer reviewer target too low')

console.log(JSON.stringify({
  external_benchmark_contract: 'PASS',
  pinned_benchmarks: manifest.benchmarks.map(({id, upstream_commit, dataset_revision, primary_layer, gitlaw_claim_scope}) => ({id, upstream_commit, dataset_revision: dataset_revision ?? null, primary_layer, gitlaw_claim_scope})),
  executed_component_baseline: {
    benchmark: externalBaseline.benchmark,
    dataset_revision: externalBaseline.dataset_revision,
    metrics: externalBaseline.metrics,
    claim_boundary: externalBaseline.claim_boundary
  },
  full_external_suites_completed: ledger.summary.full_runs_completed,
  german_gold_target: manifest.gitlaw_specific_layers.german_gold,
  law_firm_target: manifest.gitlaw_specific_layers.law_firm_matters,
  legal_quality_release_gate: criteria.current_status
}, null, 2))
