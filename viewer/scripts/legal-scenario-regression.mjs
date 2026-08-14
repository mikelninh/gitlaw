import { detectLegalScenario, extractRecognizedFacts } from '../src/legal-scenarios.ts'

const cases = [
  ['job-termination', 'Mein Arbeitgeber hat mir heute schriftlich gekündigt.'],
  ['defective-purchase', 'Der Händler will meinen defekten Laptop nicht reparieren.'],
  ['benefit-decision', 'Das Jobcenter hat meinen Bürgergeld-Antrag abgelehnt.'],
  ['online-abuse', 'Jemand beleidigt und bedroht mich auf Instagram.'],
  ['medicine-rejected', 'Meine Krankenkasse übernimmt mein Medikament nicht.'],
  ['rent-check', 'Ist meine Miete in Friedrichshain zu teuer? 2.000 Euro für 50 qm2.'],
]

const results = cases.map(([expected, question]) => {
  const scenario = detectLegalScenario(question)
  return {
    expected,
    actual: scenario?.id ?? 'none',
    ok: scenario?.id === expected,
    question,
  }
})

console.table(results)
const failures = results.filter(result => !result.ok)
if (failures.length) {
  console.error(`FAIL — ${failures.length}/${results.length} visible homepage examples route incorrectly.`)
  process.exit(1)
}

const rent = detectLegalScenario(cases.at(-1)[1])
const facts = rent ? extractRecognizedFacts(cases.at(-1)[1], rent) : []
if (!facts.some(fact => fact.includes('40 €/m²'))) {
  console.error('FAIL — the visible rent example does not produce the deterministic 40 €/m² fact.')
  process.exit(1)
}

console.log(`PASS — ${results.length}/${results.length} visible homepage examples route correctly; rent calculation is present.`)
