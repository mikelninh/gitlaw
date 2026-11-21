export const AUTHORITY = Object.freeze({
  ALLOW: 'ALLOW',
  APPROVAL: 'APPROVAL',
  BLOCK: 'BLOCK',
})

export const AUTONOMY_LEVELS = Object.freeze(['P0', 'P1', 'P2', 'P3', 'P4'])

const REQUIRED_STRING_FIELDS = ['id', 'version', 'sector', 'domain', 'name', 'purpose']
const REQUIRED_ARRAY_FIELDS = ['triggers', 'requiredInputs', 'automaticActions', 'approvalActions', 'blockedActions', 'successCriteria', 'measurements']

export function validateWorkflowPack(pack) {
  const errors = []
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { valid: false, errors: ['pack_must_be_object'] }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof pack[field] !== 'string' || !pack[field].trim()) errors.push(`missing_${field}`)
  }
  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(pack[field]) || pack[field].length === 0) errors.push(`missing_${field}`)
  }

  if (!AUTONOMY_LEVELS.includes(pack.defaultAutonomy)) errors.push('invalid_default_autonomy')
  if (!pack.dataPolicy || typeof pack.dataPolicy !== 'object') errors.push('missing_data_policy')
  if (!pack.promotion || typeof pack.promotion !== 'object') errors.push('missing_promotion_policy')

  const actionIds = new Set()
  for (const bucket of ['automaticActions', 'approvalActions', 'blockedActions']) {
    for (const action of Array.isArray(pack[bucket]) ? pack[bucket] : []) {
      if (!action?.id || typeof action.id !== 'string') {
        errors.push(`${bucket}_action_missing_id`)
        continue
      }
      if (actionIds.has(action.id)) errors.push(`duplicate_action_${action.id}`)
      actionIds.add(action.id)
      const expected = bucket === 'automaticActions' ? AUTHORITY.ALLOW : bucket === 'approvalActions' ? AUTHORITY.APPROVAL : AUTHORITY.BLOCK
      if (action.authority !== expected) errors.push(`${action.id}_authority_must_be_${expected}`)
    }
  }

  if (pack.dataPolicy?.realMandateExternalAi !== AUTHORITY.BLOCK) errors.push('real_mandate_external_ai_must_default_block')
  if (pack.dataPolicy?.crossMatterAccess !== AUTHORITY.BLOCK) errors.push('cross_matter_access_must_block')

  return { valid: errors.length === 0, errors }
}

export function buildAuthorityMap(pack) {
  const validation = validateWorkflowPack(pack)
  if (!validation.valid) throw new Error(`invalid_workflow_pack:${validation.errors.join(',')}`)
  return {
    allow: pack.automaticActions.map(a => a.id),
    approval: pack.approvalActions.map(a => a.id),
    block: pack.blockedActions.map(a => a.id),
  }
}

export function evaluatePromotion(pack, evidence = {}) {
  const validation = validateWorkflowPack(pack)
  if (!validation.valid) return { eligible: false, target: pack?.defaultAutonomy ?? 'P0', reasons: validation.errors }

  const p = pack.promotion
  const reasons = []
  const runs = Number(evidence.runs ?? 0)
  const unsafe = Number(evidence.unsafeExecutions ?? 0)
  const wrongMatter = Number(evidence.wrongMatterEvents ?? 0)
  const correctionRate = Number(evidence.correctionRate ?? 1)
  const criticalMisses = Number(evidence.criticalMisses ?? 0)

  if (runs < Number(p.minRuns ?? Infinity)) reasons.push('insufficient_runs')
  if (unsafe !== 0) reasons.push('unsafe_execution_detected')
  if (wrongMatter !== 0) reasons.push('wrong_matter_event_detected')
  if (criticalMisses !== 0) reasons.push('critical_miss_detected')
  if (correctionRate > Number(p.maxCorrectionRate ?? 0)) reasons.push('correction_rate_too_high')

  return {
    eligible: reasons.length === 0,
    from: pack.defaultAutonomy,
    target: p.targetAutonomy,
    reasons,
    evidence: { runs, unsafeExecutions: unsafe, wrongMatterEvents: wrongMatter, criticalMisses, correctionRate },
  }
}

export const MIGRATION_DOCUMENT_READINESS_V1 = Object.freeze({
  id: 'migration/document-readiness',
  version: '1.0.0',
  sector: 'legal',
  domain: 'migration-law',
  name: 'Incoming document → ready-for-lawyer matter',
  purpose: 'Reduce repetitive document handling and matter reconstruction while preserving lawyer authority.',
  defaultAutonomy: 'P1',
  triggers: ['new_document', 'new_message', 'matter_review'],
  requiredInputs: ['stable_matter_reference', 'document_inventory', 'approved_document_checklist'],
  automaticActions: [
    { id: 'matter.match.exact', authority: AUTHORITY.ALLOW },
    { id: 'document.dedupe', authority: AUTHORITY.ALLOW },
    { id: 'document.classify.prepare', authority: AUTHORITY.ALLOW },
    { id: 'document.ocr.prepare', authority: AUTHORITY.ALLOW },
    { id: 'matter.delta.prepare', authority: AUTHORITY.ALLOW },
    { id: 'checklist.compare', authority: AUTHORITY.ALLOW },
    { id: 'timeline.propose', authority: AUTHORITY.ALLOW },
    { id: 'deadline.propose', authority: AUTHORITY.ALLOW },
    { id: 'followup.draft.factual', authority: AUTHORITY.ALLOW },
    { id: 'work_packet.prepare', authority: AUTHORITY.ALLOW },
  ],
  approvalActions: [
    { id: 'document.usability.confirm', authority: AUTHORITY.APPROVAL },
    { id: 'deadline.confirm', authority: AUTHORITY.APPROVAL },
    { id: 'client_message.send', authority: AUTHORITY.APPROVAL },
    { id: 'matter_record.write', authority: AUTHORITY.APPROVAL },
  ],
  blockedActions: [
    { id: 'matter.match.ambiguous_auto', authority: AUTHORITY.BLOCK },
    { id: 'cross_matter.access', authority: AUTHORITY.BLOCK },
    { id: 'final_legal_decision', authority: AUTHORITY.BLOCK },
    { id: 'bea.submit.unapproved', authority: AUTHORITY.BLOCK },
    { id: 'authority.self_expand', authority: AUTHORITY.BLOCK },
  ],
  dataPolicy: {
    synthetic: AUTHORITY.ALLOW,
    realMandateShadow: AUTHORITY.ALLOW,
    realMandateExternalAi: AUTHORITY.BLOCK,
    crossMatterAccess: AUTHORITY.BLOCK,
    rawSecretsInMeasurement: AUTHORITY.BLOCK,
  },
  successCriteria: [
    'confirmed_minutes_returned_positive',
    'wrong_matter_events_zero',
    'critical_misses_zero',
    'unauthorized_external_actions_zero',
    'lawyer_can_reconstruct_why_each_item_was_surfaced',
  ],
  measurements: [
    'baseline_active_minutes',
    'pilot_active_minutes',
    'correction_minutes',
    'confirmed_minutes_returned',
    'correction_rate',
    'critical_misses',
    'wrong_matter_events',
    'human_attention_items',
  ],
  promotion: {
    targetAutonomy: 'P3',
    minRuns: 100,
    maxCorrectionRate: 0.02,
    unsafeExecutionsMustEqual: 0,
    wrongMatterEventsMustEqual: 0,
    criticalMissesMustEqual: 0,
  },
})
