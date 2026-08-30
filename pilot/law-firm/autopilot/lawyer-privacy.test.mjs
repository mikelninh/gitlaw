import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPrivacyReceipt,
  detectSensitiveClasses,
  evaluateLawyerAiEgress,
  privacyReadiness,
  verifyPrivacyReceipt,
} from '../../../api/_lawyer-privacy.ts'

const COMPLETE_ENV = {
  LAWYER_PRIVACY_ENFORCE: '1',
  LEGAL_AI_REAL_MANDATE_ENABLED: '1',
  LEGAL_AI_PROVIDER: 'openai',
  LEGAL_AI_PROVIDER_CONTRACT_REVIEWED: '1',
  LEGAL_AI_CONFIDENTIALITY_CONFIRMED: '1',
  LEGAL_AI_DPA_CONFIRMED: '1',
  LEGAL_AI_SUBPROCESSORS_REVIEWED: '1',
  LEGAL_AI_SECRET_PROTECTION_REVIEWED: '1',
  LEGAL_AI_ZERO_RETENTION_CONFIRMED: '1',
  LEGAL_AI_TOMS_REVIEWED: '1',
  LEGAL_AI_DPIA_REVIEWED: '1',
  LEGAL_AI_INCIDENT_PROCESS_READY: '1',
  LEGAL_AI_DELETION_PROCESS_READY: '1',
  PRIVACY_RECEIPT_SIGNING_KEY: 'test-only-not-production-secret',
}

const SAFE_REAL = {
  dataMode: 'real_mandate',
  purpose: 'migration-law research on pseudonymised facts',
  caseRef: 'matter_pseudo_17',
  clientConsent: true,
  externalServiceNecessary: true,
  redactionApplied: true,
  memoryScope: 'none',
}

test('real mandate AI is not ready by default', () => {
  const r = privacyReadiness({})
  assert.equal(r.shadowModeReady, true)
  assert.equal(r.realMandateAiReady, false)
})

test('sensitive classes catch canaries and common direct identifiers', () => {
  const found = detectSensitiveClasses('Frau Mustermann, test@example.com, DE89370400440532013000 MANDATE-CANARY-ABC123')
  assert.deepEqual(found, ['canary_secret', 'email', 'iban', 'named_person'])
})

test('real mandate remains blocked when provider/contract gate is incomplete', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Person A beantragt Verlängerung nach § 8 AufenthG.',
    privacy: SAFE_REAL,
    env: { LAWYER_PRIVACY_ENFORCE: '1' },
  })
  assert.equal(decision.decision, 'BLOCK')
  assert.ok(decision.reasons.includes('real_mandate_provider_gate_incomplete'))
})

test('real mandate requires consent, necessity, pseudonymisation and purpose even with complete provider gate', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Person A beantragt Verlängerung nach § 8 AufenthG.',
    privacy: { dataMode: 'real_mandate', caseRef: 'matter_1', memoryScope: 'none' },
    env: COMPLETE_ENV,
  })
  assert.equal(decision.decision, 'BLOCK')
  assert.ok(decision.reasons.includes('client_consent_required_for_mandate_specific_external_service'))
  assert.ok(decision.reasons.includes('external_service_necessity_not_attested'))
  assert.ok(decision.reasons.includes('pseudonymisation_required_before_external_ai'))
  assert.ok(decision.reasons.includes('specific_purpose_required'))
})

test('raw identifiers block even after every organisational gate is complete', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Frau Mustermann unter test@example.com beantragt Verlängerung nach § 8 AufenthG.',
    privacy: SAFE_REAL,
    env: COMPLETE_ENV,
  })
  assert.equal(decision.decision, 'BLOCK')
  assert.ok(decision.reasons.includes('raw_identifier_detected_in_real_mandate_payload'))
  assert.deepEqual(decision.detectedClasses, ['email', 'named_person'])
})

test('cross-prompt approved memory is disabled for privileged real-mandate calls', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Person A beantragt Verlängerung nach § 8 AufenthG.',
    approvedMemory: [{ question: 'Earlier matter', approvedAnswer: 'Earlier answer' }],
    privacy: SAFE_REAL,
    env: COMPLETE_ENV,
  })
  assert.equal(decision.decision, 'BLOCK')
  assert.ok(decision.reasons.includes('approved_memory_disabled_for_real_mandate_ai'))
})

test('fully gated pseudonymised real-mandate research can be released to the single approved provider', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Person A beantragt Verlängerung nach § 8 AufenthG; Beschäftigungswechsel ist streitig.',
    privacy: SAFE_REAL,
    env: COMPLETE_ENV,
  })
  assert.equal(decision.decision, 'ALLOW')
  assert.equal(decision.provider, 'openai')
  assert.deepEqual(decision.reasons, [])
})

test('proof receipt contains digests not prompt text and detects tampering', () => {
  const decision = evaluateLawyerAiEgress({
    question: 'Person A beantragt Verlängerung nach § 8 AufenthG.',
    privacy: SAFE_REAL,
    env: COMPLETE_ENV,
  })
  const receipt = createPrivacyReceipt({
    decision,
    privacy: SAFE_REAL,
    providerRequestId: 'req_123',
    model: 'gpt-safe',
    at: '2026-08-30T09:00:00.000Z',
    signingKey: COMPLETE_ENV.PRIVACY_RECEIPT_SIGNING_KEY,
  })
  assert.equal(verifyPrivacyReceipt(receipt, COMPLETE_ENV.PRIVACY_RECEIPT_SIGNING_KEY), true)
  assert.equal(JSON.stringify(receipt).includes('Person A beantragt'), false)
  assert.equal(receipt.signatureAlgorithm, 'HMAC-SHA256')
  const tampered = { ...receipt, decision: 'BLOCK' }
  assert.equal(verifyPrivacyReceipt(tampered, COMPLETE_ENV.PRIVACY_RECEIPT_SIGNING_KEY), false)
})
