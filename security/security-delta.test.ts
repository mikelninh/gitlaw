import { describe, expect, it } from 'vitest'
import { buildSecurityDeltaProof } from './security-delta'

describe('GitLaw security delta proof', () => {
  it('shows causal containment while preserving benign behavior', () => {
    const report = buildSecurityDeltaProof()
    expect(report.version).toBe('security-delta-target-proof/v1')
    expect(report.summary.attackCases).toBeGreaterThanOrEqual(4)
    expect(report.summary.before.impactEscapes).toBe(report.summary.attackCases)
    expect(report.summary.after.impactEscapes).toBe(0)
    expect(report.summary.delta.relativeImpactReduction).toBe(1)
    expect(report.summary.holdout.contained).toBe(report.summary.holdout.total)
    expect(report.summary.benign.retentionRate).toBe(1)
    expect(report.mutation.historicalVulnerabilityClaimed).toBe(false)
  })
})
