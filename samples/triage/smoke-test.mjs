#!/usr/bin/env node
/**
 * Smoke test for the /api/pro/intake/classify prompt.
 *
 * Reads every sample .txt next to this file, sends it through the SAME prompt
 * + schema that the production endpoint uses, prints the result. This lets
 * you verify classification quality before plugging the full Vercel stack in.
 *
 * Run:  OPENAI_API_KEY=sk-... node samples/triage/smoke-test.mjs
 *
 * Pass criteria (eyeball):
 *   - doc_type matches the README's expected column
 *   - document_date is plausible (or null when unknown)
 *   - sender is recognizable
 *   - suggested_filename is short, ASCII-safe, no umlauts
 *   - aktenzeichen present where the source has one
 *   - confidence ≥ 0.6 on clear documents
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY env var. Bail.')
  process.exit(1)
}

// ── Mirror of api/pro/intake/classify.ts (must stay in sync) ────────────────

const CLASSIFY_SCHEMA = {
  name: 'dokument_klassifikation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      doc_type: {
        type: 'string',
        enum: ['Brief', 'Email', 'Bescheid', 'Mahnung', 'Klage', 'Vertrag', 'Rechnung', 'Foto', 'Screenshot', 'Sonstiges'],
      },
      document_date: { type: ['string', 'null'] },
      sender: { type: ['string', 'null'] },
      recipient: { type: ['string', 'null'] },
      parties: { type: 'array', items: { type: 'string' } },
      aktenzeichen: { type: ['string', 'null'] },
      summary_de: { type: 'string' },
      suggested_filename: { type: 'string' },
      confidence: { type: 'number' },
      needs_review: { type: 'boolean' },
    },
    required: ['doc_type', 'document_date', 'sender', 'recipient', 'parties', 'aktenzeichen', 'summary_de', 'suggested_filename', 'confidence', 'needs_review'],
  },
}

const SYSTEM_PROMPT = `Du bist Triage-Assistenz für eine deutsche Anwaltskanzlei.

Eingabe: der OCR-Text eines einzelnen Dokuments (Brief, Bescheid, Email, Mahnung, Foto/Screenshot, etc.).

Aufgabe: extrahiere strukturierte Metadaten, damit die Anwält:in das Mandat sofort sortieren kann.

REGELN
- Datum: bevorzuge das Dokumentdatum (oben rechts bei Briefen, Header bei Emails). Format YYYY-MM-DD. Wenn nicht erkennbar: null.
- Absender / Empfänger: vollständiger Name oder Firmenname. Bei Behörden den offiziellen Namen ("Amtsgericht München", nicht "AG München").
- Aktenzeichen: regex-mäßig erkennen (z.B. "12 C 345/24", "AZ: 4711-2024", "VG-2024-001"). Wenn nicht vorhanden: null.
- Parteien: alle Personen/Firmen, die im Dokument als Beteiligte vorkommen — Mandant, Gegner, Gericht, Behörde.
- suggested_filename: knapp und eindeutig. Beispiel: "2024-08-12_Amtsgericht-Muenchen_Bescheid". Title-Case (erster Buchstabe groß, Rest klein), keine Umlaute (ae/oe/ue/ss), keine Leerzeichen (Bindestrich statt), keine Dateiendung. NIEMALS ALL-CAPS.
- doc_type: wähle den präzisesten Wert aus dem Schema. WhatsApp / SMS / iMessage / Telegram / Signal-Chats und Smartphone-Display-Aufnahmen sind IMMER "Screenshot", nicht "Sonstiges". Fotos eines physischen Briefes sind "Brief" (oder spezifischer Bescheid/Mahnung etc.) — der Träger ist egal, der Inhalt zählt. "Sonstiges" nur wenn wirklich unklar.
- summary_de: 1–2 sachliche Sätze. Keine Bewertung, keine juristische Einordnung.
- needs_review = true, wenn (a) Datum oder Absender unsicher, (b) OCR-Text kürzer als ~80 Zeichen, (c) doc_type "Sonstiges", (d) confidence < 0.7.
- confidence: ehrlich. Schlechte Scans / wenig Text → niedrig.

Wenn der OCR-Text leer oder unbrauchbar ist: doc_type="Sonstiges", confidence=0.1, needs_review=true, summary_de="OCR konnte keinen Text extrahieren — bitte manuell prüfen."`

const EXPECTED = {
  'IMG_4711.txt':              { doc_type: 'Bescheid', sender_match: /amtsgericht/i, az_required: true },
  'scan_001.txt':              { doc_type: 'Mahnung', sender_match: /inkasso/i, az_required: false },
  'foto-vom-kunden.txt':       { doc_type: 'Email', sender_match: /hofer|m\.hofer/i, az_required: false },
  'document.txt':              { doc_type: 'Vertrag', sender_match: /stadtwerke/i, az_required: false },
  'screenshot_2024-09-04.txt': { doc_type: 'Screenshot', sender_match: null, az_required: false },
  'Schreiben.txt':             { doc_type: 'Bescheid', sender_match: /bundesagentur|arbeit/i, az_required: true },
  'unbekannt.txt':             { doc_type: 'Rechnung', sender_match: /kraus|praxis/i, az_required: false },
}

async function classify(text, fileName) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Dateiname (Hinweis, kann irreführend sein): ${fileName}\n\nOCR-Text:\n${text}` },
      ],
      response_format: { type: 'json_schema', json_schema: CLASSIFY_SCHEMA },
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(JSON.stringify(data).slice(0, 400))
  return JSON.parse(data.choices[0].message.content)
}

function check(fileName, c) {
  const expect = EXPECTED[fileName]
  if (!expect) return { passes: ['(no expectation defined)'], fails: [] }
  const passes = []
  const fails = []
  if (c.doc_type === expect.doc_type) passes.push(`doc_type=${c.doc_type}`)
  else fails.push(`doc_type: expected "${expect.doc_type}", got "${c.doc_type}"`)
  if (expect.sender_match) {
    if (c.sender && expect.sender_match.test(c.sender)) passes.push(`sender~"${c.sender}"`)
    else fails.push(`sender: expected match ${expect.sender_match}, got "${c.sender}"`)
  }
  if (expect.az_required) {
    if (c.aktenzeichen) passes.push(`aktenzeichen=${c.aktenzeichen}`)
    else fails.push(`aktenzeichen missing (expected one)`)
  }
  if (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1)
    fails.push(`confidence out of range: ${c.confidence}`)
  if (!c.suggested_filename || /[äöüÄÖÜß\s]/.test(c.suggested_filename))
    fails.push(`suggested_filename has umlauts/spaces: "${c.suggested_filename}"`)
  return { passes, fails }
}

const files = readdirSync(HERE).filter((f) => f.endsWith('.txt')).sort()
let totalFails = 0
let firstCall = true
for (const fileName of files) {
  // Stay under 5 RPM — sleep ~13s between calls. Override with FAST=1 if your
  // tier is higher.
  if (!firstCall && !process.env.FAST) await new Promise((r) => setTimeout(r, 13_000))
  firstCall = false
  const text = readFileSync(join(HERE, fileName), 'utf8')
  process.stdout.write(`\n━━ ${fileName} ━━\n`)
  try {
    const c = await classify(text, fileName)
    console.log(`  doc_type:    ${c.doc_type}`)
    console.log(`  date:        ${c.document_date}`)
    console.log(`  sender:      ${c.sender}`)
    console.log(`  aktenzeichen:${c.aktenzeichen ?? '—'}`)
    console.log(`  filename:    ${c.suggested_filename}`)
    console.log(`  confidence:  ${(c.confidence * 100).toFixed(0)}%`)
    console.log(`  review:      ${c.needs_review}`)
    console.log(`  summary:     ${c.summary_de}`)
    const { passes, fails } = check(fileName, c)
    if (passes.length) console.log(`  ✓ ${passes.join(', ')}`)
    if (fails.length) {
      totalFails += fails.length
      for (const f of fails) console.log(`  ✗ ${f}`)
    }
  } catch (err) {
    totalFails += 1
    console.log(`  ✗ ERROR: ${err.message}`)
  }
}

console.log(`\n${totalFails === 0 ? '✓ ALL EXPECTATIONS MET' : `✗ ${totalFails} expectation(s) failed`}`)
process.exit(totalFails === 0 ? 0 : 1)
