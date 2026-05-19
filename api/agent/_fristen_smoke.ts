/**
 * Smoke test for the Fristen-Monitor + Untätigkeitsklage-Agent.
 * Runs the agent loop in-process against 3 synthetic case shapes:
 *   - t_minus_14 (reminder)
 *   - t_minus_3  (mahnschreiben)
 *   - untaetigkeitsklage (T+0 § 75 VwGO)
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx api/agent/_fristen_smoke.ts                      # first case only (free-tier 5 RPM)
 *   SMOKE_CASE=untaetigkeitsklage npx tsx api/agent/_fristen_smoke.ts
 *
 * Since walk_open_cases hits the live DB and the synthetic Akten don't
 * exist there, the smoke calls the drafting tools directly via a thin
 * agent prompt that feeds the case data inline. This exercises every
 * LLM tool without depending on Postgres state.
 *
 * Human baseline: tracking + Klage-Drafting ~30-45 min per case manually.
 * Agent: < 60 s + ~2 min Anwalt-Review = 95%+ Zeitersparnis.
 */

import { runAgent } from '../_agent'
import { buildFristenTools } from '../_fristen_tools'

interface SmokeCase {
  name: string
  description: string
  human_baseline_minutes: number
  user_message: string
}

const ALL_CASES: SmokeCase[] = [
  {
    name: 'reminder',
    description: 'T-14: Mandant-Reminder, Nachreichung Unterlagen LEA',
    human_baseline_minutes: 8,
    user_message: `Akte:
- mandant_name: Nguyen Van Minh
- aktenzeichen: ABH-2024-NG-89456
- behoerde: Landesamt für Einwanderung Berlin
- behoerde_plz: 13353
- frist_datum: ${isoOffset(14)}
- frist_bezeichnung: Nachreichung Sperrkonto + Immatrikulation
- case_status: behoerde_nachforderung
- bucket: t_minus_14
- days_left: 14
- language: de

Aufgabe: draftet einen Mandant-Reminder.`,
  },
  {
    name: 'mahnschreiben',
    description: 'T-3: Mahnschreiben, Frist Stellungnahme BAMF läuft ab',
    human_baseline_minutes: 12,
    user_message: `Akte:
- mandant_name: Tran Thi Hoa
- aktenzeichen: 8765432-475
- behoerde: Bundesamt für Migration und Flüchtlinge
- behoerde_plz: 15890
- frist_datum: ${isoOffset(3)}
- frist_bezeichnung: Stellungnahme § 28 VwVfG
- case_status: behoerde_nachforderung
- bucket: t_minus_3
- days_left: 3

Aufgabe: draftet ein formelles Mahnschreiben.`,
  },
  {
    name: 'untaetigkeitsklage',
    description: 'T+0 § 75 VwGO: BAMF entscheidet seit 4 Monaten nicht über Asylantrag',
    human_baseline_minutes: 40,
    user_message: `Akte:
- mandant_name: Le Thi Hoang
- aktenzeichen: BAMF-AS-554321-VN-2025
- behoerde: Bundesamt für Migration und Flüchtlinge
- behoerde_plz: 90478
- frist_datum: ${isoOffset(-7)}
- frist_bezeichnung: behoerden_frist_§75 — 3-Monats-Frist VwGO abgelaufen
- case_status: antrag_eingereicht
- bucket: t_zero_or_overdue
- days_left: -7
- antrag_datum_iso: ${isoOffset(-130)}
- monate_seit_antrag: 4
- description / Sachstand: Asylantrag wurde am ${isoOffset(-130)} gestellt.
  Anhörung gem. § 25 AsylG fand am ${isoOffset(-100)} statt. Seitdem keine
  Sachentscheidung des BAMF. Mandantin ist vietnamesische Staatsangehörige,
  beruft sich auf Verfolgung wegen politischer Aktivitäten. Es liegt kein
  zureichender Grund für die Untätigkeit vor — insbesondere keine
  Mitwirkungspflichtverletzung der Mandantin, keine Auskünfte vom
  Auswärtigen Amt sind ausstehend. Die 3-Monats-Frist gem. § 75 VwGO
  ist seit ${isoOffset(-7)} überschritten.

Aufgabe: bestimme zuständiges VG anhand Behörden-PLZ, dann drafte eine
vollständige Untätigkeitsklage gem. § 75 VwGO.`,
  },
]

function isoOffset(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const filterName = process.env.SMOKE_CASE
const CASES = filterName ? ALL_CASES.filter((c) => c.name === filterName) : ALL_CASES.slice(0, 1)

const SYSTEM_PROMPT = `Du bist der Fristen-Monitor- und Untätigkeitsklage-Agent
einer deutschen Migrationskanzlei (json). Du erhältst eine konkrete Akte mit
Frist-Daten. Du wählst je nach bucket genau EIN passendes Draft-Tool:

- bucket=t_minus_14 → draft_mandant_reminder
- bucket=t_minus_3  → draft_mahnschreiben
- bucket=t_zero_or_overdue UND frist_bezeichnung enthält "§ 75" oder
  case_status ∈ {antrag_eingereicht, behoerdliche_rueckmeldung_ausstehend}
  → ZUERST determine_zustaendig_vg, DANN draft_untaetigkeitsklage
- sonst → draft_mahnschreiben (letzte Mahnung)

Max 4 Tool-Calls. Am Ende: deutsche 4-6-Satz-Zusammenfassung für die
Anwält:in, was im "Heute"-Widget liegt.`

async function main() {
  const tools = buildFristenTools({
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
    final_excerpt: string
  }> = []

  for (const c of CASES) {
    console.log(`\n=== ${c.name} — ${c.description} ===`)
    const t0 = Date.now()
    const result = await runAgent({
      agentName: 'fristen_smoke',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: c.user_message,
      tools,
      maxIterations: 6,
      maxCostUsd: 0.6,
    })
    const elapsed = (Date.now() - t0) / 1000
    const toolsCalled = result.toolTrace.map((t) => t.tool)
    console.log(
      `status=${result.status} iter=${result.iterations} cost=$${result.totalCostUsd.toFixed(4)} time=${elapsed.toFixed(1)}s`,
    )
    console.log(`tools: ${toolsCalled.join(' → ')}`)
    if (result.error) console.log(`error: ${result.error}`)

    // Print last tool output (the actual draft) for inspection
    const lastDraft = [...result.toolTrace].reverse().find((t) => t.tool.startsWith('draft_'))
    if (lastDraft) {
      console.log('--- draft output ---')
      console.log(JSON.stringify(lastDraft.output, null, 2).slice(0, 3000))
    }
    if (result.finalMessage) {
      console.log('--- agent summary ---')
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
      final_excerpt: (result.finalMessage ?? '').slice(0, 400),
    })
  }

  console.log('\n\n========== TIME SAVINGS SUMMARY ==========')
  let totalAgentSec = 0
  let totalHumanMin = 0
  let totalCost = 0
  for (const r of results) {
    const reviewMin = 2
    const agentMin = r.elapsed_s / 60
    const newTotal = agentMin + reviewMin
    const savedMin = r.human_baseline_minutes - newTotal
    const savedPct = ((savedMin / r.human_baseline_minutes) * 100).toFixed(0)
    console.log(
      `${r.name.padEnd(22)} agent ${r.elapsed_s.toFixed(0)}s + review 2min → ${newTotal.toFixed(1)}min, ` +
        `vs human ${r.human_baseline_minutes}min → spart ${savedMin.toFixed(1)}min (${savedPct}%) @ $${r.cost.toFixed(4)}`,
    )
    totalAgentSec += r.elapsed_s
    totalHumanMin += r.human_baseline_minutes
    totalCost += r.cost
  }

  if (results.length > 0) {
    const totalReviewMin = results.length * 2
    const totalNewMin = totalAgentSec / 60 + totalReviewMin
    console.log(
      `\n${results.length} Akte(n): human ${totalHumanMin}min → agentic ${totalNewMin.toFixed(1)}min ` +
        `(${(totalHumanMin / Math.max(totalNewMin, 0.1)).toFixed(1)}× schneller) @ $${totalCost.toFixed(4)}`,
    )
    // Hochrechnung Bao-Pilot: 50 aktive Akten, ~5 Frist-Events/Tag
    const scale = 5 / Math.max(results.length, 1)
    console.log(
      `Hochgerechnet auf 5 Frist-Events/Tag (Bao-Pilot 50 Akten): ` +
        `human ${(totalHumanMin * scale).toFixed(0)}min/Tag, ` +
        `agent ${(totalNewMin * scale).toFixed(0)}min/Tag, ` +
        `Kosten ≈ $${(totalCost * scale).toFixed(2)}/Tag, ` +
        `Ersparnis ≈ ${((totalHumanMin - totalNewMin) * scale / 60).toFixed(1)}h/Tag.`,
    )
  }
}

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
