import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WORKFLOW, DEFAULT_RETENTION_DAYS, normaliseCasesInput, preflightPilot, nextAction,
  validateReview, summarizeReview, measurementSummary, decidePilot, buildCustomerReport,
  purgePilotRawData, safeSlug,
} from './core.mjs'
import { runReplay } from './run-replay.mjs'
import { buildReviewHtml } from './review-package.mjs'

const ROOT = path.resolve(process.env.GITLAW_PILOT_WORKSPACE || 'deployments/gitlaw-law-firm-pilots')
const PORT = Number(process.env.GITLAW_PILOT_PORT || 4317)
const HOST = '127.0.0.1'
fs.mkdirSync(ROOT, { recursive: true })

function jread(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function jwrite(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2)) }
function json(res, code, body) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)) }
function html(res, code, body) { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'" }); res.end(body) }
function pilotDir(slug) { const s = safeSlug(slug); if (!s) throw new Error('Ungültiger Kunden-/Pilotname.'); return path.join(ROOT, s) }
function existingPilot(slug) { const dir = pilotDir(slug); if (!fs.existsSync(dir)) throw new Error('Pilot nicht gefunden.'); return dir }

async function body(req) {
  return await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => { raw += c; if (raw.length > 8_000_000) { reject(new Error('Request zu groß.')); req.destroy() } })
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(new Error('Ungültiges JSON.')) } })
    req.on('error', reject)
  })
}

function retentionState(dir, config) {
  if (!config.data_received_at) return { expired: false }
  const received = Date.parse(config.data_received_at)
  const days = Number(config.retention_days ?? DEFAULT_RETENTION_DAYS)
  if (!Number.isFinite(received)) return { expired: false }
  const deadline = received + days * 86400000
  return { expired: Date.now() > deadline, deadline: new Date(deadline).toISOString() }
}

function enforceLocalRetention(dir, config) {
  const state = retentionState(dir, config)
  if (!state.expired) return state
  const deleted = []
  for (const name of ['cases.local.json', 'batch-results.local.json', 'review.local.json', 'intake-source.local.txt']) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) { fs.rmSync(p, { force: true }); deleted.push(name) }
  }
  const proofPath = path.join(dir, 'retention-local-deletion-proof.local.json')
  if (!fs.existsSync(proofPath)) jwrite(proofPath, { deleted_at: new Date().toISOString(), reason: 'retention_deadline', local_raw_deleted: true, transfer_copy_deletion_still_required: true, deleted_paths: deleted })
  return { ...state, local_raw_deleted: true, transfer_copy_deletion_still_required: true }
}

function statusFor(dir) {
  const configPath = path.join(dir, 'pilot.config.local.json')
  if (!fs.existsSync(configPath)) return { state: 'ANFORDERN', message: 'Pilot-Konfiguration fehlt.' }
  const config = jread(configPath)
  const retention = enforceLocalRetention(dir, config)
  if (retention.expired) return { state: 'STOPP', code: 'STOPP_RETENTION', message: 'Rohdaten-Löschfrist ist abgelaufen. Lokale Rohdaten wurden gelöscht; Transferkopien ebenfalls löschen/bestätigen.', retention }
  const casesPath = path.join(dir, 'cases.local.json')
  if (!fs.existsSync(casesPath)) return { state: 'ANFORDERN', message: '20–30 anonymisierte historische Fälle als CSV/JSON fehlen.' }
  const cases = jread(casesPath)
  const preflight = preflightPilot(config, cases)
  return { ...nextAction(preflight), preflight, retention }
}

function allowedDownload(file) {
  return new Set(['lawyer-review.local.html', 'customer-report.local.html', 'customer-report.summary.local.json', 'deletion-proof.local.json', 'retention-local-deletion-proof.local.json']).has(file)
}

function page() {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitLaw Pro · Pilot Operations</title><style>:root{--bg:#f4f1e9;--paper:#fffdfa;--ink:#171715;--muted:#69665f;--line:#d9d1c5;--green:#e7f5de;--amber:#fff0c7;--red:#ffe1df;--blue:#e8eef7;--dark:#202620}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;line-height:1.45}.wrap{width:min(1080px,calc(100% - 28px));margin:28px auto}.hero,.card{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:22px;margin:12px 0}.hero h1{font-size:42px;letter-spacing:-.05em;margin:8px 0}.k{font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.status{font-size:34px;font-weight:950}.STARTEN{background:var(--green)}.ANFORDERN{background:var(--amber)}.WARTEN{background:var(--blue)}.STOPP{background:var(--red)}label{display:block;margin:10px 0;font-size:13px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}input,select,textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:white}input[type=checkbox]{width:auto;margin-right:7px}textarea{min-height:120px}button,.btn{border:0;border-radius:11px;padding:12px 15px;font-weight:900;background:var(--dark);color:white;cursor:pointer;text-decoration:none;display:inline-block}.secondary{background:#e9e5dd;color:var(--ink)}.danger{background:#9b2922}.muted{color:var(--muted);font-size:13px}.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.steps div{padding:12px;border:1px solid var(--line);border-radius:12px;background:white;font-size:13px}.out{white-space:pre-wrap;background:#171715;color:#e9eee7;padding:14px;border-radius:12px;max-height:300px;overflow:auto;font:12px/1.5 ui-monospace,monospace}@media(max-width:760px){.row,.steps{grid-template-columns:1fr}.hero h1{font-size:34px}}</style></head><body><main class="wrap"><section class="hero"><div class="k">GitLaw Pro · Law-Firm Pilot Mode</div><h1>Ein Pilot. Immer der nächste klare Schritt.</h1><p>Standardregel für Operations: <b>STARTEN</b> ausführen, bei <b>ANFORDERN</b> nur Fehlendes anfordern, bei <b>WARTEN</b> warten, bei <b>STOPP</b> niemals improvisieren.</p><div class="steps"><div>1 · Pilot anlegen</div><div>2 · 3 Inputs</div><div>3 · Replay starten</div><div>4 · Anwalt reviewt</div><div>5 · Report & Closeout</div></div></section>
<section class="card"><div class="k">Pilot wählen</div><div class="row"><label>Pilot-Slug<input id="slug" placeholder="kanzlei-demo"></label><label>&nbsp;<button onclick="refreshStatus()">Status prüfen</button></label></div><div id="status" class="card ANFORDERN"><div class="status">ANFORDERN</div><div>Neuen Pilot anlegen oder vorhandenen Slug prüfen.</div></div></section>
<section class="card"><div class="k">1 · Pilot anlegen</div><div class="row"><label>Kanzlei-Anzeige<input id="firm" placeholder="Kanzlei Pilot"></label><label>Anwaltlicher Reviewer<input id="reviewer" placeholder="Name intern"></label><label>Operations Assistant<input id="operator" placeholder="Name intern"></label><label>Modus<select id="commercial"><option value="internal_pilot">Interner / unentgeltlicher Test</option><option value="paid">Bezahlter Pilot</option></select></label></div><label><input type="checkbox" id="deposit"> Startzahlung bestätigt (nur bezahlter Pilot)</label><label><input type="checkbox" id="internal"> Interner Pilot vom Owner freigegeben</label><hr><b>Pflichtfreigaben – nur abhaken, wenn dokumentiert geprüft:</b><label><input type="checkbox" id="anon"> Kanzlei bestätigt: Testdaten sind wirklich anonymisiert/de-identifiziert</label><label><input type="checkbox" id="legal"> Anwalt:in hat das konkrete Pilot-Setup freigegeben</label><label><input type="checkbox" id="secrecy"> §43a/§43e BRAO / Verschwiegenheit & Dienstleister-Einbindung geprüft</label><label><input type="checkbox" id="provider"> Provider-/Vertrags-/Subprocessor-Setup geprüft</label><label><input type="checkbox" id="consentassess"> Erfordernis einer Mandanteneinwilligung wurde geprüft</label><label><input type="checkbox" id="consentrequired"> Einwilligung ist erforderlich</label><label><input type="checkbox" id="consent"> Erforderliche Einwilligung liegt vor</label><label><input type="checkbox" id="authority"> Anwalt:in bleibt fachliche Endinstanz</label><label><input type="checkbox" id="retention"> 7-Tage-Rohdaten-Löschfrist bestätigt</label><button onclick="createPilot()">Pilot anlegen</button></section>
<section class="card"><div class="k">2 · Kundeneingang</div><p><b>Genau 3 Dinge:</b> 20–30 anonymisierte historische Fälle · 1 anwaltlicher Reviewer · Kanzlei-Freigaben. Original-PDF/DOCX/XLSX bleibt draußen; lokal anonymisieren und CSV/JSON liefern.</p><label>Datei<input type="file" id="casefile" accept=".csv,.json"></label><button onclick="intake()">Fälle prüfen & einlesen</button></section>
<section class="card"><div class="k">3 · Replay</div><p>Nur starten, wenn Status <b>STARTEN</b> zeigt. Das System führt keine Kanzlei-Aktion aus.</p><button onclick="runPilot()">Historischen Replay starten</button><p id="reviewlink"></p></section>
<section class="card"><div class="k">4 · Anwaltliches Review → Ergebnis</div><p>Anwalt öffnet die Offline-Review-Datei und exportiert am Ende <code>gitlaw-lawyer-review.json</code>.</p><label>Review JSON<input type="file" id="reviewfile" accept=".json"></label><div class="row"><label>Minuten vorher<input id="before" type="number" min="0"></label><label>Minuten nachher<input id="after" type="number" min="0"></label></div><label><input type="checkbox" id="baseline"> Baseline wurde vom Kunden bestätigt oder gemeinsam gemessen</label><button onclick="finalize()">Review prüfen & Kundenreport erzeugen</button><p id="reportlink"></p></section>
<section class="card"><div class="k">5 · Closeout</div><label><input type="checkbox" id="delivered"> Kundenreport sicher übergeben</label><label><input type="checkbox" id="finalpaid"> Restzahlung bestätigt (nur bezahlter Pilot)</label><label><input type="checkbox" id="transferdeleted"> Upload-/Transferkopien gelöscht</label><label><input type="checkbox" id="continue"> Kanzlei hat ausdrücklich einer Standard-Fortsetzung zugestimmt</label><button class="danger" onclick="closeout()">Closeout & Rohdaten löschen</button><p class="muted">Bei Retention-Ablauf werden lokale Rohdaten fail-closed gelöscht – unabhängig von Rechnung oder Review. Transferkopien müssen zusätzlich entfernt werden.</p></section><section class="card"><div class="k">Protokoll</div><div id="out" class="out">Bereit.</div></section></main><script>const $=id=>document.getElementById(id);const out=x=>{$('out').textContent=typeof x==='string'?x:JSON.stringify(x,null,2)};async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||JSON.stringify(j));return j}function slug(){return $('slug').value.trim()}async function refreshStatus(){try{const r=await fetch('/api/status?slug='+encodeURIComponent(slug()));const j=await r.json();const box=$('status');box.className='card '+(j.state||'STOPP');box.innerHTML='<div class="status">'+(j.state||'STOPP')+'</div><div>'+String(j.message||'')+'</div>';out(j)}catch(e){out(e.message)}}async function createPilot(){try{const j=await post('/api/create',{slug:slug(),firm_label:$('firm').value,lawyer_reviewer:$('reviewer').value,operator:$('operator').value,commercial_mode:$('commercial').value,deposit_paid:$('deposit').checked,internal_pilot_authorised:$('internal').checked,anonymisation_confirmed_by_firm:$('anon').checked,legal_setup_approved_by_lawyer:$('legal').checked,professional_secrecy_review_confirmed:$('secrecy').checked,provider_terms_reviewed:$('provider').checked,client_consent_requirement_assessed:$('consentassess').checked,client_consent_required:$('consentrequired').checked,client_consent_confirmed:$('consent').checked,lawyer_final_authority_confirmed:$('authority').checked,retention_confirmed:$('retention').checked});out(j);refreshStatus()}catch(e){out(e.message)}}async function intake(){try{const f=$('casefile').files[0];if(!f)throw new Error('CSV/JSON wählen.');const j=await post('/api/intake',{slug:slug(),file_name:f.name,text:await f.text()});out(j);refreshStatus()}catch(e){out(e.message)}}async function runPilot(){try{out('Replay läuft…');const j=await post('/api/run',{slug:slug()});out(j);$('reviewlink').innerHTML='<a class="btn" href="'+j.review_url+'">Lawyer Review öffnen</a>';refreshStatus()}catch(e){out(e.message)}}async function finalize(){try{const f=$('reviewfile').files[0];if(!f)throw new Error('Review JSON wählen.');const review=JSON.parse(await f.text());const before=$('before').value===''?null:Number($('before').value),after=$('after').value===''?null:Number($('after').value);const j=await post('/api/finalize',{slug:slug(),review,measurement:{minutes_before:before,minutes_after:after,baseline_source_confirmed:$('baseline').checked}});out(j);$('reportlink').innerHTML='<a class="btn" href="'+j.report_url+'">Kundenreport öffnen</a>'}catch(e){out(e.message)}}async function closeout(){try{const j=await post('/api/closeout',{slug:slug(),report_delivered:$('delivered').checked,final_payment_paid:$('finalpaid').checked,transfer_copies_deleted:$('transferdeleted').checked,customer_continuation_opt_in:$('continue').checked});out(j);refreshStatus()}catch(e){out(e.message)}}</script></body></html>`
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${HOST}:${PORT}`)
      if (req.method === 'GET' && url.pathname === '/') return html(res, 200, page())
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const slug = url.searchParams.get('slug')
        if (!slug) return json(res, 400, { error: 'slug required' })
        const dir = pilotDir(slug)
        if (!fs.existsSync(dir)) return json(res, 200, { state: 'ANFORDERN', message: 'Pilot existiert noch nicht.' })
        return json(res, 200, statusFor(dir))
      }
      if (req.method === 'GET' && url.pathname === '/download') {
        const slug = url.searchParams.get('slug'); const file = url.searchParams.get('file')
        if (!slug || !file || !allowedDownload(file)) return json(res, 400, { error: 'invalid download' })
        const p = path.join(existingPilot(slug), file)
        if (!fs.existsSync(p)) return json(res, 404, { error: 'file not found' })
        return html(res, 200, fs.readFileSync(p, 'utf8'))
      }
      if (req.method !== 'POST') return json(res, 404, { error: 'not found' })
      const input = await body(req)

      if (url.pathname === '/api/create') {
        const slug = safeSlug(input.slug)
        if (!slug) return json(res, 400, { error: 'Kunden-/Pilot-Slug fehlt.' })
        const dir = pilotDir(slug)
        if (fs.existsSync(dir)) return json(res, 409, { error: 'Dieser Pilot existiert bereits. Bestehenden Pilot verwenden – nicht überschreiben.' })
        fs.mkdirSync(dir, { recursive: false })
        const config = {
          version: 1, pilot_id: slug, firm_label: String(input.firm_label || slug), workflow: WORKFLOW,
          lawyer_reviewer: String(input.lawyer_reviewer || ''), reviewer_role: 'anwalt', operator: String(input.operator || ''),
          commercial_mode: input.commercial_mode, deposit_paid: input.deposit_paid === true, internal_pilot_authorised: input.internal_pilot_authorised === true,
          data_mode: 'anonymised', anonymisation_confirmed_by_firm: input.anonymisation_confirmed_by_firm === true,
          legal_setup_approved_by_lawyer: input.legal_setup_approved_by_lawyer === true,
          professional_secrecy_review_confirmed: input.professional_secrecy_review_confirmed === true,
          provider_terms_reviewed: input.provider_terms_reviewed === true,
          client_consent_requirement_assessed: input.client_consent_requirement_assessed === true,
          client_consent_required: input.client_consent_required === true,
          client_consent_confirmed: input.client_consent_confirmed === true,
          lawyer_final_authority_confirmed: input.lawyer_final_authority_confirmed === true,
          retention_days: DEFAULT_RETENTION_DAYS, retention_confirmed: input.retention_confirmed === true,
          productive_system_access: false, execution_tools_enabled: false,
          historical_text_contains_action_requests_approved: false,
          created_at: new Date().toISOString(),
        }
        jwrite(path.join(dir, 'pilot.config.local.json'), config)
        return json(res, 201, { ok: true, slug, next: '20–30 anonymisierte historische Fälle als CSV/JSON einlesen.' })
      }

      if (url.pathname === '/api/intake') {
        const dir = existingPilot(input.slug)
        const configPath = path.join(dir, 'pilot.config.local.json')
        const config = jread(configPath)
        const cases = normaliseCasesInput({ fileName: input.file_name, text: input.text })
        config.data_received_at = new Date().toISOString()
        jwrite(configPath, config)
        jwrite(path.join(dir, 'cases.local.json'), cases)
        const preflight = preflightPilot(config, cases)
        return json(res, 200, { cases: cases.length, ...nextAction(preflight), preflight })
      }

      if (url.pathname === '/api/run') {
        const dir = existingPilot(input.slug)
        const status = statusFor(dir)
        if (status.state !== 'STARTEN') return json(res, 409, { error: `${status.state}: ${status.message}`, status })
        const audit = await runReplay({ pilotDir: dir })
        const cases = jread(path.join(dir, 'cases.local.json'))
        const config = jread(path.join(dir, 'pilot.config.local.json'))
        fs.writeFileSync(path.join(dir, 'lawyer-review.local.html'), buildReviewHtml({ cases, audit, firmLabel: config.firm_label, pilotId: config.pilot_id }))
        return json(res, 200, { ok: true, cases: audit.cases, citation_summary: audit.citation_summary, review_url: `/download?slug=${encodeURIComponent(config.pilot_id)}&file=lawyer-review.local.html` })
      }

      if (url.pathname === '/api/finalize') {
        const dir = existingPilot(input.slug)
        const config = jread(path.join(dir, 'pilot.config.local.json'))
        const cases = jread(path.join(dir, 'cases.local.json'))
        const audit = jread(path.join(dir, 'batch-results.local.json'))
        validateReview(cases.map((c) => c.case_id), input.review)
        const review = summarizeReview(input.review)
        const measurement = measurementSummary(input.measurement || {})
        const citation = audit.citation_summary
        const runtime = { runtime_errors: audit.runtime_errors, execution_attempts: audit.execution_attempts }
        const decision = decidePilot({ review, citation, measurement, runtime })
        const report = buildCustomerReport({ firmLabel: config.firm_label, pilotId: config.pilot_id, review, citation, measurement, runtime, decision })
        jwrite(path.join(dir, 'review.local.json'), input.review)
        fs.writeFileSync(path.join(dir, 'customer-report.local.html'), report)
        jwrite(path.join(dir, 'customer-report.summary.local.json'), { generated_at: new Date().toISOString(), review, citation, measurement, runtime, decision })
        return json(res, 200, { ok: true, decision, report_url: `/download?slug=${encodeURIComponent(config.pilot_id)}&file=customer-report.local.html` })
      }

      if (url.pathname === '/api/closeout') {
        const dir = existingPilot(input.slug)
        const config = jread(path.join(dir, 'pilot.config.local.json'))
        const summaryPath = path.join(dir, 'customer-report.summary.local.json')
        if (!fs.existsSync(summaryPath)) return json(res, 409, { error: 'Kundenreport fehlt.' })
        const summary = jread(summaryPath)
        if (input.report_delivered !== true) return json(res, 409, { error: 'Kundenreport wurde noch nicht als sicher übergeben bestätigt.' })
        if (config.commercial_mode === 'paid' && input.final_payment_paid !== true) return json(res, 409, { error: 'Restzahlung ist noch nicht bestätigt.' })
        if (input.customer_continuation_opt_in === true && summary.decision.verdict !== 'WEITER') return json(res, 409, { error: 'Standard-Fortsetzung ist nur nach WEITER zulässig. Sonst neuer Scope/Verbesserung.' })
        const proof = purgePilotRawData({ pilotDir: dir, pilotId: config.pilot_id, transferCopiesDeleted: input.transfer_copies_deleted === true })
        jwrite(path.join(dir, 'closeout.local.json'), { closed_at: new Date().toISOString(), report_delivered: true, final_payment_paid: config.commercial_mode === 'paid' ? true : null, customer_continuation_opt_in: input.customer_continuation_opt_in === true, decision: summary.decision.verdict, deletion_proof: proof })
        return json(res, 200, { ok: true, closed: true, decision: summary.decision, deletion_proof: proof })
      }
      return json(res, 404, { error: 'not found' })
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  })
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  createServer().listen(PORT, HOST, () => console.log(`GitLaw Pro Pilot Operations: http://${HOST}:${PORT}`))
}
