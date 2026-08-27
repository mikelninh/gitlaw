import { describe, expect, it } from 'vitest'
import { analyzeLegalChangeImpact } from './_legal_change_impact'

describe('Legal change impact', () => {
  it('does not reopen review for whitespace-only formatting changes', () => {
    const result = analyzeLegalChangeImpact({
      beforeText: '1. Liability\nThe Seller is liable under the Agreement.',
      afterText: '  1. Liability\n\nThe   Seller is liable under the Agreement.  ',
      beforeVersion: 'v1',
      afterVersion: 'v2',
    })
    expect(result.cosmeticOnly).toBe(true)
    expect(result.reopenProposal).toBe(false)
    expect(result.requiresHumanMaterialityReview).toBe(false)
  })

  it('surfaces changed liability cap with before/after evidence', () => {
    const result = analyzeLegalChangeImpact({
      beforeText: '7. Liability cap EUR 5,000,000',
      afterText: '7. Liability cap EUR 7,500,000',
    })
    expect(result.cosmeticOnly).toBe(false)
    expect(result.reopenProposal).toBe(true)
    expect(result.priorityReviewCandidate).toBe(true)
    expect(result.substantiveChangeCandidates[0].signals).toContain('liability')
    expect(result.substantiveChangeCandidates[0].signals).toContain('money')
    expect(result.substantiveChangeCandidates[0].before).toContain('5,000,000')
    expect(result.substantiveChangeCandidates[0].after).toContain('7,500,000')
  })

  it('surfaces warranty-duration changes but reserves materiality to a human', () => {
    const result = analyzeLegalChangeImpact({
      beforeText: '12. Warranty period is 24 months.',
      afterText: '12. Warranty period is 36 months.',
    })
    const change = result.substantiveChangeCandidates[0]
    expect(change.signals).toContain('warranty')
    expect(change.signals).toContain('duration')
    expect(result.requiresHumanMaterialityReview).toBe(true)
    expect(result.claimBoundary).toContain('competent human')
  })

  it('detects governing-law changes as a high-signal review candidate', () => {
    const result = analyzeLegalChangeImpact({
      beforeText: '20. Governing law: German law.',
      afterText: '20. Governing law: English law.',
    })
    expect(result.substantiveChangeCandidates[0].signals).toContain('governing_law')
    expect(result.priorityReviewCandidate).toBe(true)
    expect(result.reopenProposal).toBe(true)
  })
})
