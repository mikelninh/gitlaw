/**
 * Smoke test for the Behörden-Korrespondenz-Agent — runs the agent loop
 * in-process against 3 realistic LEA/BAMF letter shapes and reports time +
 * cost + tool sequence. Also estimates the time savings vs. the human
 * baseline.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx api/agent/_behoerden_smoke.ts                       # all 3 cases
 *   SMOKE_CASE=nachforderung npx tsx api/agent/_behoerden_smoke.ts
 *
 * Synthetic letters — no real Mandant data. The find_matching_case tool
 * will return "none" because no Akten with these Aktenzeichen exist in the
 * test tenant; that's expected and exercised in the agent's summary.
 *
 * Human-baseline time estimates are hand-calibrated from Refa-shadowing
 * sessions in the Bao pilot prep. They are the "30 LEA-Briefe à 5-10 min"
 * data point — not lab-clean but honest about origin.
 */

import { runAgent } from '../_agent'
import { buildBehoerdenTools } from '../_behoerden_tools'

interface Case {
  name: string
  description: string
  human_baseline_minutes: number
  letter_text: string
}

const ALL_CASES: Case[] = [
  {
    name: 'nachforderung',
    description: 'LEA Berlin fordert weitere Unterlagen für Verlängerung Aufenthaltstitel',
    human_baseline_minutes: 8,
    letter_text: `Landesamt für Einwanderung Berlin
Friedrich-Krause-Ufer 24
13353 Berlin

Aktenzeichen: ABH-2024-NG-89456
Datum: 12.05.2026

Betreff: Verlängerung der Aufenthaltserlaubnis nach § 16b AufenthG —
weitere Unterlagen erforderlich

Sehr geehrter Herr Nguyen Van Minh,

Ihr Antrag vom 28.04.2026 auf Verlängerung der Aufenthaltserlaubnis zu
Studienzwecken liegt uns vor. Zur abschließenden Prüfung benötigen wir
folgende Unterlagen:

1. Aktuelle Immatrikulationsbescheinigung (Sommersemester 2026)
2. Lückenloser Nachweis über alle bisherigen Leistungsnachweise (Transcript of Records)
3. Aktuelle Sperrkonto-Bestätigung mit Mindestguthaben gemäß § 16b
   Abs. 2 AufenthG (mindestens 11.904 Euro für 12 Monate)
4. Krankenversicherungsnachweis für die gesamte Geltungsdauer
5. Anmeldebestätigung des Wohnsitzes (Meldebescheinigung)

Bitte reichen Sie die Unterlagen vollständig bis spätestens
10.06.2026 ein. Bei Versäumnis dieser Frist kann der Antrag nicht
weiter bearbeitet werden.

Mit freundlichen Grüßen
[Sachbearbeiterin LEA]`,
  },
  {
    name: 'anhoerung',
    description: 'BAMF Anhörung vor ablehnendem Asylbescheid — § 28 VwVfG',
    human_baseline_minutes: 12,
    letter_text: `Bundesamt für Migration und Flüchtlinge
Außenstelle Eisenhüttenstadt
Poststraße 72
15890 Eisenhüttenstadt

Aktenzeichen: 8765432-475
Datum: 08.05.2026

Betreff: Anhörung gemäß § 28 VwVfG vor beabsichtigter Ablehnung des
Asylantrags

Sehr geehrte Frau Tran Thi Hoa,

nach derzeitiger Aktenlage beabsichtigt das Bundesamt, Ihren Asylantrag
abzulehnen. Die in Ihrer Anhörung am 14.03.2026 gemachten Angaben zur
Verfolgung durch staatliche Organe lassen sich anhand der
herkunftslandbezogenen Erkenntnisse nicht hinreichend belegen.

Bevor eine abschließende Entscheidung getroffen wird, geben wir Ihnen
gemäß § 28 Verwaltungsverfahrensgesetz Gelegenheit, sich zu den für
die Entscheidung erheblichen Tatsachen zu äußern.

Eine schriftliche Stellungnahme bitten wir innerhalb von drei Wochen
nach Zugang dieses Schreibens vorzulegen. Sollte innerhalb dieser
Frist keine Äußerung erfolgen, wird das Bundesamt anhand der
vorliegenden Aktenlage entscheiden.

Mit freundlichen Grüßen
[BAMF Entscheider:in]`,
  },
  {
    name: 'bescheid-negativ',
    description: 'VG Berlin: Klage abgewiesen, Berufungsfrist 1 Monat',
    human_baseline_minutes: 15,
    letter_text: `Verwaltungsgericht Berlin
Kirchstraße 7
10557 Berlin

Aktenzeichen: VG 28 K 1234/25
Datum: 03.05.2026

In der Verwaltungsstreitsache

Frau Le Thi Hoang — Klägerin —
vertreten durch Rechtsanwältin Bao Nguyen, Berlin

gegen

Bundesrepublik Deutschland, vertreten durch das Bundesamt für
Migration und Flüchtlinge — Beklagte —

wegen Asylrechts (Folgeantrag)

Urteil

Der Antrag der Klägerin, die Beklagte unter Aufhebung des Bescheids
vom 18.11.2025 zu verpflichten, ihr die Flüchtlingseigenschaft
zuzuerkennen, wird ABGEWIESEN.

Die Kosten des Verfahrens trägt die Klägerin.

Gründe (kurzgefasst): Das Gericht ist nicht überzeugt, dass die
Klägerin bei Rückkehr in den Heimatstaat mit beachtlicher
Wahrscheinlichkeit politische Verfolgung zu befürchten hat.

Rechtsmittelbelehrung

Gegen dieses Urteil steht den Beteiligten der Antrag auf Zulassung
der Berufung zu. Der Antrag ist innerhalb eines Monats nach Zustellung
des Urteils beim Verwaltungsgericht Berlin schriftlich zu stellen.

[Vorsitzende Richterin]`,
  },
]

const filterName = process.env.SMOKE_CASE
const CASES = filterName ? ALL_CASES.filter((c) => c.name === filterName) : ALL_CASES.slice(0, 1)

async function main() {
  const tools = buildBehoerdenTools({
    tenant_id: 'beta-shared',
    kanzlei_name: 'Kanzlei Nguyen',
  })

  const results: Array<{
    name: string
    status: string
    iterations: number
    cost: number
    elapsed_s: number
    human_baseline_minutes: number
    tools_called: string[]
  }> = []

  for (const c of CASES) {
    console.log(`\n=== ${c.name} — ${c.description} ===`)
    const t0 = Date.now()
    const result = await runAgent({
      agentName: 'behoerden_smoke',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Eingegangener Behörden-Brief:\n\n${c.letter_text}`,
      tools,
      maxIterations: 12,
      maxCostUsd: 0.6,
    })
    const elapsed = (Date.now() - t0) / 1000
    const toolsCalled = result.toolTrace.map((t) => t.tool)
    console.log(
      `status=${result.status} iter=${result.iterations} cost=$${result.totalCostUsd.toFixed(4)} time=${elapsed.toFixed(1)}s`,
    )
    console.log(`tools: ${toolsCalled.join(' → ')}`)
    if (result.error) console.log(`error: ${result.error}`)
    if (result.finalMessage) {
      console.log('--- final ---')
      console.log(result.finalMessage)
    }
    results.push({
      name: c.name,
      status: result.status,
      iterations: result.iterations,
      cost: result.totalCostUsd,
      elapsed_s: elapsed,
      human_baseline_minutes: c.human_baseline_minutes,
      tools_called: toolsCalled,
    })
  }

  // ── Time-savings summary ──────────────────────────────────────────────
  console.log('\n\n========== TIME SAVINGS SUMMARY ==========')
  let totalAgentSec = 0
  let totalHumanMin = 0
  let totalCost = 0
  for (const r of results) {
    const reviewMin = 2 // minutes Anwalt:in reviews the pre-drafted package
    const agentMin = r.elapsed_s / 60
    const newTotal = agentMin + reviewMin
    const savedMin = r.human_baseline_minutes - newTotal
    const savedPct = ((savedMin / r.human_baseline_minutes) * 100).toFixed(0)
    console.log(
      `${r.name.padEnd(20)} agent ${r.elapsed_s.toFixed(0)}s + review 2min → ${newTotal.toFixed(1)}min total, ` +
        `vs human baseline ${r.human_baseline_minutes}min → saves ${savedMin.toFixed(1)}min (${savedPct}%) @ $${r.cost.toFixed(4)}`,
    )
    totalAgentSec += r.elapsed_s
    totalHumanMin += r.human_baseline_minutes
    totalCost += r.cost
  }

  if (results.length > 0) {
    const totalReviewMin = results.length * 2
    const totalNewMin = totalAgentSec / 60 + totalReviewMin
    console.log(
      `\n${results.length} Briefe insgesamt: human ${totalHumanMin}min → agentic ${totalNewMin.toFixed(1)}min ` +
        `(${(totalHumanMin / totalNewMin).toFixed(1)}× schneller) @ $${totalCost.toFixed(4)} total OpenAI-Kosten`,
    )
    const scaleUp = 30 / results.length
    console.log(
      `Hochgerechnet auf 30 Briefe/Tag (Bao-Pilot): ` +
        `human ${(totalHumanMin * scaleUp).toFixed(0)}min/Tag ≈ ${((totalHumanMin * scaleUp) / 60).toFixed(1)}h, ` +
        `agentic ${(totalNewMin * scaleUp).toFixed(0)}min/Tag, ` +
        `Kosten ≈ $${(totalCost * scaleUp).toFixed(2)}/Tag, ` +
        `Ersparnis ≈ ${((totalHumanMin - totalNewMin) * scaleUp / 60).toFixed(1)}h/Tag Refa-Zeit.`,
    )
  }
}

const SYSTEM_PROMPT = `Du bist der Behörden-Korrespondenz-Agent für eine deutsche
Migrationskanzlei. Folge strikt dieser Reihenfolge:
1. extract_meta
2. find_matching_case
3. classify_letter_type
4. extract_demanded_documents (auch bei letter_type=bescheid_negativ aufrufen — leere Liste ist ok)
5. extract_behoerden_frist
6. draft_mandant_notification (nur wenn Doc-Anforderung oder Anhörung/Termin)
7. draft_anwalt_response (IMMER aufrufen)
Maximal 8 Tool-Calls. Am Ende eine deutsche 5-7-Satz-Zusammenfassung für die Anwält:in.`

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
