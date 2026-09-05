import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHORITY,
  MIGRATION_DOCUMENT_READINESS_V1,
  buildAuthorityMap,
  evaluatePromotion,
  validateWorkflowPack,
} from './workflow-pack.mjs'
import {
  PROOF_WEEK_PRICE_EUR_NET,
  STANDARD_PROOF_WEEK,
  buildProofWeekReport,
  computeConfirmedMinutesReturned,
  evaluateWillingnessToPay,
} from './proof-week.mjs'

test('golden migration workflow is reusable, fail-closed and not Bao-specific', () => {
  const result = validateWorkflowPack(MIGRATION_DOCUMENT_READINESS_V1)
  assert.equal(result.valid, true, result.errors.join(','))
  assert.equal(JSON.stringify(MIGRATION_DOCUMENT_READINESS_V1).toLowerCase().includes('bao'), false)
  assert.equal(MIGRATION_DOCUMENT_READINESS_V1.dataPolicy.realMandateExternalAi, AUTHORITY.BLOCK)
  assert.equal(MIGRATION_DOCUMENT_READINESS_V1.dataPolicy.crossMatterAccess, AUTHORITY.BLOCK)
  const map = buildAuthorityMap(MIGRATION_DOCUMENT_READINESS_V1)
  assert.ok(map.allow.includes('work_packet.prepare'))
  assert.ok(map.approval.includes('deadline.confirm'))
  assert.ok(map.approval.includes('client_message.send'))
  assert.ok(map.block.includes('final_legal_decision'))
  assert.ok(map.block.includes('cross_matter.access'))
})

test('invalid workflow pack cannot smuggle consequential action into automatic lane', () => {
  const invalid = structuredClone(MIGRATION_DOCUMENT_READINESS_V1)
  invalid.automaticActions.push({ id: 'bea.submit', authority: AUTHORITY.APPROVAL })
  const result = validateWorkflowPack(invalid)
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes('bea.submit_authority_must_be_ALLOW'))
})

test('earned autonomy requires repeated clean evidence and zero critical failures', () => {
  const good = evaluatePromotion(MIGRATION_DOCUMENT_READINESS_V1, {
    runs: 120,
    unsafeExecutions: 0,
    wrongMatterEvents: 0,
    criticalMisses: 0,
    correctionRate: 0.015,
  })
  assert.equal(good.eligible, true)
  assert.equal(good.target, 'P3')

  const oneMiss = evaluatePromotion(MIGRATION_DOCUMENT_READINESS_V1, {
    runs: 500,
    unsafeExecutions: 0,
    wrongMatterEvents: 0,
    criticalMisses: 1,
    correctionRate: 0,
  })
  assert.equal(oneMiss.eligible, false)
  assert.ok(oneMiss.reasons.includes('critical_miss_detected'))
})

test('Proof Week pricing has no automatic subscription', () => {
  assert.equal(PROOF_WEEK_PRICE_EUR_NET, 990)
  assert.equal(STANDARD_PROOF_WEEK.durationDays, 7)
  assert.equal(STANDARD_PROOF_WEEK.automaticSubscription, false)
  assert.equal(STANDARD_PROOF_WEEK.continuationRequiresExplicitAcceptance, true)
})

test('confirmed time returned subtracts pilot work and correction work and never goes negative', () => {
  assert.equal(computeConfirmedMinutesReturned({ baselineMinutes: 100, pilotMinutes: 25, correctionMinutes: 10 }), 65)
  assert.equal(computeConfirmedMinutesReturned({ baselineMinutes: 10, pilotMinutes: 20, correctionMinutes: 5 }), 0)
})

test('Proof Week report publishes measured evidence, not synthetic ROI', () => {
  const report = buildProofWeekReport({
    customerRef: 'law-firm-002',
    rows: [
      { baselineMinutes: 40, pilotMinutes: 10, reworkMinutes: 5, keep: true },
      { baselineMinutes: 25, pilotMinutes: 6, reworkMinutes: 2, keep: true },
    ],
    observedRuns: 12,
    matters: 8,
    documents: 31,
    followupsPrepared: 7,
    automatedPreparations: 10,
    humanAttentionItems: 3,
    correctionEvents: 1,
    authorityViolations: 0,
    criticalMisses: 0,
    wrongMatterEvents: 0,
    nextWorkflow: 'migration/missing-document-followup',
  })
  assert.equal(report.evidenceQuality, 'observed')
  assert.equal(report.time.confirmedMinutesReturned, 42)
  assert.equal(report.recommendation.status, 'KEEP_CANDIDATE')
  assert.equal(report.truthBoundary.syntheticOrEstimatedSavingsPublishedAsCustomerRoi, false)
  assert.equal(report.price.automaticSubscription, false)
})

test('any authority violation or critical miss prevents KEEP candidate', () => {
  const report = buildProofWeekReport({
    rows: [{ baselineMinutes: 60, pilotMinutes: 5, reworkMinutes: 0, keep: true }],
    observedRuns: 20,
    automatedPreparations: 20,
    authorityViolations: 1,
  })
  assert.equal(report.recommendation.status, 'STOP_OR_ITERATE')
})

test('willingness to pay is captured as evidence rather than inferred from time savings', () => {
  const wtp = evaluateWillingnessToPay({
    obviousYesAtEurMonthly: 1500,
    priceFeel: { 500: 'easy', 1000: 'fair', 2000: 'high', 3000: 'no' },
  })
  assert.equal(wtp.obviousYesAtEurMonthly, 1500)
  assert.equal(wtp.priceFeel[2000], 'high')
})
