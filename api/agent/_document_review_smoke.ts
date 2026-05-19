/**
 * Smoke test for the Document-Review-Agent — runs the agent loop in-process
 * against a synthetic 3-doc batch (Reisepass-Scan, Mietvertrag,
 * Behörden-Brief) and reports time + cost + tool sequence + time-savings.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   SMOKE_BATCH=3 npx tsx api/agent/_document_review_smoke.ts
 *
 * Wir laufen gegen tenant 'beta-shared' — keine Akten mit diesen Namen,
 * also werden alle match-results "none" sein. Das exercised den
 * "unmatched"-Pfad der Zusammenfassung, was wir ausdrücklich smoke-testen.
 */

import { runAgent } from '../_agent'
import { buildDocumentReviewTools } from '../_document_review_tools'

interface DocCase {
  document_id: string
  original_filename: string
  ocr_text: string
}

const ALL_DOCS: DocCase[] = [
  {
    document_id: 'doc-001',
    original_filename: 'scan_2026-05-19_001.pdf',
    ocr_text: `BUNDESREPUBLIK DEUTSCHLAND
REISEPASS / PASSPORT
Nachname / Surname: NGUYEN
Vorname / Given Names: VAN MINH
Staatsangehörigkeit: VIETNAMESISCH
Geburtsdatum: 14.07.1994
Geburtsort: HANOI
Pass-Nr: C01X23456
Ausstellungsdatum: 03.06.2022
Gültig bis: 02.06.2032
Behörde: Botschaft der SR Vietnam Berlin`,
  },
  {
    document_id: 'doc-002',
    original_filename: 'scan_2026-05-19_002.pdf',
    ocr_text: `MIETVERTRAG über Wohnraum

Zwischen
Vermieter: Hausverwaltung Müller GmbH, Berliner Str. 12, 10713 Berlin
und
Mieter: Tran Thi Hoa, geb. 22.03.1989

wird folgender Mietvertrag geschlossen über die Wohnung
Adresse: Kantstraße 88, 10627 Berlin, 3. OG links
Wohnfläche: 62 m², 2 Zimmer, Küche, Bad

§ 1 Mietzeit: Beginn 01.06.2026, unbefristet
§ 2 Miete: Grundmiete 980,00 € + Nebenkostenvorauszahlung 220,00 €
§ 3 Kaution: 2.940,00 € (3 Nettokaltmieten)

Ort, Datum: Berlin, 12.05.2026
Unterschrift Vermieter / Mieter`,
  },
  {
    document_id: 'doc-003',
    original_filename: 'scan_2026-05-19_003.pdf',
    ocr_text: `Landesamt für Einwanderung Berlin
Friedrich-Krause-Ufer 24
13353 Berlin

Aktenzeichen: ABH-2024-LE-77231
Datum: 14.05.2026

Frau Le Thi Hoang
Schönhauser Allee 142
10437 Berlin

Betreff: Verlängerung der Aufenthaltserlaubnis nach § 16b AufenthG
— Nachforderung weiterer Unterlagen

Sehr geehrte Frau Le,

zur abschließenden Bearbeitung Ihres Antrags benötigen wir folgende
Unterlagen:

1. Aktuelle Meldebescheinigung (≤ 3 Monate alt)
2. Sperrkonto-Bestätigung mit Mindestguthaben 11.904,00 €
3. Krankenversicherungsnachweis für die gesamte Geltungsdauer

Bitte einreichen bis spätestens 15.06.2026.

Mit freundlichen Grüßen
[Sachbearbeiterin LEA Berlin]`,
  },
]

const batchSize = Math.max(
  1,
  Math.min(ALL_DOCS.length, Number(process.env.SMOKE_BATCH ?? '3') || 3),
)
const DOCS = ALL_DOCS.slice(0, batchSize)

const SYSTEM_PROMPT = `Du bist der Document-Review-Agent für eine deutsche
Migrationskanzlei. Folge strikt dieser Reihenfolge, jedes Tool max. 1×:
1. match_documents_to_akten — ALLE Dokumente in EINEM Call.
2. classify_document_type — ALLE Dokumente in EINEM Call.
3. suggest_rename — pro Doc mit doc_type aus Schritt 2 und mandant_name
   aus Schritt 1 (oder null wenn match_kind=none).
4. get_current_case_docs — nur wenn es eindeutige Matches (unique_name) gab.
   Sonst überspringen.
5. analyze_pflichtdoc_gaps — nur wenn Schritt 4 lief. Sonst überspringen.
6. build_review_summary — IMMER aufrufen, mit allen matches aus Schritt 1
   (angereichert um doc_type aus Schritt 2 und suggested_filename aus
   Schritt 3) und allen gaps aus Schritt 5 (leer wenn übersprungen).
Maximal 8 Tool-Calls. Am Ende deutsche 4-6-Satz-Zusammenfassung für die Refa.`

async function main() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const tools = buildDocumentReviewTools({
    tenant_id: 'beta-shared',
    today_iso: todayIso,
  })

  console.log(`\n=== Document-Review smoke — batch of ${DOCS.length} ===`)
  const t0 = Date.now()
  const userMessage =
    `Heutiges Datum: ${todayIso}\n` +
    `Batch: ${DOCS.length} Dokumente.\n\n` +
    DOCS.map(
      (d) =>
        `--- document_id: ${d.document_id} ---\n` +
        `filename: ${d.original_filename}\n` +
        `ocr (${d.ocr_text.length} chars):\n${d.ocr_text}`,
    ).join('\n\n')

  const result = await runAgent({
    agentName: 'document_review_smoke',
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools,
    maxIterations: 12,
    maxCostUsd: 0.8,
  })
  const elapsed = (Date.now() - t0) / 1000
  const toolsCalled = result.toolTrace.map((t) => t.tool)
  console.log(
    `status=${result.status} iter=${result.iterations} cost=$${result.totalCostUsd.toFixed(4)} time=${elapsed.toFixed(1)}s`,
  )
  console.log(`tools: ${toolsCalled.join(' → ')}`)
  if (result.error) console.log(`error: ${result.error}`)

  // ── Per-tool artefacts dump (compact) ──────────────────────────────────
  for (const call of result.toolTrace) {
    const o = (call.output ?? {}) as Record<string, unknown>
    if (call.tool === 'classify_document_type' && Array.isArray(o.results)) {
      console.log('\nclassify_document_type:')
      for (const r of o.results as Array<Record<string, unknown>>) {
        console.log(
          `  ${r.document_id}: ${r.doc_type} @${(r.confidence as number ?? 0).toFixed(2)} — ${r.reasoning_de}`,
        )
      }
    }
    if (call.tool === 'match_documents_to_akten' && Array.isArray(o.matches)) {
      console.log('\nmatch_documents_to_akten:')
      for (const m of o.matches as Array<Record<string, unknown>>) {
        console.log(
          `  ${m.document_id}: ${m.match_kind} (candidate=${m.candidate_name ?? '–'}, case=${m.suggested_case_id ?? '–'})`,
        )
      }
    }
    if (call.tool === 'suggest_rename' && Array.isArray(o.renames)) {
      console.log('\nsuggest_rename:')
      for (const r of o.renames as Array<Record<string, unknown>>) {
        console.log(`  ${r.document_id} → ${r.suggested_filename}`)
      }
    }
    if (call.tool === 'analyze_pflichtdoc_gaps' && Array.isArray(o.gap_analysis)) {
      console.log('\nanalyze_pflichtdoc_gaps:')
      for (const g of o.gap_analysis as Array<Record<string, unknown>>) {
        const missing = (g.missing_labels_de as string[] | undefined) ?? []
        console.log(
          `  case=${g.case_id} mandant=${g.mandant_name ?? '–'}: ${missing.length === 0 ? 'alle Pflichtdocs vorhanden' : `fehlt ${missing.join(', ')}`}`,
        )
      }
    }
    if (call.tool === 'build_review_summary' && o.summary) {
      console.log('\nbuild_review_summary:', JSON.stringify(o.summary, null, 2))
    }
  }

  if (result.finalMessage) {
    console.log('\n--- final ---')
    console.log(result.finalMessage)
  }

  // ── Time-savings ──────────────────────────────────────────────────────
  console.log('\n========== TIME SAVINGS SUMMARY ==========')
  const humanBaselineMinPerDoc = 2 // Refa-Shadowing: ~2 min/Doc inkl. Akten-Suche, Umbenennung, Pflichtdoc-Check
  const humanTotalMin = DOCS.length * humanBaselineMinPerDoc
  const agentMin = elapsed / 60
  const reviewMin = Math.max(0.5, DOCS.length * 0.2) // ~12 s Review pro Doc
  const newTotalMin = agentMin + reviewMin
  const savedMin = humanTotalMin - newTotalMin
  const savedPct = ((savedMin / humanTotalMin) * 100).toFixed(0)
  console.log(
    `${DOCS.length} Docs: human baseline ${humanTotalMin}min vs agent ${agentMin.toFixed(2)}min + review ${reviewMin.toFixed(1)}min = ${newTotalMin.toFixed(1)}min → saves ${savedMin.toFixed(1)}min (${savedPct}%) @ $${result.totalCostUsd.toFixed(4)}`,
  )

  const scaleUp = 30 / DOCS.length
  console.log(
    `Hochgerechnet auf 30 Docs/Tag (Bao-Pilot): ` +
      `human ${(humanTotalMin * scaleUp).toFixed(0)}min/Tag ≈ ${((humanTotalMin * scaleUp) / 60).toFixed(1)}h, ` +
      `agentic ${(newTotalMin * scaleUp).toFixed(0)}min/Tag, ` +
      `Kosten ≈ $${(result.totalCostUsd * scaleUp).toFixed(2)}/Tag, ` +
      `Ersparnis ≈ ${((humanTotalMin - newTotalMin) * scaleUp / 60).toFixed(1)}h/Tag Refa-Zeit.`,
  )
}

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
