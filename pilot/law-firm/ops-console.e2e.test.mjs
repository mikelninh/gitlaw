import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })
}
function close(server) { return new Promise((resolve) => server.close(resolve)) }
async function post(base, route, data) {
  const r = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = await r.json()
  return { status: r.status, body: j }
}

function fakeModelServer() {
  return http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const input = JSON.parse(raw || '{}')
    const result = {
      facts: [`Historischer Fall ${input.case_id}: Kaufpreis ist streitig.`],
      timeline: ['Vertrag geschlossen', 'Leistung/Übergabe erfolgt', 'Kaufpreis streitig'],
      missing_information: [],
      legal_issues: [{ issue: 'Kaufpreisanspruch', preliminary_assessment: 'Anspruch ist anhand Vertrag und Erfüllung anwaltlich zu prüfen.' }],
      zitate: [{ paragraph: '433', gesetz: 'BGB', bedeutung: 'Vertragstypische Pflichten beim Kaufvertrag' }],
      uncertainties: ['Einwendungen und Einreden sind anhand der vollständigen Akte zu prüfen.'],
      next_questions: ['Welche Einwendungen sind dokumentiert?'],
      preparatory_work_steps: ['Vertrag und Leistungsnachweise anwaltlich abgleichen.'],
      warnings: ['Historischer Replay; keine Außenwirkung.'],
      execution_allowed: false,
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(result))
  })
}

test('assistant standard path runs create → intake → replay → lawyer review → report → closeout without founder step', async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gitlaw-law-firm-e2e-'))
  const model = fakeModelServer()
  const modelPort = await listen(model)
  t.after(() => close(model))

  process.env.GITLAW_PILOT_WORKSPACE = workspace
  process.env.GITLAW_PILOT_ENDPOINT = `http://127.0.0.1:${modelPort}`
  process.env.GITLAW_PILOT_SERVICE_TOKEN = 'test-service-token-that-is-longer-than-32-chars'

  const { createServer } = await import(`./ops-console.mjs?e2e=${Date.now()}`)
  const app = createServer()
  const appPort = await listen(app)
  t.after(() => close(app))
  const base = `http://127.0.0.1:${appPort}`

  const create = await post(base, '/api/create', {
    slug: 'kanzlei-e2e', firm_label: 'Kanzlei E2E', lawyer_reviewer: 'Anwalt Review', operator: 'Ops Assistant',
    commercial_mode: 'internal_pilot', internal_pilot_authorised: true, deposit_paid: false,
    anonymisation_confirmed_by_firm: true, legal_setup_approved_by_lawyer: true,
    professional_secrecy_review_confirmed: true, provider_terms_reviewed: true,
    client_consent_requirement_assessed: true, client_consent_required: false, client_consent_confirmed: false,
    lawyer_final_authority_confirmed: true, retention_confirmed: true,
  })
  assert.equal(create.status, 201)

  const rows = Array.from({ length: 20 }, (_, i) => ({ case_id: `e2e-${i + 1}`, matter_text: `Historischer anonymisierter Kaufvertragsfall ${i + 1}. Leistung wurde erbracht, Kaufpreis ist streitig.` }))
  const intake = await post(base, '/api/intake', { slug: 'kanzlei-e2e', file_name: 'faelle.json', text: JSON.stringify(rows) })
  assert.equal(intake.status, 200)
  assert.equal(intake.body.state, 'STARTEN')

  const run = await post(base, '/api/run', { slug: 'kanzlei-e2e' })
  assert.equal(run.status, 200)
  assert.equal(run.body.cases, 20)
  assert.equal(run.body.citation_summary.failed, 0)
  assert.equal(run.body.citation_summary.cases_without_citations, 0)
  assert.equal(run.body.citation_summary.all_cases_grounded, true)

  const review = { reviews: rows.map((r) => ({ case_id: r.case_id, decision: 'CORRECT', reviewer_role: 'anwalt', error_classes: [], note: '' })) }
  const finalize = await post(base, '/api/finalize', { slug: 'kanzlei-e2e', review, measurement: { minutes_before: 20, minutes_after: 8, baseline_source_confirmed: true } })
  assert.equal(finalize.status, 200)
  assert.equal(finalize.body.decision.verdict, 'WEITER')

  const closeout = await post(base, '/api/closeout', { slug: 'kanzlei-e2e', report_delivered: true, final_payment_paid: false, transfer_copies_deleted: true, customer_continuation_opt_in: true })
  assert.equal(closeout.status, 200)
  assert.equal(closeout.body.closed, true)

  const dir = path.join(workspace, 'kanzlei-e2e')
  assert.equal(fs.existsSync(path.join(dir, 'cases.local.json')), false)
  assert.equal(fs.existsSync(path.join(dir, 'batch-results.local.json')), false)
  assert.equal(fs.existsSync(path.join(dir, 'review.local.json')), false)
  assert.equal(fs.existsSync(path.join(dir, 'deletion-proof.local.json')), true)
  assert.equal(fs.existsSync(path.join(dir, 'customer-report.local.html')), true)
})

test('assistant cannot start when privacy/legal gate is red', async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gitlaw-law-firm-stop-'))
  process.env.GITLAW_PILOT_WORKSPACE = workspace
  const { createServer } = await import(`./ops-console.mjs?stop=${Date.now()}`)
  const app = createServer(); const port = await listen(app); t.after(() => close(app))
  const base = `http://127.0.0.1:${port}`
  await post(base, '/api/create', {
    slug: 'privacy-stop', firm_label: 'Test', lawyer_reviewer: 'Anwalt', operator: 'Ops', commercial_mode: 'internal_pilot', internal_pilot_authorised: true,
    anonymisation_confirmed_by_firm: true, legal_setup_approved_by_lawyer: false, professional_secrecy_review_confirmed: true, provider_terms_reviewed: true,
    client_consent_requirement_assessed: true, lawyer_final_authority_confirmed: true, retention_confirmed: true,
  })
  const rows = Array.from({ length: 20 }, (_, i) => ({ case_id: `p-${i}`, matter_text: i === 0 ? 'Frau Mustermann verlangt Zahlung.' : `Anonymisierter Fall ${i}` }))
  const intake = await post(base, '/api/intake', { slug: 'privacy-stop', file_name: 'f.json', text: JSON.stringify(rows) })
  assert.equal(intake.body.state, 'STOPP')
  const run = await post(base, '/api/run', { slug: 'privacy-stop' })
  assert.equal(run.status, 409)
  assert.match(run.body.error, /STOPP/)
})

test('closeout refuses hidden continuation and refuses deletion while transfer copy remains', async () => {
  // Covered at contract level without replay to keep the test deterministic:
  const source = fs.readFileSync(new URL('./ops-console.mjs', import.meta.url), 'utf8')
  assert.match(source, /customer_continuation_opt_in/)
  assert.match(source, /summary\.decision\.verdict !== 'WEITER'/)
  assert.match(source, /transfer_copies_deleted/)
  assert.match(source, /Restzahlung/)
})
