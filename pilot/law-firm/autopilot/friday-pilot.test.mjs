import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ui = fs.readFileSync('viewer/src/pro/FridayPilotConsole.tsx', 'utf8')
const routes = fs.readFileSync('viewer/src/pro/ProApp.tsx', 'utf8')
const shadow = fs.readFileSync('viewer/src/pro/shadow-lock.ts', 'utf8')
const sync = fs.readFileSync('viewer/src/pro/sync.ts', 'utf8')
const ai = fs.readFileSync('viewer/src/pro/ai.ts', 'utf8')

test('Friday pilot route stays inside authenticated Pro workspace', () => {
  assert.match(routes, /path="friday"/)
  assert.match(routes, /<FridayPilotConsole/)
  assert.match(routes, /<ProAuth>/)
})

test('Friday shadow console has no network or external-action primitive', () => {
  for (const forbidden of [
    /\bfetch\s*\(/,
    /axios\b/,
    /OpenAI\b/,
    /ask-pro/,
    /sendEmail/,
    /beA.*submit/i,
    /window\.open\s*\(/,
  ]) {
    assert.doesNotMatch(ui, forbidden)
  }
  assert.match(ui, /SHADOW LOCK ACTIVE/)
  assert.match(ui, /Externes AI/)
  assert.match(ui, /Cloud-Sync/)
  assert.match(ui, /beA \/ Behörde/)
})

test('opening Friday console activates session Shadow Lock', () => {
  assert.match(ui, /enableShadowLock\(\)/)
  assert.match(shadow, /sessionStorage\.setItem/)
  assert.match(shadow, /gitlaw\.pro\.shadowLock\.v1/)
  assert.match(shadow, /gitlaw\.pro\.cloudSync\.v1/)
  assert.match(shadow, /localStorage\.setItem\(CLOUD_SYNC_KEY, '0'\)/)
})

test('Shadow Lock disables every normal cloud-sync path before network', () => {
  assert.match(sync, /import \{ isShadowLockEnabled \} from '\.\/shadow-lock'/)
  assert.match(sync, /export function isCloudSyncEnabled\(\): boolean \{\s*if \(isShadowLockEnabled\(\)\) return false/)
  assert.match(sync, /if \(on && isShadowLockEnabled\(\)\)/)
  assert.match(sync, /export async function pushToCloud/)
  assert.match(sync, /export async function pullFromCloud/)
})

test('Shadow Lock blocks normal external AI client before provider gateway request', () => {
  const guard = ai.indexOf('assertExternalAiAllowed()')
  const network = ai.indexOf("fetchWithProSession('/api/ask-pro'")
  assert.ok(guard >= 0)
  assert.ok(network > guard, 'AI lock guard must run before any ask-pro request')
  assert.match(shadow, /P1 Shadow Lock aktiv: externer KI-Aufruf/)
})

test('ending Shadow Lock never silently re-enables cloud sync', () => {
  assert.match(shadow, /export function disableShadowLock/)
  const disableBody = shadow.slice(shadow.indexOf('export function disableShadowLock'))
  assert.match(disableBody, /localStorage\.setItem\(CLOUD_SYNC_KEY, '0'\)/)
  assert.doesNotMatch(disableBody, /localStorage\.setItem\(CLOUD_SYNC_KEY, '1'\)/)
})

test('Friday measurement is local and does not invent ROI', () => {
  assert.match(ui, /localStorage\.setItem/)
  assert.match(ui, /new Blob/)
  assert.match(ui, /Math\.max\(0, baseline - pilot - rework\)/)
  assert.doesNotMatch(ui, /€\s*\d/)
  assert.doesNotMatch(ui, /hours saved.*\d/i)
})

test('real-case Friday instructions require pseudonymous reference and forbid secret free text', () => {
  assert.match(ui, /Pseudonyme Matter-Referenz/)
  assert.match(ui, /keine Namen, E-Mail-Adressen, IBANs/i)
  assert.match(ui, /Keine vertraulichen Mandatsinhalte/)
})
