import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const PILOT_VERSION = '1.0'
export const WORKFLOW = 'matter_preparation'
export const MIN_CASES = 20
export const MAX_CASES = 30
export const DEFAULT_RETENTION_DAYS = 7
export const ALLOWED_DATA_MODES = new Set(['synthetic', 'anonymised'])
export const REVIEW_DECISIONS = new Set(['CORRECT', 'CHANGE', 'WRONG'])
export const REVIEW_ERROR_CLASSES = new Set([
  'facts_wrong',
  'important_fact_missing',
  'legal_issue_missing',
  'wrong_norm',
  'relevant_source_missing',
  'unsupported_claim',
  'conclusion_too_strong',
  'next_step_unusable',
  'critical_omission',
  'deadline_or_procedure_risk',
  'confidentiality_or_privacy',
  'other',
])

const IDENTIFIER_PATTERNS = [
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['iban', /\bDE\d{2}(?:\s?\d{4}){4}\s?\d{2}\b/gi],
  ['phone', /(?:\+49|0049|0)[\s()\-/]*\d(?:[\s()\-/]*\d){6,}/g],
  ['case_number', /\b(?:Az\.?|Aktenzeichen|Geschäftszeichen)\s*[:#]?\s*[A-Z0-9][A-Z0-9\s./-]{3,}\b/gi],
  ['honorific_name', /\b(?:Herr|Frau|Hr\.|Fr\.|Dr\.|Prof\.)\s+[A-ZÄÖÜ][a-zäöüß-]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß-]{2,})?/g],
  ['named_party', /\b(?:Mandant(?:in)?|Kläger(?:in)?|Beklagte?r?|Beschuldigte?r?|Zeuge|Zeugin|Geschädigte?r?)\s*:\s*[A-ZÄÖÜ][^,;\n]{2,}/g],
  ['street_address', /\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]{2,}(?:straße|str\.|weg|allee|platz|damm|ufer|gasse)\s+\d+[a-z]?\b/gi],
  ['birth_date_label', /\b(?:Geburtsdatum|geboren am|geb\.)\s*[:]?\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/gi],
  ['secret', /\b(?:sk-[A-Za-z0-9_-]{16,}|api[_-]?key\s*[:=]\s*\S+|bearer\s+[A-Za-z0-9._-]{16,})\b/gi],
]

const CONSEQUENT_ACTION_PATTERNS = [
  ['external_send', /\b(?:sende|versende|mail[e]?|schicke)\b.*\b(?:Mandant|Gericht|Gegner|Behörde)\b/i],
  ['court_filing', /\b(?:reiche|einreichen|einreichen lassen|übermittle)\b.*\b(?:Klage|Schriftsatz|Antrag|Gericht)\b/i],
  ['deadline_binding', /\b(?:trage|setze|ändere|lösche)\b.*\bFrist\b/i],
  ['mandate_decision', /\b(?:Mandat|Mandatsannahme)\b.*\b(?:annehmen|ablehnen|kündigen)\b/i],
  ['payment', /\b(?:überweise|zahle|buche|Lastschrift|Bankverbindung ändern)\b/i],
  ['conflict_final', /\bInteressenkollision\b.*\b(?:final|entscheide|freigeben)\b/i],
]

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function safeSlug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60)
}

function delimiterFor(text) {
  const first = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
  let comma = 0
  let semi = 0
  let quoted = false
  for (let i = 0; i < first.length; i++) {
    if (first[i] === '"') quoted = !quoted
    else if (!quoted && first[i] === ',') comma++
    else if (!quoted && first[i] === ';') semi++
  }
  return semi > comma ? ';' : ','
}

export function parseCsv(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '')
  const delimiter = delimiterFor(src)
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '"') {
      if (quoted && src[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      row.push(field); field = ''
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  if (quoted) throw new Error('CSV enthält ein nicht geschlossenes Anführungszeichen.')
  row.push(field)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  if (rows.length < 2) throw new Error('CSV muss Kopfzeile und mindestens einen Fall enthalten.')
  const headers = rows[0].map((h) => h.trim())
  if (new Set(headers).size !== headers.length) throw new Error('CSV enthält doppelte Spaltennamen.')
  return rows.slice(1).map((cells, idx) => Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])))
}

export function normaliseCasesInput({ fileName, text }) {
  const lower = String(fileName ?? '').toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.pdf') || lower.endsWith('.docx')) {
    throw new Error('Für den Standardpilot bitte zuerst lokal anonymisieren und als CSV oder JSON exportieren. Original-PDF/DOCX/XLSX wird nicht hochgeladen.')
  }
  let raw
  if (lower.endsWith('.json')) {
    raw = JSON.parse(text)
    raw = Array.isArray(raw) ? raw : raw?.cases
    if (!Array.isArray(raw)) throw new Error('JSON muss ein Array oder {"cases": [...]} enthalten.')
  } else if (lower.endsWith('.csv')) {
    raw = parseCsv(text)
  } else throw new Error('Nur CSV oder JSON sind im Standardpilot erlaubt.')

  const cases = raw.map((item, index) => {
    const caseId = String(item.case_id ?? item.id ?? '').trim()
    const matterText = String(item.matter_text ?? item.text ?? item.sachverhalt ?? '').trim()
    if (!caseId) throw new Error(`Fall ${index + 1}: case_id fehlt.`)
    if (!matterText) throw new Error(`Fall ${caseId}: matter_text fehlt.`)
    return {
      case_id: caseId,
      matter_text: matterText,
      expected_practice_area: String(item.expected_practice_area ?? '').trim() || null,
      notes_for_reviewer: String(item.notes_for_reviewer ?? '').trim() || null,
    }
  })
  const ids = cases.map((c) => c.case_id)
  if (new Set(ids).size !== ids.length) throw new Error('case_id muss eindeutig sein.')
  return cases
}

export function scanConfidentialIdentifiers(cases) {
  const hits = []
  for (const c of cases) {
    for (const [kind, regex] of IDENTIFIER_PATTERNS) {
      regex.lastIndex = 0
      const matches = [...c.matter_text.matchAll(regex)].slice(0, 3)
      for (const m of matches) hits.push({ case_id: c.case_id, kind, sample: String(m[0]).slice(0, 80) })
    }
  }
  return hits
}

export function scanConsequentialActions(cases) {
  const hits = []
  for (const c of cases) {
    for (const [kind, regex] of CONSEQUENT_ACTION_PATTERNS) {
      regex.lastIndex = 0
      const m = c.matter_text.match(regex)
      if (m) hits.push({ case_id: c.case_id, kind, sample: String(m[0]).slice(0, 100) })
    }
  }
  return hits
}

export function preflightPilot(config, cases) {
  const errors = []
  const add = (code, message) => errors.push({ code, message })
  if (config.workflow !== WORKFLOW) add('SCOPE_WORKFLOW', 'Standardpilot unterstützt nur „Akte vorbereiten“.')
  if (!ALLOWED_DATA_MODES.has(config.data_mode)) add('PRIVACY_DATA_MODE', 'Standardpilot erlaubt nur synthetische oder wirklich anonymisierte Daten.')
  if (cases.length < MIN_CASES) add('CASES_TOO_FEW', `Mindestens ${MIN_CASES} abgeschlossene Fälle erforderlich.`)
  if (cases.length > MAX_CASES) add('SCOPE_TOO_MANY_CASES', `Standardpilot umfasst höchstens ${MAX_CASES} Fälle.`)
  if (!String(config.lawyer_reviewer ?? '').trim()) add('REVIEWER_MISSING', 'Ein anwaltlicher Reviewer fehlt.')
  if (!String(config.operator ?? '').trim()) add('OPERATOR_MISSING', 'Operations-Verantwortliche:r fehlt.')
  if (config.reviewer_role !== 'anwalt' && config.reviewer_role !== 'owner') add('REVIEWER_NOT_LAWYER', 'Finales fachliches Review muss durch Anwalt/Anwältin erfolgen.')

  if (config.commercial_mode === 'paid' && config.deposit_paid !== true) add('PAYMENT_WAIT', 'Vereinbarte Startzahlung ist noch nicht bestätigt.')
  if (config.commercial_mode === 'internal_pilot' && config.internal_pilot_authorised !== true) add('AUTH_WAIT', 'Interner/unentgeltlicher Pilot ist noch nicht freigegeben.')
  if (!['paid', 'internal_pilot'].includes(config.commercial_mode)) add('COMMERCIAL_MODE', 'Commercial Mode fehlt.')

  if (config.data_mode === 'anonymised' && config.anonymisation_confirmed_by_firm !== true) add('PRIVACY_ANON_CONFIRM', 'Kanzlei muss die tatsächliche Anonymisierung bestätigen.')
  if (config.legal_setup_approved_by_lawyer !== true) add('LEGAL_APPROVAL', 'Anwaltliche Freigabe des konkreten Pilot-Setups fehlt.')
  if (config.professional_secrecy_review_confirmed !== true) add('CONFIDENTIALITY_REVIEW', 'Prüfung der anwaltlichen Verschwiegenheit/Dienstleister-Einbindung fehlt.')
  if (config.provider_terms_reviewed !== true) add('PROVIDER_REVIEW', 'Provider-/Dienstleisterbedingungen wurden noch nicht dokumentiert geprüft.')
  if (config.client_consent_requirement_assessed !== true) add('CONSENT_ASSESSMENT', 'Es ist nicht dokumentiert, ob eine Mandanteneinwilligung erforderlich ist.')
  if (config.client_consent_required === true && config.client_consent_confirmed !== true) add('CONSENT_MISSING', 'Als erforderlich bewertete Mandanteneinwilligung fehlt.')
  if (config.retention_confirmed !== true) add('RETENTION_WAIT', 'Löschfrist ist noch nicht bestätigt.')
  const retention = Number(config.retention_days ?? DEFAULT_RETENTION_DAYS)
  if (!Number.isInteger(retention) || retention < 1 || retention > DEFAULT_RETENTION_DAYS) add('RETENTION_SCOPE', `Standardpilot erlaubt 1–${DEFAULT_RETENTION_DAYS} Tage Rohdaten-Retention.`)
  if (config.productive_system_access === true) add('SCOPE_PRODUCTIVE_ACCESS', 'Kein produktiver Kanzlei-/Postfach-/DMS-Zugriff im Standardpilot.')
  if (config.execution_tools_enabled === true) add('SAFETY_EXECUTION', 'Execution-Tools müssen im Replay deaktiviert sein.')
  if (config.lawyer_final_authority_confirmed !== true) add('LEGAL_FINAL_AUTHORITY', 'Anwaltliche Endkontrolle muss bestätigt sein.')

  const identifiers = scanConfidentialIdentifiers(cases)
  if (config.data_mode === 'anonymised' && identifiers.length) add('PRIVACY_IDENTIFIER', `Identifier-Scan fand ${identifiers.length} mögliche Identifikatoren.`)
  const actions = scanConsequentialActions(cases)
  if (actions.length && config.historical_text_contains_action_requests_approved !== true) add('SAFETY_ACTION_REQUEST', 'Historische Texte enthalten mögliche Ausführungs-/Versandaufträge; vor Replay prüfen.')

  return { ok: errors.length === 0, errors, identifiers, consequential_action_hits: actions, retention_days: retention }
}

export function nextAction(preflight) {
  if (preflight.ok) return { state: 'STARTEN', message: 'Alles vorhanden. Historischer Replay kann gestartet werden.' }
  const codes = new Set(preflight.errors.map((e) => e.code))
  const stopExact = new Set(['REVIEWER_NOT_LAWYER', 'PROVIDER_REVIEW', 'RETENTION_SCOPE', 'COMMERCIAL_MODE'])
  const stop = [...codes].some((c) => stopExact.has(c) || c.startsWith('PRIVACY_') || c.startsWith('CONFIDENTIALITY_') || c.startsWith('CONSENT_') || c.startsWith('LEGAL_') || c.startsWith('SAFETY_') || c.startsWith('SCOPE_'))
  if (stop) return { state: 'STOPP', message: 'Nicht improvisieren. Zuständige anwaltliche/Privacy/Engineering-Person übernimmt.', errors: preflight.errors }
  const request = [...codes].some((c) => ['CASES_TOO_FEW', 'REVIEWER_MISSING', 'OPERATOR_MISSING'].includes(c))
  if (request) return { state: 'ANFORDERN', message: 'Es fehlen Kundeneingaben. Nur das konkret Fehlende anfordern.', errors: preflight.errors }
  return { state: 'WARTEN', message: 'Eine dokumentierte Freigabe oder Zahlung fehlt.', errors: preflight.errors }
}

export function validateReview(caseIds, reviewDoc) {
  if (!Array.isArray(reviewDoc?.reviews)) throw new Error('Review-Datei enthält kein reviews-Array.')
  const expected = new Set(caseIds)
  const seen = new Set()
  for (const r of reviewDoc.reviews) {
    const id = String(r.case_id ?? '')
    if (!expected.has(id)) throw new Error(`Unbekannte case_id im Review: ${id}`)
    if (seen.has(id)) throw new Error(`Doppelte case_id im Review: ${id}`)
    seen.add(id)
    if (!REVIEW_DECISIONS.has(r.decision)) throw new Error(`Ungültige Entscheidung für ${id}.`)
    const errors = Array.isArray(r.error_classes) ? r.error_classes : []
    for (const ec of errors) if (!REVIEW_ERROR_CLASSES.has(ec)) throw new Error(`Unbekannte Fehlerklasse ${ec} für ${id}.`)
    if ((r.decision === 'CHANGE' || r.decision === 'WRONG') && errors.length === 0) throw new Error(`${id}: Ändern/Falsch braucht mindestens einen Fehlergrund.`)
    if (r.decision === 'CORRECT' && errors.length > 0) throw new Error(`${id}: Richtig darf keine Fehlerklasse enthalten.`)
    if (r.reviewer_role !== 'anwalt' && r.reviewer_role !== 'owner') throw new Error(`${id}: finales Review muss anwaltlich erfolgen.`)
  }
  if (seen.size !== expected.size) throw new Error(`Review unvollständig: ${seen.size}/${expected.size} Fälle.`)
  return true
}

export function summarizeReview(reviewDoc) {
  const reviews = reviewDoc.reviews
  const count = (d) => reviews.filter((r) => r.decision === d).length
  const errorCount = (ec) => reviews.filter((r) => (r.error_classes ?? []).includes(ec)).length
  return {
    reviewed_cases: reviews.length,
    correct: count('CORRECT'),
    changed: count('CHANGE'),
    wrong: count('WRONG'),
    usable_rate_percent: Number((((count('CORRECT') + count('CHANGE')) / Math.max(1, reviews.length)) * 100).toFixed(1)),
    fact_errors: errorCount('facts_wrong') + errorCount('important_fact_missing'),
    legal_issue_misses: errorCount('legal_issue_missing'),
    unsupported_claims: errorCount('unsupported_claim'),
    critical_omissions: errorCount('critical_omission') + errorCount('deadline_or_procedure_risk'),
    confidentiality_or_privacy_flags: errorCount('confidentiality_or_privacy'),
  }
}

export function validateMeasurement(input = {}) {
  for (const key of ['minutes_before', 'minutes_after', 'cases_per_month', 'internal_hourly_cost_eur']) {
    if (input[key] == null || input[key] === '') continue
    const n = Number(input[key])
    if (!Number.isFinite(n) || n < 0) throw new Error(`${key} muss eine nichtnegative Zahl sein.`)
  }
  if ((input.minutes_before != null || input.minutes_after != null) && input.baseline_source_confirmed !== true) {
    throw new Error('Zeitmessung darf nur mit bestätigter Baseline/Quelle verwendet werden.')
  }
  return true
}

export function measurementSummary(input = {}) {
  validateMeasurement(input)
  const before = input.minutes_before == null ? null : Number(input.minutes_before)
  const after = input.minutes_after == null ? null : Number(input.minutes_after)
  const cases = input.cases_per_month == null ? null : Number(input.cases_per_month)
  const hourly = input.internal_hourly_cost_eur == null ? null : Number(input.internal_hourly_cost_eur)
  const reduction = before != null && after != null && before > 0 ? ((before - after) / before) * 100 : null
  const monthlyHours = before != null && after != null && cases != null ? Math.max(0, (before - after) * cases / 60) : null
  const monthlyEur = monthlyHours != null && hourly != null ? monthlyHours * hourly : null
  return {
    minutes_before: before,
    minutes_after: after,
    baseline_source_confirmed: input.baseline_source_confirmed === true,
    time_reduction_percent: reduction == null ? null : Number(reduction.toFixed(1)),
    estimated_hours_saved_monthly: monthlyHours == null ? null : Number(monthlyHours.toFixed(1)),
    estimated_eur_saved_monthly: monthlyEur == null ? null : Number(monthlyEur.toFixed(2)),
  }
}

export function decidePilot({ review, citation, measurement, runtime = {} }) {
  if ((runtime.runtime_errors ?? 0) > 0 || (runtime.execution_attempts ?? 0) > 0) return { verdict: 'STOPPEN', reason: 'Runtime-/Execution-Safety-Gate verletzt.' }
  if ((citation.total ?? 0) > 0 && (citation.verified ?? 0) !== citation.total) return { verdict: 'STOPPEN', reason: 'Nicht alle zitierten Normen wurden gegen den Korpus verifiziert.' }
  if ((review.unsupported_claims ?? 0) > 0) return { verdict: 'STOPPEN', reason: 'Anwaltliches Review fand unbelegte rechtliche Aussage(n).' }
  if ((review.critical_omissions ?? 0) > 0) return { verdict: 'STOPPEN', reason: 'Anwaltliches Review fand kritische Auslassung/Frist-/Verfahrensrisiko.' }
  if ((review.confidentiality_or_privacy_flags ?? 0) > 0) return { verdict: 'STOPPEN', reason: 'Review fand Vertraulichkeits-/Datenschutzproblem.' }
  const n = Math.max(1, review.reviewed_cases ?? 0)
  const factAccuracy = 100 * (1 - (review.fact_errors ?? 0) / n)
  const issueRecallProxy = 100 * (1 - (review.legal_issue_misses ?? 0) / n)
  if (factAccuracy < 95 || issueRecallProxy < 90 || (review.usable_rate_percent ?? 0) < 85) return { verdict: 'VERBESSERN', reason: 'Qualität liegt unter dem Pilot-Gate.' }
  if (measurement?.time_reduction_percent == null) return { verdict: 'WEITER MESSEN', reason: 'Qualität/Safety sind ausreichend, aber Zeitbaseline fehlt.' }
  if (measurement.time_reduction_percent <= 0) return { verdict: 'VERBESSERN', reason: 'Kein gemessener Zeitgewinn.' }
  return { verdict: 'WEITER', reason: 'Qualität, Quellen-Gate und gemessener Zeitgewinn bestehen.' }
}

export function buildCustomerReport({ firmLabel, pilotId, review, citation, measurement, runtime, decision }) {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))
  const time = measurement.time_reduction_percent == null ? 'noch nicht belastbar gemessen' : `${measurement.time_reduction_percent}% weniger Bearbeitungszeit im gemessenen Schritt`
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitLaw Pro Pilot Ergebnis</title><style>body{font-family:Inter,system-ui;max-width:920px;margin:40px auto;padding:0 20px;color:#171717;background:#f6f3ec}.card{background:white;border:1px solid #ddd5c8;border-radius:18px;padding:24px;margin:14px 0}.big{font-size:42px;font-weight:900}.muted{color:#6b6860}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style><body><p class="muted">GitLaw Pro · historischer Kanzlei-Pilot · ${esc(pilotId)}</p><h1>${esc(firmLabel)}: Funktioniert „Akte vorbereiten“?</h1><div class="card"><div class="big">${esc(decision.verdict)}</div><p>${esc(decision.reason)}</p></div><div class="grid"><div class="card"><b>Funktioniert es?</b><p>${review.usable_rate_percent}% der Fälle nach anwaltlichem Review brauchbar (richtig oder nach Änderung).</p></div><div class="card"><b>Sind die Quellen sauber?</b><p>${citation.verified}/${citation.total} erkannte Zitate gegen den GitLaw-Gesetzeskorpus verifiziert.</p></div><div class="card"><b>Spart es Zeit?</b><p>${esc(time)}.</p></div></div><div class="card"><h2>Safety</h2><p>Runtime-Fehler: ${runtime.runtime_errors ?? 0} · Execution-Versuche: ${runtime.execution_attempts ?? 0} · kritische Auslassungen: ${review.critical_omissions ?? 0} · unbelegte Aussagen: ${review.unsupported_claims ?? 0}</p><p class="muted">Dieses Ergebnis ist ein begrenzter historischer Replay-Test. Es ist kein Nachweis allgemeiner juristischer Richtigkeit und ersetzt keine anwaltliche Endkontrolle.</p></div></body></html>`
}

export function deletionProof({ pilotId, deletedPaths, transferCopiesDeleted, reason = 'closeout' }) {
  return {
    version: PILOT_VERSION,
    pilot_id: pilotId,
    deleted_at: new Date().toISOString(),
    reason,
    application_level_deletion: true,
    forensic_secure_wipe_claimed: false,
    transfer_copies_deleted_confirmed: transferCopiesDeleted === true,
    deleted_paths: deletedPaths,
    proof_hash: sha256(`${pilotId}|${deletedPaths.join('|')}|${reason}`),
  }
}

export function purgePilotRawData({ pilotDir, pilotId, transferCopiesDeleted, reason = 'closeout' }) {
  if (transferCopiesDeleted !== true) throw new Error('Upload-/Transferkopien müssen ebenfalls als gelöscht bestätigt sein.')
  const rawNames = ['cases.local.json', 'batch-results.local.json', 'review.local.json', 'intake-source.local.txt']
  const deleted = []
  for (const name of rawNames) {
    const p = path.join(pilotDir, name)
    if (fs.existsSync(p)) { fs.rmSync(p, { force: true }); deleted.push(name) }
  }
  const proof = deletionProof({ pilotId, deletedPaths: deleted, transferCopiesDeleted, reason })
  fs.writeFileSync(path.join(pilotDir, 'deletion-proof.local.json'), JSON.stringify(proof, null, 2))
  return proof
}
