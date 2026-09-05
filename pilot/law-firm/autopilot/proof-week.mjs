export const PROOF_WEEK_PRICE_EUR_NET = 990
export const PROOF_WEEK_DAYS = 7

function finiteNonNegative(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function computeConfirmedMinutesReturned({ baselineMinutes, pilotMinutes, correctionMinutes }) {
  return Math.max(0, finiteNonNegative(baselineMinutes) - finiteNonNegative(pilotMinutes) - finiteNonNegative(correctionMinutes))
}

export function aggregateProofWeekRows(rows = []) {
  const kept = rows.filter(row => row?.keep !== false)
  const baselineMinutes = kept.reduce((s, row) => s + finiteNonNegative(row.baselineMinutes), 0)
  const pilotMinutes = kept.reduce((s, row) => s + finiteNonNegative(row.pilotMinutes), 0)
  const correctionMinutes = kept.reduce((s, row) => s + finiteNonNegative(row.reworkMinutes ?? row.correctionMinutes), 0)
  const confirmedMinutesReturned = computeConfirmedMinutesReturned({ baselineMinutes, pilotMinutes, correctionMinutes })
  return {
    baselineMinutes,
    pilotMinutes,
    correctionMinutes,
    confirmedMinutesReturned,
    confirmedHoursReturned: confirmedMinutesReturned / 60,
  }
}

export function buildProofWeekReport(input = {}) {
  const totals = aggregateProofWeekRows(input.rows)
  const observedRuns = finiteNonNegative(input.observedRuns)
  const automatedPreparations = Math.min(observedRuns, finiteNonNegative(input.automatedPreparations))
  const humanAttentionItems = finiteNonNegative(input.humanAttentionItems)
  const correctionEvents = finiteNonNegative(input.correctionEvents)
  const authorityViolations = finiteNonNegative(input.authorityViolations)
  const criticalMisses = finiteNonNegative(input.criticalMisses)
  const wrongMatterEvents = finiteNonNegative(input.wrongMatterEvents)

  const automationRate = observedRuns > 0 ? automatedPreparations / observedRuns : null
  const humanAttentionRate = observedRuns > 0 ? Math.min(1, humanAttentionItems / observedRuns) : null
  const correctionRate = observedRuns > 0 ? Math.min(1, correctionEvents / observedRuns) : null

  const evidenceQuality = totals.baselineMinutes > 0 && observedRuns > 0 ? 'observed' : 'incomplete'
  const keepCandidate = evidenceQuality === 'observed'
    && totals.confirmedMinutesReturned > 0
    && authorityViolations === 0
    && criticalMisses === 0
    && wrongMatterEvents === 0

  return {
    schema: 'kanzlei-proof-week-report/1',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    customerRef: String(input.customerRef ?? 'customer-01'),
    workflowPackId: String(input.workflowPackId ?? 'migration/document-readiness'),
    evidenceQuality,
    price: { amount: PROOF_WEEK_PRICE_EUR_NET, currency: 'EUR', vatIncluded: false, automaticSubscription: false },
    observed: {
      runs: observedRuns,
      matters: finiteNonNegative(input.matters),
      documents: finiteNonNegative(input.documents),
      followupsPrepared: finiteNonNegative(input.followupsPrepared),
      automatedPreparations,
      humanAttentionItems,
      correctionEvents,
    },
    time: totals,
    rates: { automationRate, humanAttentionRate, correctionRate },
    safety: { authorityViolations, criticalMisses, wrongMatterEvents },
    recommendation: {
      status: keepCandidate ? 'KEEP_CANDIDATE' : 'STOP_OR_ITERATE',
      nextWorkflow: input.nextWorkflow ? String(input.nextWorkflow) : null,
      reason: keepCandidate
        ? 'positive_measured_time_return_with_zero_recorded_safety_failures'
        : 'insufficient_value_evidence_or_safety_condition_failed',
    },
    truthBoundary: {
      customerEvidence: evidenceQuality === 'observed',
      syntheticOrEstimatedSavingsPublishedAsCustomerRoi: false,
      notes: String(input.notes ?? ''),
    },
  }
}

export function evaluateWillingnessToPay({ obviousYesAtEurMonthly, priceFeel = {} } = {}) {
  const obviousYes = finiteNonNegative(obviousYesAtEurMonthly)
  const allowed = [500, 1000, 2000, 3000]
  const normalized = Object.fromEntries(allowed.map(price => {
    const raw = priceFeel[price] ?? priceFeel[String(price)] ?? 'not_asked'
    return [price, ['easy', 'fair', 'high', 'no', 'not_asked'].includes(raw) ? raw : 'not_asked']
  }))
  return { obviousYesAtEurMonthly: obviousYes || null, priceFeel: normalized }
}

export const STANDARD_PROOF_WEEK = Object.freeze({
  id: 'kanzlei-autopilot-proof-week-v1',
  priceEurNet: PROOF_WEEK_PRICE_EUR_NET,
  durationDays: PROOF_WEEK_DAYS,
  customerInputs: ['one_recurring_workflow', '10_to_20_historic_or_shadow_cases', 'one_accountable_reviewer'],
  outputs: ['before_after', 'confirmed_minutes_returned', 'correction_rate', 'automation_rate', 'approval_attention', 'safety_results', 'recommended_next_workflow', 'keep_stop'],
  automaticSubscription: false,
  continuationRequiresExplicitAcceptance: true,
})
