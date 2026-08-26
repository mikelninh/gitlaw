import fs from 'node:fs'

const manifest = JSON.parse(fs.readFileSync('evals/german_gold/manifest.json', 'utf8'))
const schema = JSON.parse(fs.readFileSync('evals/german_gold/schema.json', 'utf8'))
const reviewSchema = JSON.parse(fs.readFileSync('evals/german_gold/review.schema.json', 'utf8'))
const criteria = JSON.parse(fs.readFileSync('evals/ypog/release_criteria.json', 'utf8'))
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }

assert(schema.title === 'GitLaw German Legal Gold Case', 'German Gold schema missing')
assert(schema.properties.review.properties.status.enum.includes('approved_gold'), 'Schema must distinguish approved gold')
assert(schema.properties.review.properties.status.enum.includes('candidate_unreviewed'), 'Schema must distinguish unreviewed candidates')

assert(reviewSchema.title === 'GitLaw Independent Lawyer Review', 'Independent lawyer review schema missing')
const terminalLabels = reviewSchema.properties.terminal_label.enum
for (const label of [
  'ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION',
  'ACCEPTABLE_WITH_MINOR_CORRECTION',
  'MATERIAL_CORRECTION_REQUIRED',
  'UNSAFE_OR_MISLEADING'
]) {
  assert(terminalLabels.includes(label), `Review schema missing terminal label ${label}`)
}
assert(reviewSchema.properties.reviewer.properties.independent.type === 'boolean', 'Reviewer independence must be explicit')
assert(reviewSchema.properties.system_snapshot.required.includes('system_version'), 'Review must pin system version')
assert(reviewSchema.properties.system_snapshot.required.includes('corpus_snapshot'), 'Review must pin corpus snapshot')

assert(manifest.counts.approved_gold <= manifest.counts.single_review + manifest.counts.approved_gold, 'Invalid gold counts')
assert(manifest.counts.frozen_holdout <= manifest.counts.approved_gold, 'Frozen holdout cannot exceed approved gold')
assert(manifest.strict_targets.approved_gold === criteria.minimum_dataset.lawyer_reviewed_cases, 'German Gold target drifted from release criteria')
assert(manifest.strict_targets.frozen_holdout === criteria.minimum_dataset.frozen_holdout_cases, 'Holdout target drifted from release criteria')
assert(manifest.strict_targets.independent_lawyer_reviewers === criteria.minimum_dataset.independent_lawyer_reviewers, 'Reviewer target drifted from release criteria')
assert(manifest.status.startsWith('BLOCKED_'), 'Gold dataset must remain blocked while no approved gold exists')
if (manifest.counts.approved_gold === 0) {
  assert(manifest.counts.frozen_holdout === 0, 'Cannot have frozen lawyer-reviewed holdout with zero approved gold')
}

console.log(JSON.stringify({
  german_gold_contract: 'PASS',
  independent_review_instrument: 'PASS',
  current_counts: manifest.counts,
  strict_targets: manifest.strict_targets,
  release_gate: criteria.current_status
}, null, 2))
