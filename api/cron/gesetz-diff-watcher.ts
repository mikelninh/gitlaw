/**
 * GET /api/cron/gesetz-diff-watcher
 *
 * Monday-Morning Cron (09:00 Berlin) — pulls weekly law-corpus diffs,
 * classifies §-changes against the topic-catalogue, matches each
 * subscriber's topics, and drafts a personal digest per subscriber.
 *
 * NEVER auto-sends. The drafts are returned in the response body and
 * staged for human review (Bao or Mikel). A future PR will hook in
 * Postmark / Resend after a green pilot week.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * vercel.json: { "path": "/api/cron/gesetz-diff-watcher", "schedule": "0 7 * * 1" }
 *  (07:00 UTC = 09:00 Berlin in summer / 08:00 in winter — acceptable jitter)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { _internals, DIFF_TOPICS, type DiffTopic } from '../_diff_watcher_tools'

const MAX_CHANGES_PER_RUN = 40 // free-tier RPM-budget; rest deferred to next week
const MAX_SUBSCRIBERS_PER_RUN = 20

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return res.status(500).json({ error: 'CRON_SECRET not configured' })
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  try {
    // 1. Diff-list
    const { changes, source } = await _internals.listChangedParagraphs({ since_iso: sinceIso })
    const slice = changes.slice(0, MAX_CHANGES_PER_RUN)

    // 2. Classify each change
    const classified: Array<{
      law: string
      section: string | null
      topics: DiffTopic[]
      summary: string
    }> = []
    for (const c of slice) {
      const cls = await _internals.classifyParagraphTopics({
        law: c.law,
        section: c.section,
        excerpt: c.excerpt,
      })
      const topics = (cls.topics ?? []).filter((t) => DIFF_TOPICS.includes(t)) as DiffTopic[]
      classified.push({
        law: c.law,
        section: c.section,
        topics: topics.length ? topics : ['sonstiges'],
        summary: cls.reasoning_de ?? '',
      })
    }

    // 3. Union of all topics actually changed
    const topicsChanged = Array.from(new Set(classified.flatMap((c) => c.topics)))

    // 4. Find matching subs
    const { subscriptions } = await _internals.listMatchingSubscriptions({
      topics_changed: topicsChanged,
    })

    // 5. Draft per subscriber
    const drafts: Array<{
      subscription_id: string
      email_hash: string
      matched_topics: string[]
      subject: string
      body: string
      language: string
    }> = []

    for (const sub of (subscriptions as Array<Record<string, unknown>>).slice(0, MAX_SUBSCRIBERS_PER_RUN)) {
      const subTopics = (sub.topics as string[]) ?? []
      const relevantChanges = classified.filter((c) => c.topics.some((t) => subTopics.includes(t)))
      if (relevantChanges.length === 0) continue
      const lang = (sub.language as 'de' | 'en') ?? 'de'

      const digest = await _internals.draftUserDigest({
        user_topics: subTopics,
        changes: relevantChanges,
        language: lang,
      })

      drafts.push({
        subscription_id: String(sub.id),
        email_hash: String(sub.email_hash),
        matched_topics: subTopics.filter((t) => relevantChanges.some((c) => c.topics.includes(t as DiffTopic))),
        subject: digest.subject,
        body: digest.body,
        language: digest.language,
      })
    }

    return res.status(200).json({
      ok: true,
      since: sinceIso,
      source,
      total_changes_found: changes.length,
      classified: classified.length,
      topics_changed: topicsChanged,
      subscribers_matched: subscriptions.length,
      drafts_generated: drafts.length,
      drafts, // human review only — never auto-sent
      note: 'Pilot phase: drafts are staged, NOT sent. Review then send manually.',
    })
  } catch (err) {
    console.error('[gesetz-diff-watcher]', (err as Error).message)
    return res.status(500).json({ ok: false, error: 'Diff-Watcher fehlgeschlagen', detail: (err as Error).message })
  }
}
