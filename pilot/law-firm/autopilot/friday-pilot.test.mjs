import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ui = fs.readFileSync('viewer/src/pro/FridayPilotConsole.tsx', 'utf8')
const routes = fs.readFileSync('viewer/src/pro/ProApp.tsx', 'utf8')

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
  assert.match(ui, /LOCAL ONLY/)
  assert.match(ui, /Externes AI/)
  assert.match(ui, /Nachrichten senden/)
  assert.match(ui, /beA \/ Behörde/)
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
