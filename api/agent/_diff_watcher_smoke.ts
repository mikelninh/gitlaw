/**
 * Smoke test for the Gesetzes-Diff-Watcher (Agent #7).
 *
 * Runs an end-to-end synthetic 2-week diff batch in-process:
 *   - 4 fake §-changes across different laws
 *   - classifies each into topics
 *   - upserts 2 synthetic subscribers
 *   - generates drafts
 *   - cleans up subscribers after
 *
 * Free-tier RPM friendly: 4 classify + 2 digest calls = 6 chatJSON in total.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx api/agent/_diff_watcher_smoke.ts
 */

import * as crypto from 'node:crypto'
import { _internals, type DiffTopic } from '../_diff_watcher_tools'
import { getSql } from '../_db'

const SYNTHETIC_CHANGES = [
  {
    law: 'BGB',
    section: '573',
    file: 'laws/bgb_573.md',
    change_kind: 'modified' as const,
    excerpt:
      'Der Vermieter kann nur kündigen, wenn er ein berechtigtes Interesse an der Beendigung des Mietverhältnisses hat. Eigenbedarf ist insbesondere ein berechtigtes Interesse, wenn der Vermieter die Räume als Wohnung für sich oder Angehörige benötigt.',
  },
  {
    law: 'AufenthG',
    section: '36',
    file: 'laws/aufenthg_36.md',
    change_kind: 'modified' as const,
    excerpt:
      'Den Eltern eines minderjährigen Ausländers, der eine Aufenthaltserlaubnis besitzt, ist eine Aufenthaltserlaubnis zum Zweck des Familiennachzugs zu erteilen, wenn sich kein personensorgeberechtigter Elternteil im Bundesgebiet aufhält.',
  },
  {
    law: 'KSchG',
    section: '1',
    file: 'laws/kschg_1.md',
    change_kind: 'modified' as const,
    excerpt:
      'Die Kündigung des Arbeitsverhältnisses gegenüber einem Arbeitnehmer, dessen Arbeitsverhältnis länger als sechs Monate bestanden hat, ist rechtsunwirksam, wenn sie sozial ungerechtfertigt ist.',
  },
  {
    law: 'DSGVO',
    section: '17',
    file: 'laws/dsgvo_17.md',
    change_kind: 'modified' as const,
    excerpt:
      'Die betroffene Person hat das Recht, von dem Verantwortlichen zu verlangen, dass sie betreffende personenbezogene Daten unverzüglich gelöscht werden ("Recht auf Vergessenwerden").',
  },
]

const SYNTHETIC_SUBSCRIBERS = [
  {
    email: 'mieter-test@example.invalid',
    topics: ['mietrecht', 'verbraucherrecht'],
    language: 'de' as const,
  },
  {
    email: 'asyl-test@example.invalid',
    topics: ['asylrecht', 'familienrecht', 'datenschutz'],
    language: 'de' as const,
  },
]

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

async function seedSubscribers(): Promise<string[]> {
  const sql = getSql()
  const ids: string[] = []
  for (const s of SYNTHETIC_SUBSCRIBERS) {
    const id = crypto.randomUUID()
    await sql`
      INSERT INTO gesetz_subscriptions (id, email_hash, email_token, topics, language, unsubscribe_token)
      VALUES (${id}, ${hashEmail(s.email)}, ${'tok_' + id.slice(0, 8)}, ${s.topics}::text[], ${s.language}, ${'unsub_' + id.slice(0, 12)})
    `
    ids.push(id)
  }
  return ids
}

async function cleanup(ids: string[]) {
  if (ids.length === 0) return
  const sql = getSql()
  await sql`DELETE FROM gesetz_subscriptions WHERE id = ANY(${ids}::text[])`
}

async function main() {
  const t0 = Date.now()
  console.log('\n=== Gesetzes-Diff-Watcher SMOKE ===')

  // 1. List changes (use injected)
  const { changes } = await _internals.listChangedParagraphs({
    since_iso: '2026-05-05',
    injected: SYNTHETIC_CHANGES,
  })
  console.log(`Step 1: ${changes.length} §-Änderungen geladen (synthetisch)`)

  // 2. Classify
  const classified: Array<{ law: string; section: string | null; topics: DiffTopic[]; summary: string }> = []
  for (const c of changes) {
    const cls = await _internals.classifyParagraphTopics({
      law: c.law,
      section: c.section,
      excerpt: c.excerpt,
    })
    const topics = (cls.topics ?? []) as DiffTopic[]
    classified.push({
      law: c.law,
      section: c.section,
      topics: topics.length ? topics : (['sonstiges'] as DiffTopic[]),
      summary: cls.reasoning_de ?? '',
    })
    console.log(`  ${c.law} §${c.section} → ${topics.join(', ')}`)
  }

  const topicsChanged = Array.from(new Set(classified.flatMap((c) => c.topics)))
  console.log(`Step 2: Union der Themen → ${topicsChanged.join(', ')}`)

  // 3. Seed + match
  let seededIds: string[] = []
  let dbAvailable = true
  try {
    seededIds = await seedSubscribers()
  } catch (e) {
    console.warn('  DB nicht erreichbar — überspringe DB-Match:', (e as Error).message)
    dbAvailable = false
  }

  let subs: Array<Record<string, unknown>> = []
  if (dbAvailable) {
    const { subscriptions } = await _internals.listMatchingSubscriptions({ topics_changed: topicsChanged })
    subs = subscriptions as Array<Record<string, unknown>>
    console.log(`Step 3: ${subs.length} Abonnent:innen matchen (von ${seededIds.length} seeded)`)
  } else {
    // fallback: use synthetic in-memory subscribers
    subs = SYNTHETIC_SUBSCRIBERS.map((s) => ({
      id: crypto.randomUUID(),
      email_hash: hashEmail(s.email),
      topics: s.topics,
      language: s.language,
      unsubscribe_token: 'mem',
    }))
    console.log(`Step 3 (fallback in-memory): ${subs.length} synthetische Abonnent:innen`)
  }

  // 4. Draft digests
  const drafts: Array<{ topics: string[]; subject: string; body: string }> = []
  for (const sub of subs.slice(0, 2)) {
    const subTopics = (sub.topics as string[]) ?? []
    const relevant = classified.filter((c) => c.topics.some((t) => subTopics.includes(t)))
    if (relevant.length === 0) continue
    const digest = await _internals.draftUserDigest({
      user_topics: subTopics,
      changes: relevant,
      language: (sub.language as 'de' | 'en') ?? 'de',
    })
    drafts.push({ topics: subTopics, subject: digest.subject, body: digest.body })
  }
  console.log(`Step 4: ${drafts.length} Drafts generiert`)

  // 5. Show excerpts
  for (const d of drafts) {
    console.log('\n--- Draft ---')
    console.log(`Themen: ${d.topics.join(', ')}`)
    console.log(`Subject: ${d.subject}`)
    console.log(`Body (gekürzt):\n${d.body.slice(0, 400)}${d.body.length > 400 ? '…' : ''}`)
  }

  // 6. Cleanup
  if (dbAvailable) await cleanup(seededIds)

  const elapsed = (Date.now() - t0) / 1000
  console.log(`\n=== DONE in ${elapsed.toFixed(1)}s ===`)
  console.log(
    `Summary: ${classified.length} classified, ${subs.length} subs matched, ${drafts.length} drafts staged (NICHT versendet).`,
  )
}

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
