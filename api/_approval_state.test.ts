import { describe, expect, it } from 'vitest'
import {
  applySourceVersion,
  isCurrentVerification,
  submitForReview,
  verifySubmission,
  type ApprovalRecord,
} from './_approval_state'

const draft = (): ApprovalRecord => ({
  state: 'draft',
  ownerId: 'associate-a',
  sourceVersion: 'sha256:v1',
})

describe('legal approval state guards', () => {
  it('keeps submitted distinct from verified', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    expect(submitted.state).toBe('submitted')
    expect(isCurrentVerification(submitted)).toBe(false)
  })

  it('forbids self approval even when a submission exists', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    expect(() => verifySubmission(submitted, 'associate-a', { authorised: true }))
      .toThrow('self_approval_forbidden')
  })

  it('forbids an unauthorised reviewer', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    expect(() => verifySubmission(submitted, 'intern-b', { authorised: false }))
      .toThrow('reviewer_not_authorised')
  })

  it('binds verification to the exact reviewed source version', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    const verified = verifySubmission(submitted, 'partner-b', { authorised: true })
    expect(verified.state).toBe('verified')
    expect(verified.verifiedSourceVersion).toBe('sha256:v1')
    expect(isCurrentVerification(verified)).toBe(true)
  })

  it('reopens a verified review when substantive source content changes', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    const verified = verifySubmission(submitted, 'partner-b', { authorised: true })
    const changed = applySourceVersion(verified, 'sha256:v2', {
      affectsReviewedSubstance: true,
      reason: 'liability_cap_changed',
    })
    expect(changed.state).toBe('reopened')
    expect(changed.lastReason).toBe('liability_cap_changed')
    expect(isCurrentVerification(changed)).toBe(false)
  })

  it('does not reopen substantive approval for an explicitly non-material source change', () => {
    const submitted = submitForReview(draft(), 'associate-a')
    const verified = verifySubmission(submitted, 'partner-b', { authorised: true })
    const changed = applySourceVersion(verified, 'sha256:v1-formatting', {
      affectsReviewedSubstance: false,
    })
    expect(changed.state).toBe('verified')
    // The old verification is not silently rebound to a new source hash.
    expect(isCurrentVerification(changed)).toBe(false)
  })
})
