import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
const sha40 = /^[0-9a-f]{40}$/

const manifest = readJson('evals/german_public/benchmarks.json')
const criteria = readJson('evals/ypog/release_criteria.json')

assert(manifest.schema_version === '1.1', 'German public benchmark manifest schema drifted')
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
assert(sha40.test(gerdalir.original_upstream_commit), 'Original GerDaLIR source must stay pinned')
assert(gerdalir.evaluation_dataset === 'mteb/GerDaLIRSmall', 'German case-law gate must use standardized MTEB GerDaLIRSmall task')
assert(sha40.test(gerdalir.evaluation_dataset_revision), 'MTEB GerDaLIRSmall dataset snapshot must be pinned')
assert(gerdalir.evaluation_queries === 12234, 'GerDaLIRSmall query count drifted')
assert(gerdalir.evaluation_documents === 9969, 'GerDaLIRSmall document count drifted')
assert(gerdalir.evaluation_relevance_labels === 14320, 'GerDaLIRSmall qrel count drifted')
assert(gerdalir.dataset_license === 'MIT', 'GerDaLIRSmall license expectation changed')
assert(gerdalir.data_vendored === false, 'GerDaLIR data must not be blindly vendored')
assert(gerdalir.original_scale_reference.reported_queries >= 120000, 'Original GerDaLIR scale reference unexpectedly low')
assert(gerdalir.counts_as_lawyer_approved_product_gold === false, 'GerDaLIR must never be relabeled as lawyer-approved product gold')

const gerlerb = byId.get('gerlerb')
assert(gerlerb.reported_questions === 367, 'GerLeRB reported question count drifted')
assert(gerlerb.reported_law_books === 58, 'GerLeRB reported law-book count drifted')
assert(gerlerb.license_status === 'UNKNOWN_REVIEW_REQUIRED_BEFORE_DATA_EXECUTION_OR_REDISTRIBUTION', 'GerLeRB must remain blocked until license is verified')
assert(gerlerb.data_vendored === false, 'GerLeRB data must not be vendored before license review')
assert(Object.keys(gerlerb.known_file_checksums_md5 || {}).length === 3, 'GerLeRB checksum inventory incomplete')

assert(criteria.german_public_benchmarks.required.length >= 3, 'Strict release criteria must require German public benchmark families')
for (const required of criteria.german_public_benchmarks.required) assert(byId.has(required), `Missing release-required German public benchmark: ${required}`)
assert(criteria.german_public_benchmarks.minimum_executed_suites >= 3, 'Strict release needs three executed German public suites')
assert(manifest.strict_layer_gate.minimum_executed_public_german_suites_before_10_of_10 >= 3, 'Strict German public layer requires at least three executed suites')
assert(manifest.strict_layer_gate.may_replace_german_product_gold === false, 'Public German benchmarks cannot replace product gold')
assert(manifest.strict_layer_gate.may_replace_real_shadow_matters === false, 'Public German benchmarks cannot replace shadow matters')
assert(criteria.german_public_benchmarks.may_replace_lawyer_approved_product_gold === false, 'German public capability evidence cannot replace lawyer-approved product gold')
assert(criteria.german_public_benchmarks.may_replace_shadow_matters === false, 'German public capability evidence cannot replace real shadow matters')
assert(criteria.minimum_dataset.lawyer_reviewed_cases >= 500, 'German public benchmarks must not lower lawyer-reviewed target')
assert(criteria.real_world.shadow_matters_min >= 100, 'German public benchmarks must not lower shadow-matter target')

console.log(JSON.stringify({
  german_public_benchmark_contract: 'PASS',
  registered: [...byId.keys()],
  first_executable_suite: 'GerLayQA',
  case_law_suite: 'mteb/GerDaLIRSmall',
  gerlayqa_claim_scope: gerlayqa.claim_scope,
  gerdalir_claim_scope: gerdalir.claim_scope,
  public_benchmarks_replace_product_gold: false,
  strict_release_status: criteria.current_status
}, null, 2))
