import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { preflightPilot, nextAction, sha256 } from './core.mjs'

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function writeJson(p, value) { fs.writeFileSync(p, JSON.stringify(value, null, 2)) }

export function verifyCitations(rows, { cwd = process.cwd() } = {}) {
  const proc = spawnSync('python3', ['pilot/law-firm/verify-citations.py'], {
    cwd,
    input: JSON.stringify({ rows }),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  if (proc.status !== 0) throw new Error(`Citation verification failed: ${proc.stderr || proc.stdout}`)
  return JSON.parse(proc.stdout)
}

export async function runReplay({ pilotDir, endpoint = process.env.GITLAW_PILOT_ENDPOINT, token = process.env.GITLAW_PILOT_SERVICE_TOKEN, fetchImpl = fetch }) {
  if (!endpoint) throw new Error('GITLAW_PILOT_ENDPOINT fehlt.')
  if (!token || token.length < 32) throw new Error('GITLAW_PILOT_SERVICE_TOKEN fehlt oder ist zu kurz.')
  const configPath = path.join(pilotDir, 'pilot.config.local.json')
  const casesPath = path.join(pilotDir, 'cases.local.json')
  if (!fs.existsSync(configPath) || !fs.existsSync(casesPath)) throw new Error('Pilot-Konfiguration oder Fälle fehlen.')
  const config = readJson(configPath)
  const cases = readJson(casesPath)
  const preflight = preflightPilot(config, cases)
  const action = nextAction(preflight)
  if (!preflight.ok) {
    const err = new Error(`${action.state}: ${action.message}`)
    err.code = `PILOT_${action.state}`
    err.details = preflight
    throw err
  }

  const rows = []
  for (const c of cases) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ case_id: c.case_id, matter_text: c.matter_text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(`${response.status}: ${data.error ?? 'request failed'}`)
      if (data.execution_allowed !== false) throw new Error('Safety contract violated: execution_allowed must be false')
      rows.push({ case_id: c.case_id, ok: true, result: data })
    } catch (error) {
      rows.push({ case_id: c.case_id, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const runtimeErrors = rows.filter((r) => !r.ok).length
  if (runtimeErrors) {
    const audit = { completed_at: new Date().toISOString(), cases: cases.length, completed: cases.length - runtimeErrors, runtime_errors: runtimeErrors, execution_attempts: 0, rows }
    writeJson(path.join(pilotDir, 'batch-results.local.json'), audit)
    throw new Error(`STOPP_TECHNIK: ${runtimeErrors} Fall/Fälle mit Runtime-Fehler.`)
  }

  const citation = verifyCitations(rows)
  const audit = {
    completed_at: new Date().toISOString(),
    cases: cases.length,
    completed: cases.length,
    runtime_errors: 0,
    execution_attempts: 0,
    input_hash: sha256(JSON.stringify(cases)),
    citation_summary: { total: citation.total, verified: citation.verified, failed: citation.failed, cases_without_citations: citation.cases_without_citations, all_cases_grounded: citation.all_cases_grounded },
    rows: rows.map((row) => ({ ...row, citation_verification: citation.rows.find((x) => x.case_id === row.case_id) })),
  }
  writeJson(path.join(pilotDir, 'batch-results.local.json'), audit)
  if (!citation.all_cases_grounded) throw new Error(`STOPP_QUELLEN: ${citation.failed} nicht verifizierte Zitate, ${citation.cases_without_citations} Fall/Fälle ohne verifizierbare Norm.`)
  return audit
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pilotDir = process.argv[2]
  if (!pilotDir) { console.error('Usage: node pilot/law-firm/run-replay.mjs <pilot-dir>'); process.exit(2) }
  runReplay({ pilotDir }).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exit(1) })
}
