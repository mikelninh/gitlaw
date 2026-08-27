import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const failures = []
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 22) failures.push(`Node 22+ erforderlich (gefunden: ${process.versions.node}).`)

const py = spawnSync('python3', ['--version'], { encoding: 'utf8' })
if (py.status !== 0) failures.push('Python 3 ist nicht verfügbar.')

if (!fs.existsSync('gitlaw_mcp/citations.py') || !fs.existsSync('laws/bgb.md')) failures.push('GitLaw Gesetzeskorpus/Citation-Verifier fehlt. Repo vollständig aktualisieren.')
if (!fs.existsSync('pilot/law-firm/ops-console.mjs')) failures.push('Operations Console fehlt.')

const endpoint = process.env.GITLAW_PILOT_ENDPOINT || ''
if (!/^https:\/\//i.test(endpoint) && !/^http:\/\/127\.0\.0\.1(?::\d+)?/i.test(endpoint)) failures.push('GITLAW_PILOT_ENDPOINT fehlt oder ist nicht HTTPS (localhost ist nur für Tests erlaubt).')

const token = process.env.GITLAW_PILOT_SERVICE_TOKEN || ''
if (token.length < 32) failures.push('GITLAW_PILOT_SERVICE_TOKEN fehlt oder ist zu kurz.')

if (failures.length) {
  console.error('STOPP · GitLaw Pro Pilot Operations ist nicht bereit.')
  for (const f of failures) console.error(`- ${f}`)
  console.error('\nNicht improvisieren. Admin/Engineering informieren.')
  process.exit(1)
}

console.log('READY · GitLaw Pro Pilot Operations')
console.log('- Node:', process.versions.node)
console.log('- Python:', (py.stdout || py.stderr).trim())
console.log('- Citation corpus: vorhanden')
console.log('- Pilot endpoint: konfiguriert')
console.log('- Service token: vorhanden (Wert wird nicht angezeigt)')
