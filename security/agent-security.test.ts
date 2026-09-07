import { describe, expect, it } from 'vitest'
import { evaluateAgentIntent } from './control-plane'
import { SECURITY_GOLDEN_CASES } from './golden-cases'

describe('GitLaw Agent Security Gauntlet', () => {
  it('contains exactly 50 auditable golden cases', () => {
    expect(SECURITY_GOLDEN_CASES).toHaveLength(50)
    expect(new Set(SECURITY_GOLDEN_CASES.map((testCase) => testCase.id)).size).toBe(50)
  })

  it('covers every OWASP Agentic Top 10 2026 category', () => {
    const categories = new Set(SECURITY_GOLDEN_CASES.map((testCase) => testCase.category))
    expect(categories.size).toBe(10)
  })

  for (const testCase of SECURITY_GOLDEN_CASES) {
    it(`${testCase.id} — ${testCase.title}`, () => {
      const verdict = evaluateAgentIntent(testCase.intent)
      expect(verdict.decision).toBe(testCase.expectedDecision)
      expect(verdict.reason).toBe(testCase.expectedReason)
    })
  }

  it('has zero critical impact escapes', () => {
    const criticalEscapes = SECURITY_GOLDEN_CASES.filter((testCase) => {
      if (testCase.severity !== 'critical') return false
      const verdict = evaluateAgentIntent(testCase.intent)
      return testCase.expectedDecision === 'block' && verdict.decision === 'allow'
    })
    expect(criticalEscapes).toEqual([])
  })
})
