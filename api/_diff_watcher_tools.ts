/**
 * Tools for the GitLaw Bürger Gesetzes-Diff-Watcher (Agent #7).
 *
 * Weekly Monday-cron pulls fresh law-corpus from gesetze-im-internet.de
 * (update-laws.yml). This agent makes the diff personal:
 *
 *   1. list_changed_paragraphs(since_iso) — git log against laws/ corpus
 *   2. classify_paragraph_topics(paragraph_text) — LLM into ~15 themes
 *   3. list_matching_subscriptions(topics_changed[]) — DB lookup
 *   4. draft_user_digest(user_topics[], changes[], language) — warm digest
 *
 * NO auto-send. Drafts go into the run result for human review.
 */

import * as crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'
import { getSql } from './_db'
import { chatJSON } from './_llm'
import { logger } from './_log'
import type { ToolDef } from './_agent'
import { z } from 'zod'

const execFileP = promisify(execFile)

// ── Topic catalogue (mirrors LEBENSLAGEN + a few specialized buckets) ────

export const DIFF_TOPICS = [
  'mietrecht',
  'arbeitsrecht',
  'familienrecht',
  'verbraucherrecht',
  'sozialrecht',
  'verkehrsrecht',
  'strafrecht',
  'asylrecht',
  'erbrecht',
  'datenschutz',
  'gesundheitsrecht',
  'selbststaendigkeit',
  'steuerrecht',
  'bauen_und_wohnen',
  'sonstiges',
] as const

export type DiffTopic = (typeof DIFF_TOPICS)[number]

const TOPIC_LABELS_DE: Record<DiffTopic, string> = {
  mietrecht: 'Mietrecht',
  arbeitsrecht: 'Arbeitsrecht',
  familienrecht: 'Familienrecht',
  verbraucherrecht: 'Verbraucherrecht',
  sozialrecht: 'Sozialrecht',
  verkehrsrecht: 'Verkehrsrecht',
  strafrecht: 'Strafrecht',
  asylrecht: 'Asyl- & Aufenthaltsrecht',
  erbrecht: 'Erbrecht',
  datenschutz: 'Datenschutz',
  gesundheitsrecht: 'Gesundheitsrecht',
  selbststaendigkeit: 'Selbstständigkeit',
  steuerrecht: 'Steuerrecht',
  bauen_und_wohnen: 'Bauen & Wohnen',
  sonstiges: 'Sonstiges',
}

// ── Types shared across tools ────────────────────────────────────────────

export type ChangedParagraph = {
  law: string
  section: string | null
  file: string
  change_kind: 'added' | 'modified' | 'deleted'
  excerpt: string
}

// ── Tool 1: list_changed_paragraphs ──────────────────────────────────────

async function listChangedParagraphs(args: {
  since_iso: string
  repo_root?: string
  injected?: ChangedParagraph[]
}): Promise<{ changes: ChangedParagraph[]; source: string }> {
  // Smoke-/dev-injection path — never touches git
  if (args.injected && args.injected.length > 0) {
    return { changes: args.injected, source: 'injected' }
  }

  const root = args.repo_root ?? path.resolve(__dirname, '..')
  try {
    const { stdout } = await execFileP(
      'git',
      ['log', `--since=${args.since_iso}`, '--name-status', '--diff-filter=AMD', '--', 'laws/'],
      { cwd: root, maxBuffer: 20 * 1024 * 1024 },
    )

    const seen = new Map<string, ChangedParagraph>()
    for (const line of stdout.split('\n')) {
      const m = line.match(/^([AMD])\s+(laws\/[^\s]+\.md)$/)
      if (!m) continue
      const kind = m[1] === 'A' ? 'added' : m[1] === 'M' ? 'modified' : 'deleted'
      const file = m[2]
      const base = path.basename(file, '.md')
      // best-effort §-Erkennung: dateinamen wie "bgb_573.md" oder "_573bgb.md"
      const sectionMatch = base.match(/(\d+[a-z]?)/i)
      const lawMatch = base.match(/([a-z]+)$/i) || base.match(/^([a-z]+)_/i)
      const law = (lawMatch?.[1] ?? base).toUpperCase().slice(0, 16)
      const section = sectionMatch?.[1] ?? null
      if (!seen.has(file)) {
        seen.set(file, {
          law,
          section,
          file,
          change_kind: kind as ChangedParagraph['change_kind'],
          excerpt: '',
        })
      }
    }
    return { changes: Array.from(seen.values()), source: 'git' }
  } catch (e) {
    logger.warn({ msg: 'list_changed_paragraphs git failed', err: String(e) })
    return { changes: [], source: 'git_error' }
  }
}

// ── Tool 2: classify_paragraph_topics ────────────────────────────────────

const ClassifySchema = z.object({
  topics: z.array(z.enum(DIFF_TOPICS)).optional().default([]),
  reasoning_de: z.string(),
})

async function classifyParagraphTopics(args: {
  law: string
  section: string | null
  excerpt: string
}) {
  const topicList = DIFF_TOPICS.map((t) => `- ${t}: ${TOPIC_LABELS_DE[t]}`).join('\n')
  const system = `Du klassifizierst einen geänderten Paragraphen eines deutschen Gesetzes
in 1-3 Themen aus folgender Liste. Antwort als JSON {topics, reasoning_de}.

THEMEN:
${topicList}

REGELN
- 1 bis maximal 3 Themen wählen; bei Unklarheit "sonstiges".
- reasoning_de: ein Satz, warum diese Themen passen.
- Erfinde keine Themen außerhalb der Liste.`

  const userMsg = `Gesetz: ${args.law}
§: ${args.section ?? 'unbekannt'}
Auszug:
${args.excerpt.slice(0, 4000) || '(kein Auszug verfügbar — bitte allein nach Gesetz/§ einschätzen)'}`

  try {
    const { data } = await chatJSON(ClassifySchema, [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'classify_paragraph_topics failed', err: String(e) })
    return { topics: ['sonstiges'] as DiffTopic[], reasoning_de: 'Fallback — manuell prüfen.', error: String(e) }
  }
}

// ── Tool 3: list_matching_subscriptions ──────────────────────────────────

async function listMatchingSubscriptions(args: { topics_changed: string[] }) {
  if (!args.topics_changed || args.topics_changed.length === 0) {
    return { subscriptions: [] }
  }
  try {
    const sql = getSql()
    const rows = (await sql`
      SELECT id, email_hash, email_token, topics, language, unsubscribe_token, last_sent_at
        FROM gesetz_subscriptions
       WHERE topics && ${args.topics_changed}::text[]
    `) as Array<Record<string, unknown>>
    return { subscriptions: rows }
  } catch (e) {
    logger.warn({ msg: 'list_matching_subscriptions failed', err: String(e) })
    return { subscriptions: [], error: String(e) }
  }
}

// ── Tool 4: draft_user_digest ────────────────────────────────────────────

const DigestSchema = z.object({
  subject: z.string(),
  body: z.string(),
  language: z.enum(['de', 'en']),
})

async function draftUserDigest(args: {
  user_topics: string[]
  changes: Array<{ law: string; section: string | null; topics: string[]; summary?: string }>
  language: 'de' | 'en'
}) {
  const langLabel = args.language === 'de' ? 'Deutsch' : 'Englisch'
  const topicList = args.user_topics
    .map((t) => TOPIC_LABELS_DE[t as DiffTopic] ?? t)
    .join(', ')
  const changeList = args.changes
    .slice(0, 12)
    .map(
      (c) =>
        `- ${c.law}${c.section ? ' § ' + c.section : ''} (Themen: ${c.topics.join(', ')})${c.summary ? ' — ' + c.summary : ''}`,
    )
    .join('\n')

  const system = `Du draftst eine warme, persönliche Wochen-Email an eine:n GitLaw-Bürger:in.
Antwort als JSON {subject, body, language}.

STIL
- Sprache: ${langLabel} (language="${args.language}")
- Warm, klar, ohne Marketing-Phrasen, ohne juristisches Pathos.
- Anrede: "Hallo" (keine Förmlichkeit), kurze Sätze.
- Keine Rechtsberatung — nur Hinweise auf Änderungen + Link-Platzhalter [GITLAW_LINK].
- Subject startet z.B. mit "Diese Woche im Recht für deine Themen — ${topicList}".
- Body endet mit Unsubscribe-Hinweis: "Wenn du keine weiteren Mails möchtest: [UNSUBSCRIBE_LINK]".
- KEINE Emojis. KEINE übertriebene Begeisterung.

INPUT
Abonnierte Themen: ${topicList || '(keine — fallback)'}
Diese Woche geändert:
${changeList || '(keine Änderungen passend zu den Themen)'}
`

  try {
    const { data } = await chatJSON(DigestSchema, [
      { role: 'system', content: system },
      { role: 'user', content: `Schreibe den Wochen-Digest in ${langLabel}.` },
    ])
    return data
  } catch (e) {
    logger.warn({ msg: 'draft_user_digest failed', err: String(e) })
    return { subject: '', body: '', language: args.language, error: String(e) }
  }
}

// ── Tool registry ────────────────────────────────────────────────────────

export function buildDiffWatcherTools(opts?: {
  injected_changes?: ChangedParagraph[]
}): ToolDef[] {
  return [
    {
      name: 'list_changed_paragraphs',
      description:
        'Liste Gesetzes-Paragraphen, die seit since_iso geändert wurden (git log gegen laws/). Gibt {changes:[{law,section,file,change_kind,excerpt}], source}.',
      schema: {
        type: 'object',
        properties: {
          since_iso: { type: 'string', description: 'ISO-Datum, z.B. 2026-05-12' },
        },
        required: ['since_iso'],
        additionalProperties: false,
      },
      handler: (a) =>
        listChangedParagraphs({
          ...(a as { since_iso: string }),
          injected: opts?.injected_changes,
        }),
    },
    {
      name: 'classify_paragraph_topics',
      description:
        'Klassifiziere einen geänderten Paragraphen in 1-3 Themen aus der festen Themen-Liste. Gibt {topics, reasoning_de}.',
      schema: {
        type: 'object',
        properties: {
          law: { type: 'string' },
          section: { type: 'string', nullable: true },
          excerpt: { type: 'string' },
        },
        required: ['law', 'excerpt'],
        additionalProperties: false,
      },
      handler: (a) =>
        classifyParagraphTopics(a as { law: string; section: string | null; excerpt: string }),
    },
    {
      name: 'list_matching_subscriptions',
      description:
        'Hole alle Abos, deren Themen sich mit topics_changed überschneiden. Gibt {subscriptions:[{id,email_hash,topics,language,unsubscribe_token}]}.',
      schema: {
        type: 'object',
        properties: {
          topics_changed: { type: 'array', items: { type: 'string' } },
        },
        required: ['topics_changed'],
        additionalProperties: false,
      },
      handler: (a) => listMatchingSubscriptions(a as { topics_changed: string[] }),
    },
    {
      name: 'draft_user_digest',
      description:
        'Draftet eine warme Wochen-Email für eine:n Abonnent:in basierend auf user_topics + diese Woche geänderten changes. Gibt {subject, body, language}.',
      schema: {
        type: 'object',
        properties: {
          user_topics: { type: 'array', items: { type: 'string' } },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                law: { type: 'string' },
                section: { type: 'string', nullable: true },
                topics: { type: 'array', items: { type: 'string' } },
                summary: { type: 'string', nullable: true },
              },
              required: ['law', 'topics'],
              additionalProperties: false,
            },
          },
          language: { type: 'string', enum: ['de', 'en'] },
        },
        required: ['user_topics', 'changes', 'language'],
        additionalProperties: false,
      },
      handler: (a) =>
        draftUserDigest(
          a as { user_topics: string[]; changes: Array<{ law: string; section: string | null; topics: string[]; summary?: string }>; language: 'de' | 'en' },
        ),
    },
  ]
}

export const _internals = {
  listChangedParagraphs,
  classifyParagraphTopics,
  listMatchingSubscriptions,
  draftUserDigest,
  TOPIC_LABELS_DE,
}

export const _modulePresenceTag = crypto
  .createHash('sha1')
  .update('diff-watcher-tools-v1')
  .digest('hex')
  .slice(0, 8)
