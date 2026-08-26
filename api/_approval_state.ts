export type ApprovalState = 'draft' | 'submitted' | 'verified' | 'rejected' | 'reopened'

export type ApprovalRecord = {
  state: ApprovalState
  ownerId: string
  reviewerId?: string
  sourceVersion: string
  verifiedSourceVersion?: string
  lastReason?: string
}

function nonEmpty(value: string, label: string): string {
  const v = String(value || '').trim()
  if (!v) throw new Error(`${label}_required`)
  return v
}

export function submitForReview(record: ApprovalRecord, actorId: string): ApprovalRecord {
  const actor = nonEmpty(actorId, 'actor')
  if (actor !== record.ownerId) throw new Error('only_owner_may_submit')
  if (!['draft', 'reopened', 'rejected'].includes(record.state)) throw new Error('invalid_submit_transition')
  return { ...record, state: 'submitted', reviewerId: undefined, lastReason: undefined }
}

export function verifySubmission(
  record: ApprovalRecord,
  reviewerId: string,
  opts: { authorised: boolean },
): ApprovalRecord {
  const reviewer = nonEmpty(reviewerId, 'reviewer')
  if (record.state !== 'submitted') throw new Error('only_submitted_may_be_verified')
  if (!opts.authorised) throw new Error('reviewer_not_authorised')
  if (reviewer === record.ownerId) throw new Error('self_approval_forbidden')
  return {
    ...record,
    state: 'verified',
    reviewerId: reviewer,
    verifiedSourceVersion: record.sourceVersion,
    lastReason: undefined,
  }
}

export function rejectSubmission(record: ApprovalRecord, reviewerId: string, reason: string): ApprovalRecord {
  const reviewer = nonEmpty(reviewerId, 'reviewer')
  if (record.state !== 'submitted') throw new Error('only_submitted_may_be_rejected')
  if (reviewer === record.ownerId) throw new Error('self_review_forbidden')
  return { ...record, state: 'rejected', reviewerId: reviewer, lastReason: nonEmpty(reason, 'reason') }
}

export function applySourceVersion(
  record: ApprovalRecord,
  nextSourceVersion: string,
  opts: { affectsReviewedSubstance: boolean; reason?: string },
): ApprovalRecord {
  const next = nonEmpty(nextSourceVersion, 'source_version')
  if (next === record.sourceVersion) return record

  const updated = { ...record, sourceVersion: next }
  if (record.state === 'verified' && opts.affectsReviewedSubstance) {
    return {
      ...updated,
      state: 'reopened',
      reviewerId: undefined,
      lastReason: opts.reason || 'material_source_change_after_verification',
    }
  }
  return updated
}

export function isCurrentVerification(record: ApprovalRecord): boolean {
  return record.state === 'verified' && Boolean(record.verifiedSourceVersion) && record.verifiedSourceVersion === record.sourceVersion
}
