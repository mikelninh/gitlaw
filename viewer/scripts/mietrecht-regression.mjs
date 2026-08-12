import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const viewerRoot = path.resolve(here, '..')
const repoRoot = path.resolve(viewerRoot, '..')

const sourcePath = path.join(viewerRoot, 'src', 'mietrecht.ts')
const casesPath = path.join(viewerRoot, 'evals', 'mietrecht-cases.json')
const bgbPath = path.join(repoRoot, 'laws', 'bgb.md')

const source = fs.readFileSync(sourcePath, 'utf8')
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'))
const bgb = fs.readFileSync(bgbPath, 'utf8')

function normalize(text) {
  return String(text)
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function quotedStrings(text) {
  return [...text.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])
}

function parseTopics(ts) {
  const start = ts.indexOf('const topicHints')
  const end = ts.indexOf('\n]\n\nfunction normalize', start)
  if (start < 0 || end < 0) {
    throw new Error('Could not locate topicHints in viewer/src/mietrecht.ts')
  }

  const block = ts.slice(start, end + 2)
  const objectPattern = /\{\s*id:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?terms:\s*\[([\s\S]*?)\][\s\S]*?sections:\s*\[([\s\S]*?)\][\s\S]*?\}/g
  const topics = []
  for (const match of block.matchAll(objectPattern)) {
    topics.push({
      id: match[1],
      label: match[2],
      terms: quotedStrings(match[3]),
      sections: quotedStrings(match[4]).map(value => value.toLowerCase()),
    })
  }

  if (topics.length === 0) throw new Error('Parsed zero Mietrecht topics')
  return topics
}

function matchTopics(question, topics) {
  const q = normalize(question)
  return topics.filter(topic => topic.terms.some(term => q.includes(normalize(term))))
}

function routedSections(matched) {
  return matched
    .flatMap(topic => topic.sections)
    .filter((section, index, all) => all.indexOf(section) === index)
}

function corpusContains(section) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`§\\s*${escaped}(?![a-z0-9])`, 'i').test(bgb)
}

if (!Array.isArray(cases) || cases.length < 20) {
  throw new Error(`Expected at least 20 Mietrecht cases, found ${Array.isArray(cases) ? cases.length : 'invalid JSON'}`)
}

const ids = new Set()
const topics = parseTopics(source)
const failures = []
const rows = []

for (const testCase of cases) {
  if (ids.has(testCase.id)) failures.push(`${testCase.id}: duplicate case id`)
  ids.add(testCase.id)

  const matched = matchTopics(testCase.question, topics)
  const topicIds = matched.map(topic => topic.id)
  const sections = routedSections(matched)
  const caseFailures = []

  if (!topicIds.includes(testCase.expectedTopic)) {
    caseFailures.push(`expected topic ${testCase.expectedTopic}, got ${topicIds.join(', ') || 'none'}`)
  }
  if (sections[0] !== testCase.expectedFirst) {
    caseFailures.push(`expected first §${testCase.expectedFirst}, got ${sections[0] ? `§${sections[0]}` : 'none'}`)
  }
  for (const section of testCase.expectedIncludes || []) {
    if (!sections.includes(section.toLowerCase())) caseFailures.push(`missing routed §${section}`)
    if (!corpusContains(section)) caseFailures.push(`§${section} missing from laws/bgb.md`)
  }

  rows.push({
    id: testCase.id,
    ok: caseFailures.length === 0,
    topics: topicIds.join('+') || '—',
    first: sections[0] ? `§${sections[0]}` : '—',
    caseLaw: testCase.needsCaseLaw ? 'yes' : 'no',
  })

  failures.push(...caseFailures.map(message => `${testCase.id}: ${message}`))
}

console.table(rows)
console.log(`\nMietrecht routing regression: ${cases.length - new Set(failures.map(line => line.split(':')[0])).size}/${cases.length} cases without routing failures.`)
console.log(`Cases flagged as needing case-law / fact review: ${cases.filter(row => row.needsCaseLaw).length}/${cases.length}.`)

if (failures.length) {
  console.error('\nRegression failures:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nPASS — human-language routing contract holds for all Mietrecht cases.')
