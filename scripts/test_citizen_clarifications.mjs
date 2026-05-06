import { detectCitizenClarification } from '../viewer/src/citizen-intents.ts'

const tests = [
  {
    question: 'Kann man mich einfach kündigen?',
    expectClarification: true,
  },
  {
    question: 'Zahlt die Kasse das?',
    expectClarification: true,
  },
  {
    question: 'Was kann ich gegen den Bescheid machen?',
    expectClarification: true,
  },
  {
    question: 'Mein Vermieter macht Probleme.',
    expectClarification: true,
  },
  {
    question: 'Ich habe Stress mit der Krankenkasse.',
    expectClarification: true,
  },
  {
    question: 'Ich habe online ein Problem.',
    expectClarification: true,
  },
  {
    question: 'Mein Vermieter will Eigenbedarf anmelden - was kann ich tun?',
    expectClarification: false,
  },
  {
    question: 'Ich kann mir meine Medikamente nicht leisten — gibt es Hilfe?',
    expectClarification: false,
  },
]

let pass = 0
let fail = 0

for (const test of tests) {
  const clarification = detectCitizenClarification(test.question)
  const got = Boolean(clarification)
  const ok = got === test.expectClarification
  if (ok) pass += 1
  else fail += 1

  console.log(
    `[${ok ? 'PASS' : 'FAIL'}] ${test.question}\n` +
    `  expected clarification=${test.expectClarification}\n` +
    `  got clarification=${got}${clarification ? `\n  text=${clarification}` : ''}`
  )
}

console.log('\nSummary')
console.log(JSON.stringify({ PASS: pass, FAIL: fail, total: tests.length }, null, 2))
