import crypto from 'node:crypto'

export const AUTOPILOT_VERSION = 'kanzlei-autopilot/0.1'
export const DECISIONS = Object.freeze({ ALLOW: 'ALLOW', APPROVAL: 'APPROVAL', BLOCK: 'BLOCK' })

export const WORKFLOW_TARGETS = Object.freeze({
  intake_structure: { owner: 'team', before_minutes: 60, target_after_minutes: 15, label: 'Mandatsaufnahme strukturieren' },
  document_triage: { owner: 'team', before_minutes: 12, target_after_minutes: 3, label: 'Dokument zuordnen / prüfen vorbereiten' },
  missing_document_followup: { owner: 'team', before_minutes: 8, target_after_minutes: 1, label: 'Fehlende Unterlage nachfordern' },
  case_timeline: { owner: 'lawyer', before_minutes: 45, target_after_minutes: 10, label: 'Aktenchronologie aktualisieren' },
  legal_research: { owner: 'lawyer', before_minutes: 60, target_after_minutes: 15, label: 'Rechtsrecherche vorbereiten' },
  first_draft: { owner: 'lawyer', before_minutes: 75, target_after_minutes: 20, label: 'Erstentwurf vorbereiten' },
  routine_client_update: { owner: 'team', before_minutes: 8, target_after_minutes: 1, label: 'Sachstands-/Eingangsmitteilung' },
  deadline_triage: { owner: 'lawyer', before_minutes: 15, target_after_minutes: 4, label: 'Fristkandidat prüfen' },
  billing_preparation: { owner: 'team', before_minutes: 15, target_after_minutes: 4, label: 'Abrechnung vorbereiten' },
})

const ACTIONS = Object.freeze({
  'intake.structure': { decision: DECISIONS.ALLOW, reason: 'Strukturierung erzeugt noch keine rechtliche Außenwirkung.' },
  'document.ocr': { decision: DECISIONS.ALLOW, reason: 'Textextraktion ist vorbereitend.' },
  'document.classify': { decision: DECISIONS.ALLOW, reason: 'Dokumentart darf vorgeschlagen werden; Verwendbarkeit bleibt Review.' },
  'document.dedupe': { decision: DECISIONS.ALLOW, reason: 'Duplikaterkennung verändert keine rechtliche Bewertung.' },
  'document.missing.request': { decision: DECISIONS.APPROVAL, reason: 'Routine-Nachforderung ist standardmäßig freigabepflichtig und kann nur unter allen geprüften Bedingungen ALLOW werden.' },
  'client.routine_status.send': { decision: DECISIONS.APPROVAL, reason: 'Routine-Sachstand ist standardmäßig freigabepflichtig und kann nur unter allen geprüften Bedingungen ALLOW werden.' },
  'timeline.propose': { decision: DECISIONS.ALLOW, reason: 'Chronologie wird als überprüfbarer Vorschlag aktualisiert.' },
  'deadline.propose': { decision: DECISIONS.ALLOW, reason: 'Frist wird nur als Kandidat mit Quelle vorgeschlagen.' },
  'deadline.confirm': { decision: DECISIONS.APPROVAL, reason: 'Verbindliche Fristbestätigung bleibt menschliche Kanzleiautorität.' },
  'research.prepare': { decision: DECISIONS.ALLOW, reason: 'Recherchepaket mit Quellen ist Vorbereitung.' },
  'draft.prepare': { decision: DECISIONS.ALLOW, reason: 'Entwurf darf vorbereitet, aber nicht verbindlich versendet werden.' },
  'client.substantive_advice.send': { decision: DECISIONS.APPROVAL, reason: 'Substantive Rechtsberatung nach außen braucht anwaltliche Freigabe.' },
  'bea.package.prepare': { decision: DECISIONS.ALLOW, reason: 'beA-Unterlagen dürfen vorbereitet und validiert werden.' },
  'bea.submit': { decision: DECISIONS.APPROVAL, reason: 'Einreichung ist eine rechtlich relevante Außenhandlung.' },
  'matter.accept': { decision: DECISIONS.APPROVAL, reason: 'Mandatsannahme bleibt bei der Kanzlei.' },
  'billing.prepare': { decision: DECISIONS.ALLOW, reason: 'Abrechnungsentwurf ist vorbereitend.' },
  'invoice.send': { decision: DECISIONS.APPROVAL, reason: 'V1 versendet Rechnungen nicht autonom.' },
  'bank_details.change': { decision: DECISIONS.BLOCK, reason: 'Bankdatenänderungen sind für den Agenten gesperrt.' },
  'authority.expand': { decision: DECISIONS.BLOCK, reason: 'Der Agent darf seine eigene Autorität nie erweitern.' },
  'final_legal_decision': { decision: DECISIONS.BLOCK, reason: 'Finale Rechtsentscheidung ist keine Agentenkompetenz.' },
  'cross_matter.read': { decision: DECISIONS.BLOCK, reason: 'Mandatsgrenzen dürfen nicht überschritten werden.' },
})

export function digest(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex')
}

export function decideAction(action, context = {}) {
  if (context.cross_tenant === true || context.cross_matter === true) {
    return { action, decision: DECISIONS.BLOCK, reason: 'Tenant-/Mandatsgrenze verletzt.' }
  }
  const base = ACTIONS[action]
  if (!base) return { action, decision: DECISIONS.BLOCK, reason: 'Unbekannte Aktion wird fail-closed blockiert.' }

  if (action === 'document.missing.request' || action === 'client.routine_status.send') {
    const factual = context.source_event_verified === true
    const template = context.template_approved_by_lawyer === true
    const relationship = context.client_channel_verified === true
    const checklist = action === 'document.missing.request' ? context.checklist_approved_by_lawyer === true : true
    const duplicate = context.already_requested === true
    if (duplicate) return { action, decision: DECISIONS.BLOCK, reason: 'Doppelte Nachforderung wird unterdrückt.' }
    if (factual && template && relationship && checklist) {
      return { action, decision: DECISIONS.ALLOW, reason: 'Nur faktische, vorab freigegebene Routinekommunikation innerhalb des Mandats.' }
    }
    return { action, decision: DECISIONS.APPROVAL, reason: 'Routinekommunikation ist nur bei freigegebener Vorlage, Quelle und Mandatskontext autonom.' }
  }

  return { action, ...base }
}

export function normaliseCase(input = {}) {
  const caseId = String(input.case_id ?? '').trim()
  const tenantId = String(input.tenant_id ?? '').trim()
  if (!caseId) throw new Error('case_id fehlt')
  if (!tenantId) throw new Error('tenant_id fehlt')
  return {
    tenant_id: tenantId,
    case_id: caseId,
    matter_type: String(input.matter_type ?? 'unknown'),
    stage: String(input.stage ?? 'intake'),
    client_channel_verified: input.client_channel_verified === true,
    checklist: {
      approved_by_lawyer: input.checklist?.approved_by_lawyer === true,
      version: String(input.checklist?.version ?? 'draft'),
      items: Array.isArray(input.checklist?.items) ? input.checklist.items : [],
    },
    documents: Array.isArray(input.documents) ? input.documents : [],
    source_events: Array.isArray(input.source_events) ? input.source_events : [],
    deadline_candidates: Array.isArray(input.deadline_candidates) ? input.deadline_candidates : [],
    needs_research: input.needs_research === true,
    needs_draft: input.needs_draft === true,
    routine_status_due: input.routine_status_due === true,
    billing_due: input.billing_due === true,
    matter_acceptance_pending: input.matter_acceptance_pending === true,
    bea_submission_due: input.bea_submission_due === true,
    template_approved_by_lawyer: input.template_approved_by_lawyer === true,
  }
}

function planned(caseState, action, context = {}, priority = 50, note = '') {
  const authority = decideAction(action, context)
  return {
    case_id: caseState.case_id,
    tenant_id: caseState.tenant_id,
    action,
    priority,
    note,
    ...authority,
    context_digest: digest(JSON.stringify({
      tenant_id: caseState.tenant_id,
      case_id: caseState.case_id,
      action,
      checklist_version: caseState.checklist.version,
      context,
    })),
  }
}

export function compileCasePlan(rawCase) {
  const c = normaliseCase(rawCase)
  const actions = []

  if (c.stage === 'intake') actions.push(planned(c, 'intake.structure', {}, 55, 'Mandatsangaben strukturieren und offene Fakten markieren.'))

  for (const doc of c.documents) {
    if (doc.ocr_done !== true) actions.push(planned(c, 'document.ocr', {}, 35, `OCR vorbereiten: ${doc.id ?? 'Dokument'}`))
    if (doc.classification_confirmed !== true) actions.push(planned(c, 'document.classify', {}, 40, `Dokumentart vorschlagen: ${doc.id ?? 'Dokument'}`))
    if (doc.dedupe_checked !== true) actions.push(planned(c, 'document.dedupe', {}, 30, `Duplikate prüfen: ${doc.id ?? 'Dokument'}`))
  }

  for (const item of c.checklist.items) {
    if (!['missing', 'rejected'].includes(item.status)) continue
    actions.push(planned(c, 'document.missing.request', {
      source_event_verified: true,
      template_approved_by_lawyer: c.template_approved_by_lawyer,
      client_channel_verified: c.client_channel_verified,
      checklist_approved_by_lawyer: c.checklist.approved_by_lawyer,
      already_requested: item.status === 'missing' ? item.requested === true : item.re_requested === true,
    }, 60, `Fehlende Unterlage: ${item.label ?? item.id ?? 'Dokument'}`))
  }

  if (c.source_events.some((e) => e.timeline_processed !== true)) {
    actions.push(planned(c, 'timeline.propose', {}, 65, 'Neue Ereignisse in überprüfbare Chronologie überführen.'))
  }

  for (const deadline of c.deadline_candidates) {
    if (deadline.confirmed === true) continue
    actions.push(planned(c, 'deadline.propose', {}, 90, `Fristkandidat mit Quelle vorbereiten: ${deadline.label ?? 'Frist'}`))
    actions.push(planned(c, 'deadline.confirm', {}, 100, `Frist verbindlich bestätigen: ${deadline.label ?? 'Frist'}`))
  }

  if (c.needs_research) actions.push(planned(c, 'research.prepare', {}, 70, 'GitLaw Recherchepaket mit verifizierbaren Quellen vorbereiten.'))
  if (c.needs_draft) actions.push(planned(c, 'draft.prepare', {}, 75, 'Erstentwurf aus Aktenstand + Quellen vorbereiten.'))

  if (c.routine_status_due) {
    actions.push(planned(c, 'client.routine_status.send', {
      source_event_verified: true,
      template_approved_by_lawyer: c.template_approved_by_lawyer,
      client_channel_verified: c.client_channel_verified,
    }, 45, 'Faktische Sachstandsmitteilung aus geprüftem Aktenereignis.'))
  }

  if (c.billing_due) actions.push(planned(c, 'billing.prepare', {}, 25, 'Abrechnung aus dokumentierten Tätigkeiten vorbereiten.'))
  if (c.matter_acceptance_pending) actions.push(planned(c, 'matter.accept', {}, 95, 'Mandatsannahme prüfen.'))
  if (c.bea_submission_due) {
    actions.push(planned(c, 'bea.package.prepare', {}, 85, 'beA-Paket + Anhänge vorbereiten.'))
    actions.push(planned(c, 'bea.submit', {}, 100, 'beA-Einreichung anwaltlich freigeben.'))
  }

  return actions.sort((a, b) => b.priority - a.priority || a.action.localeCompare(b.action))
}

export function compileLawyerDesk(cases) {
  const all = cases.flatMap(compileCasePlan)
  const lawyer = all.filter((a) => a.decision === DECISIONS.APPROVAL)
  const blocked = all.filter((a) => a.decision === DECISIONS.BLOCK)
  const autonomous = all.filter((a) => a.decision === DECISIONS.ALLOW)
  return {
    schema: AUTOPILOT_VERSION,
    total_actions: all.length,
    autonomous_actions: autonomous.length,
    lawyer_attention_items: lawyer.length,
    blocked_actions: blocked.length,
    autonomy_rate_percent: all.length ? Math.round((autonomous.length / all.length) * 1000) / 10 : 0,
    needs_bao: lawyer.slice(0, 20),
    automatic: autonomous,
    blocked,
  }
}

export function measureTimeSavings(entries = []) {
  const measured = []
  const unmeasured = []
  for (const e of entries) {
    const before = Number(e.before_minutes)
    const after = Number(e.after_minutes)
    if (e.baseline_confirmed !== true || !Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0) {
      unmeasured.push({ workflow: e.workflow, reason: 'confirmed_nonnegative_baseline_required' })
      continue
    }
    measured.push({ workflow: e.workflow, before_minutes: before, after_minutes: after, saved_minutes: Math.max(0, before - after) })
  }
  const before = measured.reduce((s, x) => s + x.before_minutes, 0)
  const after = measured.reduce((s, x) => s + x.after_minutes, 0)
  const saved = measured.reduce((s, x) => s + x.saved_minutes, 0)
  return {
    measured_workflows: measured.length,
    unmeasured_workflows: unmeasured,
    minutes_before: before,
    minutes_after: after,
    minutes_saved: saved,
    hours_returned: Math.round((saved / 60) * 100) / 100,
    time_reduction_percent: before > 0 ? Math.round(((before - after) / before) * 1000) / 10 : null,
    measured,
  }
}

export function syntheticReferenceWeek({ matters = 20 } = {}) {
  if (!Number.isInteger(matters) || matters < 1 || matters > 200) throw new Error('matters muss 1–200 sein')
  const counts = {
    intake_structure: Math.ceil(matters * 0.35),
    document_triage: matters * 5,
    missing_document_followup: Math.ceil(matters * 1.5),
    case_timeline: Math.ceil(matters * 0.75),
    legal_research: Math.ceil(matters * 0.35),
    first_draft: Math.ceil(matters * 0.3),
    routine_client_update: matters * 2,
    deadline_triage: Math.ceil(matters * 0.25),
    billing_preparation: Math.ceil(matters * 0.25),
  }
  let before = 0
  let target = 0
  const rows = []
  for (const [workflow, count] of Object.entries(counts)) {
    const cfg = WORKFLOW_TARGETS[workflow]
    const rowBefore = count * cfg.before_minutes
    const rowAfter = count * cfg.target_after_minutes
    before += rowBefore
    target += rowAfter
    rows.push({ workflow, label: cfg.label, count, before_minutes: rowBefore, target_after_minutes: rowAfter, target_saved_minutes: rowBefore - rowAfter })
  }
  return {
    label: 'synthetic_engineering_target_not_customer_evidence',
    matters,
    rows,
    total_before_minutes: before,
    total_target_after_minutes: target,
    target_hours_returned: Math.round(((before - target) / 60) * 10) / 10,
    target_reduction_percent: Math.round(((before - target) / before) * 1000) / 10,
  }
}
