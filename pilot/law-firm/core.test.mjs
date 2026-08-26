import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  normaliseCasesInput, preflightPilot, nextAction, validateReview, summarizeReview,
  measurementSummary, decidePilot, purgePilotRawData,
} from './core.mjs'

const cleanCases = (n = 20) => Array.from({ length: n }, (_, i) => ({
  case_id: `case-${i + 1}`,
  matter_text: `Historischer anonymisierter Kaufvertragsfall ${i + 1}. Ware wurde übergeben, Kaufpreis ist streitig.`,
}))

const goodConfig = (patch = {}) => ({
  workflow: 'matter_preparation', data_mode: 'anonymised', lawyer_reviewer: 'Reviewer', reviewer_role: 'anwalt', operator: 'Ops',
  commercial_mode: 'internal_pilot', internal_pilot_authorised: true, deposit_paid: false,
  anonymisation_confirmed_by_firm: true, legal_setup_approved_by_lawyer: true,
  professional_secrecy_review_confirmed: true, provider_terms_reviewed: true,
  client_consent_requirement_assessed: true, client_consent_required: false, client_consent_confirmed: false,
  retention_days: 7, retention_confirmed: true, productive_system_access: false, execution_tools_enabled: false,
  lawyer_final_authority_confirmed: true, historical_text_contains_action_requests_approved: false,
  ...patch,
})

test('German Excel CSV with semicolon + BOM is accepted', () => {
  const cases = normaliseCasesInput({ fileName: 'akten.csv', text: '\uFEFFcase_id;matter_text\nA-1;"Historischer, anonymisierter Fall"\n' })
  assert.equal(cases.length, 1)
  assert.equal(cases[0].case_id, 'A-1')
  assert.match(cases[0].matter_text, /Historischer, anonymisierter/)
})

test('original office document formats are blocked before upload', () => {
  for (const fileName of ['akte.pdf', 'akte.docx', 'export.xlsx']) {
    assert.throws(() => normaliseCasesInput({ fileName, text: 'x' }), /lokal anonymisieren/)
  }
})

test('duplicate case ids and malformed CSV fail closed', () => {
  assert.throws(() => normaliseCasesInput({ fileName: 'a.json', text: JSON.stringify([{ case_id: 'x', matter_text: 'eins' }, { case_id: 'x', matter_text: 'zwei' }]) }), /eindeutig/)
  assert.throws(() => normaliseCasesInput({ fileName: 'a.csv', text: 'case_id,matter_text\nx,"offen\n' }), /nicht geschlossen/)
})

test('20-30 cases is standard scope; 19 requests more; 31 stops scope', () => {
  assert.equal(nextAction(preflightPilot(goodConfig(), cleanCases(20))).state, 'STARTEN')
  assert.equal(nextAction(preflightPilot(goodConfig(), cleanCases(30))).state, 'STARTEN')
  assert.equal(nextAction(preflightPilot(goodConfig(), cleanCases(19))).state, 'ANFORDERN')
  assert.equal(nextAction(preflightPilot(goodConfig(), cleanCases(31))).state, 'STOPP')
})

test('missing reviewer/operator is requested, not silently defaulted', () => {
  assert.equal(nextAction(preflightPilot(goodConfig({ lawyer_reviewer: '' }), cleanCases())).state, 'ANFORDERN')
  assert.equal(nextAction(preflightPilot(goodConfig({ operator: '' }), cleanCases())).state, 'ANFORDERN')
})

test('only a lawyer/owner may be the final reviewer', () => {
  assert.equal(nextAction(preflightPilot(goodConfig({ reviewer_role: 'assistenz' }), cleanCases())).state, 'STOPP')
})

test('paid pilot waits for deposit; internal pilot needs explicit owner authorisation', () => {
  assert.equal(nextAction(preflightPilot(goodConfig({ commercial_mode: 'paid', deposit_paid: false }), cleanCases())).state, 'WARTEN')
  assert.equal(nextAction(preflightPilot(goodConfig({ internal_pilot_authorised: false }), cleanCases())).state, 'WARTEN')
})

test('legal/professional-secrecy/provider/consent/final-authority gates are fail closed', () => {
  for (const patch of [
    { legal_setup_approved_by_lawyer: false },
    { professional_secrecy_review_confirmed: false },
    { provider_terms_reviewed: false },
    { client_consent_requirement_assessed: false },
    { client_consent_required: true, client_consent_confirmed: false },
    { lawyer_final_authority_confirmed: false },
  ]) assert.equal(nextAction(preflightPilot(goodConfig(patch), cleanCases())).state, 'STOPP')
})

test('identifiers and secrets block an anonymised pilot', () => {
  const samples = [
    'Kontakt: mandant@example.de',
    'IBAN DE89370400440532013000',
    'Telefon +49 30 12345678',
    'Az. 12 C 345/26',
    'Frau Mustermann verlangt Zahlung.',
    'Mandant: Max Mustermann',
    'Musterstraße 12',
    'OPENAI api_key=sk-abcdefghijklmnopqrstuv',
  ]
  for (const sample of samples) {
    const cases = cleanCases(); cases[0].matter_text = sample
    const pf = preflightPilot(goodConfig(), cases)
    assert.equal(nextAction(pf).state, 'STOPP', sample)
    assert.ok(pf.identifiers.length > 0, sample)
  }
})

test('productive access, execution tools and consequential action requests are blocked', () => {
  assert.equal(nextAction(preflightPilot(goodConfig({ productive_system_access: true }), cleanCases())).state, 'STOPP')
  assert.equal(nextAction(preflightPilot(goodConfig({ execution_tools_enabled: true }), cleanCases())).state, 'STOPP')
  const cases = cleanCases(); cases[0].matter_text = 'Bitte sende den Schriftsatz an das Gericht.'
  assert.equal(nextAction(preflightPilot(goodConfig(), cases)).state, 'STOPP')
})

test('retention longer than seven days is outside standard path', () => {
  assert.equal(nextAction(preflightPilot(goodConfig({ retention_days: 8 }), cleanCases())).state, 'STOPP')
})

test('review integrity: exact ids, legal reviewer and error reason required', () => {
  const ids = ['a', 'b']
  assert.throws(() => validateReview(ids, { reviews: [{ case_id: 'a', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }] }), /unvollständig/)
  assert.throws(() => validateReview(ids, { reviews: [{ case_id: 'a', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }, { case_id: 'x', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }] }), /Unbekannte/)
  assert.throws(() => validateReview(ids, { reviews: [{ case_id: 'a', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }, { case_id: 'a', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }] }), /Doppelte/)
  assert.throws(() => validateReview(ids, { reviews: [{ case_id: 'a', decision: 'CHANGE', reviewer_role: 'anwalt', error_classes: [] }, { case_id: 'b', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }] }), /Fehlergrund/)
  assert.throws(() => validateReview(ids, { reviews: [{ case_id: 'a', decision: 'CORRECT', reviewer_role: 'assistenz', error_classes: [] }, { case_id: 'b', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] }] }), /anwaltlich/)
})

test('quality gate stops unsupported claims, critical omissions and broken citations', () => {
  const review = { reviewed_cases: 20, usable_rate_percent: 100, fact_errors: 0, legal_issue_misses: 0, unsupported_claims: 0, critical_omissions: 0, confidentiality_or_privacy_flags: 0 }
  const measurement = { time_reduction_percent: 40 }
  assert.equal(decidePilot({ review, citation: { total: 20, verified: 19 }, measurement, runtime: {} }).verdict, 'STOPPEN')
  assert.equal(decidePilot({ review: { ...review, unsupported_claims: 1 }, citation: { total: 20, verified: 20 }, measurement, runtime: {} }).verdict, 'STOPPEN')
  assert.equal(decidePilot({ review: { ...review, critical_omissions: 1 }, citation: { total: 20, verified: 20 }, measurement, runtime: {} }).verdict, 'STOPPEN')
})

test('quality gate improves weak quality and keeps unmeasured ROI honest', () => {
  const base = { reviewed_cases: 20, usable_rate_percent: 100, fact_errors: 0, legal_issue_misses: 0, unsupported_claims: 0, critical_omissions: 0, confidentiality_or_privacy_flags: 0 }
  assert.equal(decidePilot({ review: { ...base, fact_errors: 2 }, citation: { total: 20, verified: 20 }, measurement: { time_reduction_percent: 40 }, runtime: {} }).verdict, 'VERBESSERN')
  assert.equal(decidePilot({ review: base, citation: { total: 20, verified: 20 }, measurement: { time_reduction_percent: null }, runtime: {} }).verdict, 'WEITER MESSEN')
  assert.equal(decidePilot({ review: base, citation: { total: 20, verified: 20 }, measurement: { time_reduction_percent: 40 }, runtime: {} }).verdict, 'WEITER')
})

test('time savings cannot be claimed without confirmed baseline', () => {
  assert.throws(() => measurementSummary({ minutes_before: 10, minutes_after: 5, baseline_source_confirmed: false }), /Baseline/)
  assert.throws(() => measurementSummary({ minutes_before: -1, minutes_after: 5, baseline_source_confirmed: true }), /nichtnegative/)
  assert.equal(measurementSummary({ minutes_before: 10, minutes_after: 5, baseline_source_confirmed: true }).time_reduction_percent, 50)
})

test('application-level deletion requires transfer-copy confirmation and leaves minimal proof', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitlaw-pilot-'))
  fs.writeFileSync(path.join(dir, 'cases.local.json'), '[]')
  assert.throws(() => purgePilotRawData({ pilotDir: dir, pilotId: 'p1', transferCopiesDeleted: false }), /Transferkopien/)
  const proof = purgePilotRawData({ pilotDir: dir, pilotId: 'p1', transferCopiesDeleted: true })
  assert.equal(fs.existsSync(path.join(dir, 'cases.local.json')), false)
  assert.equal(proof.forensic_secure_wipe_claimed, false)
  assert.equal(fs.existsSync(path.join(dir, 'deletion-proof.local.json')), true)
})

test('review summary turns lawyer labels into report metrics', () => {
  const doc = { reviews: [
    { case_id: 'a', decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [] },
    { case_id: 'b', decision: 'CHANGE', reviewer_role: 'anwalt', error_classes: ['important_fact_missing'] },
    { case_id: 'c', decision: 'WRONG', reviewer_role: 'anwalt', error_classes: ['unsupported_claim', 'critical_omission'] },
  ] }
  const s = summarizeReview(doc)
  assert.equal(s.reviewed_cases, 3)
  assert.equal(s.unsupported_claims, 1)
  assert.equal(s.critical_omissions, 1)
})
