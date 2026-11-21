import test from 'node:test'
import assert from 'node:assert/strict'
import { extractDateCandidates, normalizeChannelItem, planChannelIntake } from './channel-intake.mjs'
import { DECISIONS } from './core.mjs'

const cases = [
  { id: 'case-1', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26' },
  { id: 'case-2', tenant_id: 'bao-kanzlei', aktenzeichen: '456/26' },
  { id: 'other-1', tenant_id: 'other-kanzlei', aktenzeichen: '999/26' },
]

test('real mandate data stays blocked until production data gate is explicit', () => {
  const r = planChannelIntake({
    item: { channel: 'email', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26', data_mode: 'real_mandate', subject: 'Neue Unterlage' },
    localCases: cases,
    productionDataAuthorized: false,
  })
  assert.equal(r.status, 'blocked')
  assert.equal(r.reason, 'real_mandate_data_gate_incomplete')
  assert.equal(r.providerCalls, 0)
})

test('exact case number can prepare synthetic/redacted intake without external consequence', () => {
  const r = planChannelIntake({
    item: {
      channel: 'email', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26', data_mode: 'redacted',
      external_id: 'mail-1', sender: 'client@example.test', subject: 'Unterlagen bis 15.09.2026',
      text: 'Bitte beachten Sie die Frist bis zum 15.09.2026.',
      attachments: [{ id: 'a1', name: 'pass.pdf', mime: 'application/pdf', size: 123, sha256: 'abc' }],
    },
    localCases: cases,
  })
  assert.equal(r.status, 'prepared')
  assert.equal(r.decision, DECISIONS.ALLOW)
  assert.equal(r.local_case_id, 'case-1')
  assert.equal(r.constraints.legal_usability_confirmed, false)
  assert.equal(r.constraints.deadline_confirmed, false)
  assert.equal(r.constraints.external_message_sent, false)
  assert.equal(r.work.attachments[0].next.includes('human_document_review'), true)
  assert.equal(r.work.date_candidates[0].date, '2026-09-15')
  assert.equal(r.work.date_candidates[0].status, 'candidate_only')
  assert.equal(r.work.date_candidates[0].lawyer_confirmation_required, true)
})

test('sender identity alone is never sufficient to auto-file legal correspondence', () => {
  const r = planChannelIntake({
    item: { channel: 'email', tenant_id: 'bao-kanzlei', sender: 'known-client@example.test', subject: 'Hallo' },
    localCases: cases,
  })
  assert.equal(r.status, 'approval_required')
  assert.equal(r.reason, 'case_match_required')
})

test('same file number in same tenant becomes ambiguous rather than silently filing', () => {
  const r = planChannelIntake({
    item: { channel: 'portal', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26', subject: 'Upload' },
    localCases: [...cases, { id: 'case-duplicate', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26' }],
  })
  assert.equal(r.status, 'approval_required')
  assert.equal(r.reason, 'ambiguous_case_match')
  assert.equal(r.candidates.length, 2)
})

test('tenant boundary prevents matching another law firm case with same external number', () => {
  const r = planChannelIntake({
    item: { channel: 'scan', tenant_id: 'bao-kanzlei', aktenzeichen: '999/26', subject: 'Scan' },
    localCases: cases,
  })
  assert.equal(r.status, 'approval_required')
  assert.equal(r.reason, 'case_match_required')
})

test('duplicate inbound item is suppressed before creating work', () => {
  const item = normalizeChannelItem({ channel: 'email', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26', external_id: 'mail-1', subject: 'Same' })
  const r = planChannelIntake({ item, localCases: cases, seenFingerprints: [item.content_digest] })
  assert.equal(r.status, 'duplicate_suppressed')
  assert.equal(r.decision, DECISIONS.BLOCK)
})

test('date extraction creates candidates only and never a binding legal deadline', () => {
  const candidates = extractDateCandidates('Antwort bitte bis spätestens zum 03.10.2026. Termin 2026-10-08.')
  assert.deepEqual(candidates.map(x => x.date), ['2026-10-03', '2026-10-08'])
  assert.equal(candidates.every(x => x.status === 'candidate_only' && x.lawyer_confirmation_required === true), true)
  assert.equal(candidates[0].deadline_cue, true)
})

test('unsupported channel fails closed', () => {
  const r = planChannelIntake({ item: { channel: 'random-social-network', tenant_id: 'bao-kanzlei', aktenzeichen: '123/26' }, localCases: cases })
  assert.equal(r.status, 'blocked')
  assert.equal(r.reason, 'unsupported_channel')
})
