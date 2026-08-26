import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
const sha40 = /^[0-9a-f]{40}$/

const manifest = readJson('evals/external/benchmarks.json')
const criteria = readJson('evals/ypog/release_criteria.json')

assert(manifest.schema_version === '1.0', 'External benchmark manifest schema drifted')
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
  pinned_benchmarks: manifest.benchmarks.map(({id, upstream_commit, primary_layer, gitlaw_claim_scope}) => ({id, upstream_commit, primary_layer, gitlaw_claim_scope})),
  german_gold_target: manifest.gitlaw_specific_layers.german_gold,
  law_firm_target: manifest.gitlaw_specific_layers.law_firm_matters,
  legal_quality_release_gate: criteria.current_status
}, null, 2))
