import { detectCitizenIntent } from '../viewer/src/citizen-intents.ts'

const tests = [
  {
    question: 'Mein Vermieter will Eigenbedarf anmelden - was kann ich tun?',
    expectedIntent: 'rent-eigenbedarf',
    expectedLaw: 'BGB',
  },
  {
    question: 'Kann mein Vermieter mich wegen Eigenbedarf kündigen?',
    expectedIntent: 'rent-eigenbedarf',
    expectedLaw: 'BGB',
  },
  {
    question: 'Mein Chef will mich kündigen - was kann ich tun?',
    expectedIntent: 'job-termination',
    expectedLaw: 'KSchG',
  },
  {
    question: 'Ich wurde heute von meinem Arbeitgeber rausgeschmissen. Was jetzt?',
    expectedIntent: 'job-termination',
    expectedLaw: 'KSchG',
  },
  {
    question: 'Was ist nach dem Tierschutzgesetz verboten und wie melde ich Tierquälerei?',
    expectedIntent: 'animal-cruelty',
    expectedLaw: 'TierSchG',
  },
  {
    question: 'Ich kann mir meine Medikamente nicht leisten — gibt es Hilfe?',
    expectedIntent: 'medicine-costs',
    expectedLaw: 'SGB 5',
  },
  {
    question: 'Mein Arzt hat mir ein teures Medikament verschrieben. Zahlt das die Kasse?',
    expectedIntent: 'medicine-costs',
    expectedLaw: 'SGB 5',
  },
  {
    question: 'Meine Heizung ist kaputt - darf ich die Miete kürzen?',
    expectedIntent: 'rent-reduction',
    expectedLaw: 'BGB',
  },
  {
    question: 'Mein Vermieter will die Miete erhöhen. Darf er das?',
    expectedIntent: 'rent-increase',
    expectedLaw: 'BGB',
  },
  {
    question: 'Das Jobcenter kürzt mein Bürgergeld. Was kann ich tun?',
    expectedIntent: 'citizen-income',
    expectedLaw: 'SGB 2',
  },
  {
    question: 'Wie viel Wohngeld bekomme ich?',
    expectedIntent: null,
    expectedLaw: null,
  },
  {
    question: 'Ich werde online beleidigt. Welche Rechte habe ich?',
    expectedIntent: null,
    expectedLaw: null,
  },
]

let pass = 0
let fail = 0

for (const test of tests) {
  const result = detectCitizenIntent(test.question)
  const gotIntent = result?.id ?? null
  const gotLaw = result?.sources?.[0]?.law ?? null
  const ok = gotIntent === test.expectedIntent && gotLaw === test.expectedLaw
  if (ok) pass += 1
  else fail += 1

  console.log(
    `[${ok ? 'PASS' : 'FAIL'}] ${test.question}\n` +
    `  expected intent=${String(test.expectedIntent)} law=${String(test.expectedLaw)}\n` +
    `  got      intent=${String(gotIntent)} law=${String(gotLaw)}`
  )
}

console.log('\nSummary')
console.log(JSON.stringify({ PASS: pass, FAIL: fail, total: tests.length }, null, 2))
