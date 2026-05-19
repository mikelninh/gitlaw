/**
 * Direct-call smoke test for the Lebenslagen agent — bypasses HTTP and
 * runs the agent loop in-process. The persisted run will fail silently
 * if DATABASE_URL is not set (agent_loop wraps DB writes in try/catch),
 * so this works for fast local iteration without Neon.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx api/agent/_smoke.ts
 *
 * NEVER ship as a Vercel route — it's a dev tool. Lives under api/ for
 * import-path convenience; rename or move into scripts/ if it ever shows
 * up in `vercel deploy` output.
 */

import { runAgent } from '../_agent'
import { buildLebenslagenTools } from '../_lebenslagen_tools'

const ALL_CASES: Array<{ name: string; description: string }> = [
  {
    name: 'eigenbedarf-haerte',
    description:
      'Mein Vermieter kündigt Eigenbedarf, ich habe 3 Wochen Zeit zum Antworten, bin alleinerziehend mit 2 Kindern und meine Tochter geht zur Schule in der Nähe. Was kann ich tun?',
  },
  {
    name: 'bussgeld-einspruch',
    description:
      'Ich habe einen Bußgeldbescheid wegen 25 km/h zu schnell auf der Autobahn bekommen, 70 Euro. Der Bescheid kam vor 5 Tagen. Ich glaube, das Blitzgerät war defekt. Was kann ich tun?',
  },
  {
    name: 'kuendigung-arbeit',
    description:
      'Mein Arbeitgeber hat mir gestern fristlos gekündigt. Begründung: ich hätte angeblich eine Kollegin beleidigt. Stimmt aber nicht. Was kann ich machen, ich habe gehört 3 Wochen Frist?',
  },
]

// Restrict via `SMOKE_CASE=<name>` to avoid OpenAI free-tier rate limits
// (5 RPM × 6-7 calls per agent → second case hits limit immediately).
const filterName = process.env.SMOKE_CASE
const CASES = filterName
  ? ALL_CASES.filter((c) => c.name === filterName)
  : ALL_CASES.slice(0, 1)

async function main() {
  const tools = buildLebenslagenTools()
  for (const c of CASES) {
    console.log(`\n=== ${c.name} ===`)
    const t0 = Date.now()
    const result = await runAgent({
      agentName: 'lebenslagen_smoke',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: c.description,
      tools,
      maxIterations: 10,
      maxCostUsd: 0.4,
    })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(
      `status=${result.status} iter=${result.iterations} cost=$${result.totalCostUsd.toFixed(4)} time=${elapsed}s`,
    )
    console.log(`tools: ${result.toolTrace.map((t) => t.tool).join(' → ')}`)
    if (result.error) console.log(`error: ${result.error}`)
    if (result.finalMessage) {
      console.log('--- final ---')
      console.log(result.finalMessage)
    }
  }
}

const SYSTEM_PROMPT = `Du bist der Lebenslagen-Assistent. Folge strikt dieser Reihenfolge:
1. detect_lebenslage
2. search_relevant_paragraphs (mit lebenslage)
3. compute_frist (wenn Frist im Text)
4. find_template (mit lebenslage + Keyword)
5. draft_letter (wenn Vorlage gefunden, mit facts aus der Beschreibung)
Maximal 7 Tool-Calls. Am Ende: kurze deutsche Zusammenfassung mit §§, Frist, Vorlage, Empfehlung. KEINE Halluzinationen.`

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
