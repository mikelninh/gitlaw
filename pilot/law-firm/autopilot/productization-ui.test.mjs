import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
const consoleUi = read('viewer/src/pro/ProofWeekConsole.tsx')
const proApp = read('viewer/src/pro/ProApp.tsx')

test('Proof Week console is protected inside Pro and stores evidence locally only', () => {
  assert.match(proApp, /path="proof-week"/)
  assert.match(proApp, /<ProAuth>/)
  assert.match(consoleUi, /localStorage/)
  assert.doesNotMatch(consoleUi, /fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/)
})

test('Proof Week console encodes price, no auto subscription and truth boundary', () => {
  assert.match(consoleUi, /€990 netto/)
  assert.match(consoleUi, /keine automatische Verlängerung/i)
  assert.match(consoleUi, /syntheticOrEstimatedSavingsPublishedAsCustomerRoi:\s*false/)
  assert.match(consoleUi, /KEEP_CANDIDATE/)
  assert.match(consoleUi, /STOP_OR_ITERATE/)
})

test('commercial evidence explicitly captures safety and willingness to pay', () => {
  assert.match(consoleUi, /authorityViolations/)
  assert.match(consoleUi, /criticalMisses/)
  assert.match(consoleUi, /wrongMatterEvents/)
  assert.match(consoleUi, /obviousYesAtEurMonthly/)
  assert.match(consoleUi, /€3\.000 \/ Monat/)
})
