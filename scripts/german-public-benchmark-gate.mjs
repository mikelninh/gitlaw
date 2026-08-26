import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
const sha40 = /^[0-9a-f]{40}$/

const manifest = readJson('evals/german_public/benchmarks.json')
const criteria = readJson('evals/ypog/release_criteria.json')

assert(manifest.schema_version === '1.0', 'German public benchmark manifest schema drifted')
assert(Array.isArray(manifest.benchmarks) && manifest.benchmarks.length >= 3, 'Expected at least three German public benchmark families')
const byId = new Map(manifest.benchmarks.map(b => [b.id, b]))
for (const id of ['gerlayqa', 'gerdalir', 'gerlerb']) assert(byId.has(id), `Missing German public benchmark ${id}`)

const gerlayqa = byId.get('gerlayqa')
assert(sha40.test(gerlayqa.upstream_commit), 'GerLayQA must pin an upstream Git commit')
assert(gerlayqa.expected_eval_questions === 2154, 'GerLayQA eval count drifted; review upstream before updating')
assert(gerlayqa.data_vendored === false, 'GerLayQA restricted data must not be vendored')
assert(gerlayqa.data_use_policy === 'NON_COMMERCIAL_SCIENTIFIC_RESEARCH_ONLY_PER_UPSTREAM_README', 'GerLayQA data-use restriction must remain explicit')
assert(gerlayqa.commercial_reuse_status === 'BLOCKED_BY_UPSTREAM_DATA_USAGE_RESTRICTION', 'GerLayQA commercial reuse must remain blocked')
assert(gerlayqa.counts_as_lawyer_approved_product_gold === false, 'GerLayQA must never be relabeled as lawyer-approved product gold')

const gerdalir = byId.get('gerdalir')
assert(sha40.test(gerdalir.upstream_commit), 'GerDaLIR must pin an upstream commit')
assert(gerdalir.reported_queries >= 120000, 'GerDaLIR reported query count unexpectedly low')
assert(gerdalir.data_vendored === false, 'GerDaLIR data must not be blindly vendored')
assert(gerdalir.counts_as_lawyer_approved_product_gold === false, 'GerDaLIR must never be relabeled as lawyer-approved product gold')

const gerlerb = byId.get('gerlerb')
assert(gerlerb.reported_questions === 367, 'GerLeRB reported question count drifted')
assert(gerlerb.reported_law_books === 58, 'GerLeRB reported law-book count drifted')
assert(gerlerb.license_status === 'UNKNOWN_REVIEW_REQUIRED_BEFORE_DATA_EXECUTION_OR_REDISTRIBUTION', 'GerLeRB must remain blocked until license is verified')
assert(gerlerb.data_vendored === false, 'GerLeRB data must not be vendored before license review')
assert(Object.keys(gerlerb.known_file_checksums_md5 || {}).length === 3, 'GerLeRB checksum inventory incomplete')

assert(manifest.strict_layer_gate.minimum_executed_public_german_suites_before_10_of_10 >= 3, 'Strict German public layer requires at least three executed suites')
assert(manifest.strict_layer_gate.may_replace_german_product_gold === false, 'Public German benchmarks cannot replace product gold')
assert(manifest.strict_layer_gate.may_replace_real_shadow_matters === false, 'Public German benchmarks cannot replace shadow matters')
assert(criteria.minimum_dataset.lawyer_reviewed_cases >= 500, 'German public benchmarks must not lower lawyer-reviewed target')
assert(criteria.real_world.shadow_matters_min >= 100, 'German public benchmarks must not lower shadow-matter target')

console.log(JSON.stringify({
  german_public_benchmark_contract: 'PASS',
  registered: [...byId.keys()],
  first_executable_suite: 'GerLayQA',
  gerlayqa_claim_scope: gerlayqa.claim_scope,
  public_benchmarks_replace_product_gold: false,
  strict_release_status: criteria.current_status
}, null, 2))
