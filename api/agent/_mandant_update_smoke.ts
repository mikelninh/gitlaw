/**
 * Smoke test for the Mandant-Update-Agent.
 *
 * 3 synthetic cases:
 *  (a) neue-unterlagen-de — DE Mandant, new doc uploaded → draft DE
 *  (b) neue-unterlagen-vi — VI Mandant with antrag_eingereicht status change → draft VI
 *  (c) kein-update        — DE Mandant where nothing changed → "no update needed"
 *
 * Tools are invoked directly (no full agent loop, no DB). This exercises the
 * draft prompts and language heuristic without needing a populated tenant DB.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   SMOKE_CASE=neue-unterlagen-vi npx tsx api/agent/_mandant_update_smoke.ts
 *   SMOKE_CASE=all npx tsx api/agent/_mandant_update_smoke.ts
 *
 * SMOKE_CASE gate prevents accidental triple-LLM-call on every save.
 */

import { _internals } from '../_mandant_update_tools'

interface SyntheticCase {
  name: string
  mandant_name: string
  mandant_email: string
  aktenzeichen: string
  new_documents: Array<{ id: string; name: string }>
  status_changed: boolean
  current_status: string | null
  frist_datum: string | null
  frist_bezeichnung: string | null
  meaningful_change: boolean
}

const ALL_CASES: SyntheticCase[] = [
  {
    name: 'neue-unterlagen-de',
    mandant_name: 'Anna Schmidt',
    mandant_email: 'anna.schmidt@example.de',
    aktenzeichen: 'KN-2026-0042',
    new_documents: [
      { id: 'doc_a1', name: 'Meldebescheinigung_2026-05.pdf' },
      { id: 'doc_a2', name: 'Sperrkonto-Bestaetigung.pdf' },
    ],
    status_changed: false,
    current_status: 'unterlagen_in_pruefung',
    frist_datum: '2026-06-10',
    frist_bezeichnung: 'LEA Nachforderung',
    meaningful_change: true,
  },
  {
    name: 'neue-unterlagen-vi',
    mandant_name: 'Nguyen Van Minh',
    mandant_email: 'minh.nguyen@example.com',
    aktenzeichen: 'KN-2026-0107',
    new_documents: [
      { id: 'doc_v1', name: 'Antragsbestaetigung_BAMF.pdf' },
    ],
    status_changed: true,
    current_status: 'antrag_eingereicht',
    frist_datum: null,
    frist_bezeichnung: null,
    meaningful_change: true,
  },
  {
    name: 'kein-update',
    mandant_name: 'Klaus Müller',
    mandant_email: 'klaus.mueller@example.de',
    aktenzeichen: 'KN-2026-0099',
    new_documents: [],
    status_changed: false,
    current_status: 'behoerdliche_rueckmeldung_ausstehend',
    frist_datum: null,
    frist_bezeichnung: null,
    meaningful_change: false,
  },
]

async function main() {
  const filterName = process.env.SMOKE_CASE
  if (!filterName) {
    console.error('Refusing to run without SMOKE_CASE env var (rate-limit safety).')
    console.error('  SMOKE_CASE=neue-unterlagen-vi npx tsx api/agent/_mandant_update_smoke.ts')
    console.error('  SMOKE_CASE=all                npx tsx api/agent/_mandant_update_smoke.ts')
    process.exit(2)
  }
  const cases =
    filterName === 'all' ? ALL_CASES : ALL_CASES.filter((c) => c.name === filterName)
  if (cases.length === 0) {
    console.error(`No case matches SMOKE_CASE=${filterName}`)
    process.exit(2)
  }

  const HUMAN_BASELINE_MIN_PER_UPDATE = 8 // 4h / ~30 Mandanten/Woche
  let totalDrafts = 0
  const t0 = Date.now()

  for (const c of cases) {
    console.log(`\n=== ${c.name} — ${c.mandant_name} ===`)

    if (!c.meaningful_change) {
      console.log(`meaningful_change=false → SKIP. Kein Update nötig.`)
      continue
    }

    const lang = await _internals.detectMandantLanguage({
      mandant_email: c.mandant_email,
      mandant_name: c.mandant_name,
    })
    console.log(`detected language: ${lang.language} (${lang.reasoning})`)

    const draft = await _internals.draftSachstandEmail({
      mandant_name: c.mandant_name,
      language: lang.language,
      case_aktenzeichen: c.aktenzeichen,
      current_status: c.current_status,
      new_documents: c.new_documents,
      status_changed: c.status_changed,
      frist_datum: c.frist_datum,
      frist_bezeichnung: c.frist_bezeichnung,
      kanzlei_name: 'Kanzlei Nguyen',
    })

    if ('error' in draft && draft.error) {
      console.log(`draft FAILED: ${draft.error}`)
      continue
    }
    totalDrafts += 1
    console.log(`subject: ${draft.subject}`)
    console.log(`--- body (${draft.language}) ---`)
    console.log(draft.body)
  }

  const elapsedS = (Date.now() - t0) / 1000
  console.log('\n========== TIME SAVINGS ==========')
  const refaMinSaved = HUMAN_BASELINE_MIN_PER_UPDATE * totalDrafts
  console.log(
    `${totalDrafts} Drafts in ${elapsedS.toFixed(1)}s agent-time.\n` +
      `Human baseline: ~${HUMAN_BASELINE_MIN_PER_UPDATE}min pro Update × ${totalDrafts} = ${refaMinSaved}min Refa-Zeit.\n` +
      `Wöchentlich für 30 Mandanten: 30 × 8min = 240min ≈ 4h Refa heute → 15min Anwält:in-Review mit Agent.`,
  )
}

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
