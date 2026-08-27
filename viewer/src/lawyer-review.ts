export const CLAIM_RATINGS = [
  'supported',
  'partially_supported',
  'unsupported',
  'contradicted_by_source',
] as const

export const TERMINAL_LABELS = [
  'ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION',
  'ACCEPTABLE_WITH_MINOR_CORRECTION',
  'MATERIAL_CORRECTION_REQUIRED',
  'UNSAFE_OR_MISLEADING',
] as const

export const ERROR_TAGS = [
  'retrieval_miss', 'ranking_error', 'wrong_temporal_scope', 'citation_resolution',
  'claim_source_mismatch', 'issue_spotting', 'missing_fact', 'unsupported_inference',
  'bad_abstention', 'tool_policy', 'tenant_isolation', 'stale_approval', 'change_impact',
  'structured_output', 'latency', 'cost', 'other',
] as const

export const SCORE_KEYS = [
  'issue_spotting',
  'legal_correctness',
  'completeness',
  'evidence_presentation',
  'missing_facts_uncertainty',
  'lawyer_usefulness',
] as const

export type ClaimRating = typeof CLAIM_RATINGS[number]
export type TerminalLabel = typeof TERMINAL_LABELS[number]
export type ErrorTag = typeof ERROR_TAGS[number]
export type ScoreKey = typeof SCORE_KEYS[number]
export type Ternary = '' | 'yes' | 'no' | 'uncertain'
export type YesNo = '' | 'yes' | 'no'
export type AbstentionReview = '' | 'yes' | 'no' | 'not_applicable'
export type ScoreFive = 1 | 2 | 3 | 4 | 5

export interface ReviewIssueDefinition {
  id: string
  label: string
  description?: string
}

export interface ReviewSourceDefinition {
  id: string
  label: string
  citation?: string
  excerpt?: string
  url?: string
}

export interface ReviewClaimDefinition {
  id: string
  text: string
  sources: ReviewSourceDefinition[]
}

export interface LawyerReviewCase {
  schema_version: '1.0'
  case_id: string
  practice_area: string
  task: string
  facts: string[]
  expected_issues: ReviewIssueDefinition[]
  claims: ReviewClaimDefinition[]
  system: {
    system_version: string
    corpus_snapshot: string
    output: string
    generated_at?: string
    trace_id?: string
    model_identity?: string
  }
  blinding?: { hide_model_identity?: boolean }
  notes?: string
}

export interface ClaimReview {
  rating: ClaimRating | ''
  expected_source_found: YesNo
  source_relevance: Ternary
  temporal_validity: Ternary
  important_source_omitted: YesNo
  irrelevant_source_introduced: YesNo
  notes: string
}

export interface LawyerReviewDraft {
  reviewer_id: string
  reviewer_role: string
  independent: boolean
  scores: Record<ScoreKey, ScoreFive | null>
  issue_scores: Record<string, 0 | 1 | 2 | null>
  claim_reviews: Record<string, ClaimReview>
  workflow: {
    necessary_tools_only: Ternary
    within_iteration_cost_limits: Ternary
    material_claims_traceable: Ternary
    no_boundary_violation: Ternary
    changed_source_reopened_review: Ternary
    no_false_approval_state: Ternary
    notes: string
  }
  release_signals: {
    critical_authority_omitted: YesNo
    unsupported_material_claim: YesNo
    contradicted_material_claim: YesNo
    correct_abstention: AbstentionReview
  }
  error_tags: ErrorTag[]
  terminal_label: TerminalLabel | ''
  notes: string
}

export interface FinalLawyerReview {
  schema_version: '1.0'
  review_id: string
  case_id: string
  case_snapshot_sha256: string
  run_snapshot_sha256: string
  reviewer: {
    reviewer_id: string
    role: string
    independent: boolean
    model_identity_blinded: boolean
  }
  system_snapshot: {
    system_version: string
    corpus_snapshot: string
    trace_id?: string
  }
  scores: Record<ScoreKey, ScoreFive>
  terminal_label: TerminalLabel
  critical_authority_omitted: boolean
  unsupported_material_claim: boolean
  contradicted_material_claim: boolean
  correct_abstention: boolean | null
  error_tags: ErrorTag[]
  issue_reviews: Array<{ issue_id: string; label: string; score: 0 | 1 | 2; notes: string }>
  claim_reviews: Array<{
    claim_id: string
    rating: ClaimRating
    expected_source_found: boolean
    source_relevance: Exclude<Ternary, ''>
    temporal_validity: Exclude<Ternary, ''>
    important_source_omitted: boolean
    irrelevant_source_introduced: boolean
    notes: string
  }>
  workflow_checks: {
    necessary_tools_only: Exclude<Ternary, ''>
    within_iteration_cost_limits: Exclude<Ternary, ''>
    material_claims_traceable: Exclude<Ternary, ''>
    no_boundary_violation: Exclude<Ternary, ''>
    changed_source_reopened_review: Exclude<Ternary, ''>
    no_false_approval_state: Exclude<Ternary, ''>
    notes: string
  }
  notes: string
  reviewed_at: string
  integrity: {
    algorithm: 'SHA-256'
    canonicalization: 'sorted-json-v1'
    payload_sha256: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing or invalid ${key}`)
  return value.trim()
}

export function validateReviewCase(value: unknown): LawyerReviewCase {
  if (!isRecord(value)) throw new Error('Case package must be a JSON object')
  if (value.schema_version !== '1.0') throw new Error('Unsupported case schema_version')
  const systemRaw = value.system
  if (!isRecord(systemRaw)) throw new Error('Missing system snapshot')
  if (!Array.isArray(value.expected_issues) || value.expected_issues.length === 0) throw new Error('At least one expected issue is required')
  if (!Array.isArray(value.claims) || value.claims.length === 0) throw new Error('At least one material claim is required')
  if (!Array.isArray(value.facts)) throw new Error('facts must be an array')

  const expectedIssues = value.expected_issues.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Invalid expected issue at index ${index}`)
    return {
      id: requiredString(entry, 'id'),
      label: requiredString(entry, 'label'),
      ...(typeof entry.description === 'string' && entry.description.trim() ? { description: entry.description.trim() } : {}),
    }
  })
  const claims = value.claims.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Invalid claim at index ${index}`)
    if (!Array.isArray(entry.sources)) throw new Error(`Claim ${index + 1} sources must be an array`)
    return {
      id: requiredString(entry, 'id'),
      text: requiredString(entry, 'text'),
      sources: entry.sources.map((source, sourceIndex) => {
        if (!isRecord(source)) throw new Error(`Invalid source ${sourceIndex + 1} in claim ${index + 1}`)
        return {
          id: requiredString(source, 'id'),
          label: requiredString(source, 'label'),
          ...(typeof source.citation === 'string' && source.citation.trim() ? { citation: source.citation.trim() } : {}),
          ...(typeof source.excerpt === 'string' && source.excerpt.trim() ? { excerpt: source.excerpt.trim() } : {}),
          ...(typeof source.url === 'string' && source.url.trim() ? { url: source.url.trim() } : {}),
        }
      }),
    }
  })
  const issueIds = expectedIssues.map(issue => issue.id)
  const claimIds = claims.map(claim => claim.id)
  if (new Set(issueIds).size !== issueIds.length) throw new Error('Expected issue ids must be unique')
  if (new Set(claimIds).size !== claimIds.length) throw new Error('Claim ids must be unique')

  return {
    schema_version: '1.0',
    case_id: requiredString(value, 'case_id'),
    practice_area: requiredString(value, 'practice_area'),
    task: requiredString(value, 'task'),
    facts: value.facts.map((fact, index) => {
      if (typeof fact !== 'string' || !fact.trim()) throw new Error(`Invalid fact at index ${index}`)
      return fact.trim()
    }),
    expected_issues: expectedIssues,
    claims,
    system: {
      system_version: requiredString(systemRaw, 'system_version'),
      corpus_snapshot: requiredString(systemRaw, 'corpus_snapshot'),
      output: requiredString(systemRaw, 'output'),
      ...(typeof systemRaw.generated_at === 'string' && systemRaw.generated_at.trim() ? { generated_at: systemRaw.generated_at.trim() } : {}),
      ...(typeof systemRaw.trace_id === 'string' && systemRaw.trace_id.trim() ? { trace_id: systemRaw.trace_id.trim() } : {}),
      ...(typeof systemRaw.model_identity === 'string' && systemRaw.model_identity.trim() ? { model_identity: systemRaw.model_identity.trim() } : {}),
    },
    ...(isRecord(value.blinding) ? { blinding: { hide_model_identity: value.blinding.hide_model_identity !== false } } : {}),
    ...(typeof value.notes === 'string' && value.notes.trim() ? { notes: value.notes.trim() } : {}),
  }
}

export function createReviewDraft(reviewCase: LawyerReviewCase): LawyerReviewDraft {
  return {
    reviewer_id: '',
    reviewer_role: '',
    independent: true,
    scores: Object.fromEntries(SCORE_KEYS.map(key => [key, null])) as Record<ScoreKey, ScoreFive | null>,
    issue_scores: Object.fromEntries(reviewCase.expected_issues.map(issue => [issue.id, null])),
    claim_reviews: Object.fromEntries(reviewCase.claims.map(claim => [claim.id, {
      rating: '', expected_source_found: '', source_relevance: '', temporal_validity: '',
      important_source_omitted: '', irrelevant_source_introduced: '', notes: '',
    } satisfies ClaimReview])),
    workflow: {
      necessary_tools_only: '', within_iteration_cost_limits: '', material_claims_traceable: '',
      no_boundary_violation: '', changed_source_reopened_review: '', no_false_approval_state: '', notes: '',
    },
    release_signals: {
      critical_authority_omitted: '', unsupported_material_claim: '', contradicted_material_claim: '', correct_abstention: '',
    },
    error_tags: [],
    terminal_label: '',
    notes: '',
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => [key, canonicalize(value[key])]))
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function reviewCaseSnapshots(reviewCase: LawyerReviewCase): Promise<{ caseSha256: string; runSha256: string }> {
  const casePayload = {
    schema_version: reviewCase.schema_version,
    case_id: reviewCase.case_id,
    practice_area: reviewCase.practice_area,
    task: reviewCase.task,
    facts: reviewCase.facts,
    expected_issues: reviewCase.expected_issues,
  }
  const runPayload = { claims: reviewCase.claims, system: reviewCase.system }
  return {
    caseSha256: await sha256Hex(canonicalJson(casePayload)),
    runSha256: await sha256Hex(canonicalJson(runPayload)),
  }
}

export function reviewCompletion(reviewCase: LawyerReviewCase, draft: LawyerReviewDraft): { complete: number; total: number; blockers: string[] } {
  let complete = 0
  let total = 0
  const blockers: string[] = []
  const required = (ok: boolean, message: string) => { total += 1; if (ok) complete += 1; else blockers.push(message) }

  required(Boolean(draft.reviewer_id.trim()), 'Reviewer ID fehlt')
  required(Boolean(draft.reviewer_role.trim()), 'Reviewer-Rolle fehlt')
  for (const key of SCORE_KEYS) required(draft.scores[key] !== null, `Gesamtscore fehlt: ${key}`)
  for (const issue of reviewCase.expected_issues) required(draft.issue_scores[issue.id] !== null, `Issue-Score fehlt: ${issue.label}`)
  for (const claim of reviewCase.claims) {
    const row = draft.claim_reviews[claim.id]
    required(Boolean(row?.rating), `Claim rating fehlt: ${claim.id}`)
    required(Boolean(row?.expected_source_found), `Source-found fehlt: ${claim.id}`)
    required(Boolean(row?.source_relevance), `Source relevance fehlt: ${claim.id}`)
    required(Boolean(row?.temporal_validity), `Temporal validity fehlt: ${claim.id}`)
    required(Boolean(row?.important_source_omitted), `Source omission fehlt: ${claim.id}`)
    required(Boolean(row?.irrelevant_source_introduced), `Irrelevant source fehlt: ${claim.id}`)
  }
  for (const key of ['necessary_tools_only', 'within_iteration_cost_limits', 'material_claims_traceable', 'no_boundary_violation', 'changed_source_reopened_review', 'no_false_approval_state'] as const) {
    required(Boolean(draft.workflow[key]), `Workflow-Check fehlt: ${key}`)
  }
  required(Boolean(draft.release_signals.critical_authority_omitted), 'Critical-authority Signal fehlt')
  required(Boolean(draft.release_signals.unsupported_material_claim), 'Unsupported-claim Signal fehlt')
  required(Boolean(draft.release_signals.contradicted_material_claim), 'Contradicted-claim Signal fehlt')
  required(Boolean(draft.release_signals.correct_abstention), 'Abstention Signal fehlt')
  required(Boolean(draft.terminal_label), 'Terminal-Label fehlt')
  return { complete, total, blockers }
}

function yesNo(value: YesNo): boolean {
  if (value === 'yes') return true
  if (value === 'no') return false
  throw new Error('Incomplete yes/no review field')
}

export async function finalizeReview(reviewCase: LawyerReviewCase, draft: LawyerReviewDraft): Promise<FinalLawyerReview> {
  const completion = reviewCompletion(reviewCase, draft)
  if (completion.complete !== completion.total) throw new Error(completion.blockers[0] ?? 'Review is incomplete')
  const snapshots = await reviewCaseSnapshots(reviewCase)
  const reviewedAt = new Date().toISOString()
  const modelBlinded = reviewCase.blinding?.hide_model_identity !== false
  const scores = Object.fromEntries(SCORE_KEYS.map(key => [key, draft.scores[key] as ScoreFive])) as Record<ScoreKey, ScoreFive>
  const terminal = draft.terminal_label as TerminalLabel

  const payload = {
    schema_version: '1.0' as const,
    review_id: `${reviewCase.case_id}:${draft.reviewer_id.trim()}:${reviewedAt}`,
    case_id: reviewCase.case_id,
    case_snapshot_sha256: snapshots.caseSha256,
    run_snapshot_sha256: snapshots.runSha256,
    reviewer: {
      reviewer_id: draft.reviewer_id.trim(),
      role: draft.reviewer_role.trim(),
      independent: draft.independent,
      model_identity_blinded: modelBlinded,
    },
    system_snapshot: {
      system_version: reviewCase.system.system_version,
      corpus_snapshot: reviewCase.system.corpus_snapshot,
      ...(reviewCase.system.trace_id ? { trace_id: reviewCase.system.trace_id } : {}),
    },
    scores,
    terminal_label: terminal,
    critical_authority_omitted: yesNo(draft.release_signals.critical_authority_omitted),
    unsupported_material_claim: yesNo(draft.release_signals.unsupported_material_claim),
    contradicted_material_claim: yesNo(draft.release_signals.contradicted_material_claim),
    correct_abstention: draft.release_signals.correct_abstention === 'not_applicable' ? null : draft.release_signals.correct_abstention === 'yes',
    error_tags: [...draft.error_tags].sort(),
    issue_reviews: reviewCase.expected_issues.map(issue => ({
      issue_id: issue.id,
      label: issue.label,
      score: draft.issue_scores[issue.id] as 0 | 1 | 2,
      notes: '',
    })),
    claim_reviews: reviewCase.claims.map(claim => {
      const row = draft.claim_reviews[claim.id]
      return {
        claim_id: claim.id,
        rating: row.rating as ClaimRating,
        expected_source_found: yesNo(row.expected_source_found),
        source_relevance: row.source_relevance as Exclude<Ternary, ''>,
        temporal_validity: row.temporal_validity as Exclude<Ternary, ''>,
        important_source_omitted: yesNo(row.important_source_omitted),
        irrelevant_source_introduced: yesNo(row.irrelevant_source_introduced),
        notes: row.notes,
      }
    }),
    workflow_checks: {
      necessary_tools_only: draft.workflow.necessary_tools_only as Exclude<Ternary, ''>,
      within_iteration_cost_limits: draft.workflow.within_iteration_cost_limits as Exclude<Ternary, ''>,
      material_claims_traceable: draft.workflow.material_claims_traceable as Exclude<Ternary, ''>,
      no_boundary_violation: draft.workflow.no_boundary_violation as Exclude<Ternary, ''>,
      changed_source_reopened_review: draft.workflow.changed_source_reopened_review as Exclude<Ternary, ''>,
      no_false_approval_state: draft.workflow.no_false_approval_state as Exclude<Ternary, ''>,
      notes: draft.workflow.notes,
    },
    notes: draft.notes,
    reviewed_at: reviewedAt,
  }
  const payloadHash = await sha256Hex(canonicalJson(payload))
  return { ...payload, integrity: { algorithm: 'SHA-256', canonicalization: 'sorted-json-v1', payload_sha256: payloadHash } }
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
