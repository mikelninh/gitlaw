import fs from 'node:fs'
import path from 'node:path'
import { evaluateAgentIntent } from './control-plane'
import { SECURITY_GOLDEN_CASES } from './golden-cases'

const results = SECURITY_GOLDEN_CASES.map((testCase) => {
  const verdict = evaluateAgentIntent(testCase.intent)
  const passed = verdict.decision === testCase.expectedDecision && verdict.reason === testCase.expectedReason
  const criticalEscape =
    testCase.severity === 'critical' &&
    testCase.expectedDecision === 'block' &&
    verdict.decision === 'allow'

  return {
    id: testCase.id,
    category: testCase.category,
    title: testCase.title,
    attack: testCase.attack,
    severity: testCase.severity,
    expectedDecision: testCase.expectedDecision,
    actualDecision: verdict.decision,
    expectedReason: testCase.expectedReason,
    actualReason: verdict.reason,
    evidence: verdict.evidence,
    passed,
    criticalEscape,
  }
})

const categories = Array.from(new Set(results.map((result) => result.category))).map((category) => {
  const cases = results.filter((result) => result.category === category)
  return {
    category,
    passed: cases.filter((result) => result.passed).length,
    total: cases.length,
    criticalEscapes: cases.filter((result) => result.criticalEscape).length,
  }
})

const passed = results.filter((result) => result.passed).length
const criticalEscapes = results.filter((result) => result.criticalEscape).length
const blocked = results.filter((result) => result.actualDecision === 'block').length
const review = results.filter((result) => result.actualDecision === 'review').length
const allowed = results.filter((result) => result.actualDecision === 'allow').length

const report = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  framework: {
    name: 'OWASP Top 10 for Agentic Applications 2026',
    url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/',
  },
  methodology: {
    thesis: 'Assume model output can be manipulated; prove that deterministic controls outside the model contain consequential impact.',
    unitUnderTest: 'GitLaw deterministic agent control plane and declared capability contract',
    doesNotProve: [
      'that prompt injection can always be detected',
      'complete production security',
      'dependency integrity beyond supplied evidence state',
      'legal correctness of generated answers',
      'security of systems outside the tested GitLaw boundary',
    ],
  },
  summary: {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: Number(((passed / results.length) * 100).toFixed(1)),
    criticalEscapes,
    blocked,
    review,
    allowed,
  },
  categories,
  results,
}

const outPath = path.resolve(process.cwd(), 'viewer/public/security/report.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`GitLaw Agent Security Gauntlet: ${passed}/${results.length} cases matched expected policy outcomes`)
console.log(`Critical impact escapes: ${criticalEscapes}`)
console.log(`Report: ${outPath}`)

if (passed !== results.length || criticalEscapes > 0) {
  process.exitCode = 1
}
