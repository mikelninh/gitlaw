import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')

const main = read('viewer/src/main.tsx')
const proApp = read('viewer/src/pro/ProApp.tsx')
const dashboard = read('viewer/src/pro/BaoAutopilotDashboard.tsx')
const runner = read('viewer/src/pro/kanzlei-autopilot-runner.ts')
const welcome = read('viewer/src/pro/BaoAutopilotWelcome.tsx')
const core = read('pilot/law-firm/autopilot/core.mjs')

test('real Kanzlei Autopilot is mounted only inside authenticated Pro app', () => {
  assert.doesNotMatch(main, /path="\/bao-autopilot"/)
  assert.match(proApp, /path="autopilot"/)
  assert.match(proApp, /<ProAuth>/)
  assert.match(proApp, /BaoAutopilotDashboard/)
})

test('Bao public entry contains no case-store access and routes operational work into Pro', () => {
  assert.match(main, /path="\/bao" element={<BaoAutopilotWelcome/)
  assert.doesNotMatch(welcome, /listCases|listResearch|getCase|localStorage/)
  assert.match(welcome, /#\/pro\/autopilot\?invite=/)
  assert.match(welcome, /keine Fristen, Einreichungen oder finalen Rechtsentscheidungen still/i)
  assert.doesNotMatch(welcome, /VwVfG/)
})

test('safe runner has no external communication or legal-decision provider', () => {
  assert.match(runner, /externalMessagesSent:\s*0/)
  assert.match(runner, /legalDecisionsMade:\s*0/)
  assert.doesNotMatch(runner, /fetch\s*\(/)
  assert.doesNotMatch(runner, /sendEmail|gmail|whatsapp|bea\.submit|invoice\.send/i)
})

test('dashboard states the deadline and measurement boundaries', () => {
  assert.match(dashboard, /Fristen werden nie still bestätigt/)
  assert.match(dashboard, /Vorher-\/Nachher-Baseline bestätigt/)
  assert.match(dashboard, /runSafeKanzleiAutopilot/)
})

test('authority core separates preparation from consequential actions and blocks self-expansion', () => {
  assert.match(core, /'deadline\.propose'.*DECISIONS\.ALLOW/s)
  assert.match(core, /'deadline\.confirm'.*DECISIONS\.APPROVAL/s)
  assert.match(core, /'bea\.package\.prepare'.*DECISIONS\.ALLOW/s)
  assert.match(core, /'bea\.submit'.*DECISIONS\.APPROVAL/s)
  assert.match(core, /'authority\.expand'.*DECISIONS\.BLOCK/s)
  assert.match(core, /'final_legal_decision'.*DECISIONS\.BLOCK/s)
  assert.match(core, /synthetic_engineering_target_not_customer_evidence/)
})
