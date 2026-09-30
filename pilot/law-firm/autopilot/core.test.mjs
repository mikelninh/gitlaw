import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DECISIONS,
  decideAction,
  compileCasePlan,
  compileLawyerDesk,
  measureTimeSavings,
  syntheticReferenceWeek,
} from './core.mjs'

const readyCase = (patch = {}) => ({
  tenant_id: 'bao-kanzlei',
  case_id: 'MIG-001',
  matter_type: 'migration',
  stage: 'intake',
  client_channel_verified: true,
  template_approved_by_lawyer: true,
  checklist: {
    approved_by_lawyer: true,
    version: 'migration-v3',
    items: [
      { id: 'passport', label: 'Reisepass', status: 'missing', requested: false },
      { id: 'salary', label: 'Gehaltsnachweis', status: 'received' },
    ],
  },
  documents: [{ id: 'doc-1', ocr_done: false, classification_confirmed: false, dedupe_checked: false }],
  source_events: [{ id: 'event-1', timeline_processed: false }],
  deadline_candidates: [{ id: 'd-1', label: 'Antwortfrist Behörde', confirmed: false }],
  needs_research: true,
  needs_draft: true,
  routine_status_due: true,
  billing_due: true,
  matter_acceptance_pending: false,
  bea_submission_due: false,
  ...patch,
})

test('unknown and self-expanding actions fail closed', () => {
  assert.equal(decideAction('does.not.exist').decision, DECISIONS.BLOCK)
  assert.equal(decideAction('authority.expand').decision, DECISIONS.BLOCK)
  assert.equal(decideAction('bank_details.change').decision, DECISIONS.BLOCK)
  assert.equal(decideAction('final_legal_decision').decision, DECISIONS.BLOCK)
})

test('cross-matter or cross-tenant context blocks even otherwise safe actions', () => {
  assert.equal(decideAction('research.prepare', { cross_matter: true }).decision, DECISIONS.BLOCK)
  assert.equal(decideAction('document.ocr', { cross_tenant: true }).decision, DECISIONS.BLOCK)
})

test('missing-document requests are autonomous only inside lawyer-approved checklist and template', () => {
  const safe = decideAction('document.missing.request', {
    source_event_verified: true,
    template_approved_by_lawyer: true,
    client_channel_verified: true,
    checklist_approved_by_lawyer: true,
    already_requested: false,
  })
  assert.equal(safe.decision, DECISIONS.ALLOW)

  for (const patch of [
    { template_approved_by_lawyer: false },
    { client_channel_verified: false },
    { checklist_approved_by_lawyer: false },
    { source_event_verified: false },
  ]) {
    const d = decideAction('document.missing.request', {
      source_event_verified: true,
      template_approved_by_lawyer: true,
      client_channel_verified: true,
      checklist_approved_by_lawyer: true,
      already_requested: false,
      ...patch,
    })
    assert.equal(d.decision, DECISIONS.APPROVAL)
  }
})

test('duplicate document chase is suppressed', () => {
  assert.equal(decideAction('document.missing.request', {
    source_event_verified: true,
    template_approved_by_lawyer: true,
    client_channel_verified: true,
    checklist_approved_by_lawyer: true,
    already_requested: true,
  }).decision, DECISIONS.BLOCK)
})

test('deadline extraction is autonomous but binding deadline confirmation is not', () => {
  assert.equal(decideAction('deadline.propose').decision, DECISIONS.ALLOW)
  assert.equal(decideAction('deadline.confirm').decision, DECISIONS.APPROVAL)
})

test('draft/research/beA preparation can run, substantive send and beA submission require approval', () => {
  assert.equal(decideAction('research.prepare').decision, DECISIONS.ALLOW)
  assert.equal(decideAction('draft.prepare').decision, DECISIONS.ALLOW)
  assert.equal(decideAction('bea.package.prepare').decision, DECISIONS.ALLOW)
  assert.equal(decideAction('client.substantive_advice.send').decision, DECISIONS.APPROVAL)
  assert.equal(decideAction('bea.submit').decision, DECISIONS.APPROVAL)
})

test('ready migration case compiles most work into autonomous preparation and surfaces only consequential approvals', () => {
  const plan = compileCasePlan(readyCase())
  const allowed = plan.filter((x) => x.decision === DECISIONS.ALLOW)
  const approval = plan.filter((x) => x.decision === DECISIONS.APPROVAL)
  assert.ok(allowed.length >= 9)
  assert.equal(approval.some((x) => x.action === 'deadline.confirm'), true)
  assert.equal(approval.some((x) => x.action === 'client.substantive_advice.send'), false)
  assert.equal(plan.every((x) => x.context_digest.length === 64), true)
})

test('beA submission appears on lawyer desk while preparation stays automatic', () => {
  const plan = compileCasePlan(readyCase({ bea_submission_due: true }))
  assert.equal(plan.find((x) => x.action === 'bea.package.prepare').decision, DECISIONS.ALLOW)
  assert.equal(plan.find((x) => x.action === 'bea.submit').decision, DECISIONS.APPROVAL)
})

test('lawyer desk compresses attention to approval items rather than every action', () => {
  const desk = compileLawyerDesk([
    readyCase(),
    readyCase({ case_id: 'MIG-002', deadline_candidates: [], needs_research: false, needs_draft: true }),
  ])
  assert.ok(desk.total_actions > desk.lawyer_attention_items)
  assert.ok(desk.autonomy_rate_percent >= 70)
  assert.equal(desk.needs_bao.every((x) => x.decision === DECISIONS.APPROVAL), true)
})

test('time savings require confirmed real baseline and never infer ROI from assumptions', () => {
  const r = measureTimeSavings([
    { workflow: 'intake', before_minutes: 60, after_minutes: 15, baseline_confirmed: true },
    { workflow: 'draft', before_minutes: 75, after_minutes: 20, baseline_confirmed: true },
    { workflow: 'unknown', before_minutes: 60, after_minutes: 10, baseline_confirmed: false },
  ])
  assert.equal(r.measured_workflows, 2)
  assert.equal(r.minutes_saved, 100)
  assert.equal(r.hours_returned, 1.67)
  assert.equal(r.unmeasured_workflows.length, 1)
})

test('synthetic reference week is explicitly labelled as an engineering target, not customer evidence', () => {
  const r = syntheticReferenceWeek({ matters: 20 })
  assert.equal(r.label, 'synthetic_engineering_target_not_customer_evidence')
  assert.equal(r.matters, 20)
  assert.ok(r.target_hours_returned > 10)
  assert.ok(r.target_reduction_percent > 50)
  assert.throws(() => syntheticReferenceWeek({ matters: 0 }), /1–200/)
})
