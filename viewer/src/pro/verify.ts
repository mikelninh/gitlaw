/**
 * Citation verification — strictly lookup-based (no prose parsing).
 *
 * The LLM returns structured citations via JSON Schema (see `ai.ts`):
 *   { paragraph: "238", gesetz: "StGB", bedeutung: "..." }
 *
 * This module does two things:
 *   1. Map `gesetz` (e.g. "StGB") → law file id ("stgb") and fetch the markdown.
 *   2. Confirm the `### § <paragraph>` heading exists in the file; grab a
 *      short excerpt for the UI.
 *
 * No regex on free prose. Only one small regex used to match the heading
 * itself inside the fetched law file.
 */

import type { Citation } from './types'
import type { ProCitation } from './ai'

const LAW_ABBREV_MAP: Record<string, string> = {
  GG: 'gg', StGB: 'stgb', BGB: 'bgb', StPO: 'stpo', ZPO: 'zpo',
  'SGB V': 'sgb_5', 'SGB VI': 'sgb_6', 'SGB II': 'sgb_2', 'SGB XII': 'sgb_12',
  'SGB IX': 'sgb_9', 'SGB IV': 'sgb_4', 'SGB X': 'sgb_10', 'SGB I': 'sgb_1',
  'SGB III': 'sgb_3', 'SGB VII': 'sgb_7', 'SGB VIII': 'sgb_8', 'SGB XI': 'sgb_11',
  EStG: 'estg', AO: 'ao_1977', NetzDG: 'netzdg', TierSchG: 'tierschg',
  AufenthG: 'aufenthg_2004', ArbZG: 'arbzg', KSchG: 'kschg',
  MuSchG: 'muschg', AGG: 'agg', GEG: 'geg', BEEG: 'beeg',
  BImSchG: 'bimschg', UWG: 'uwg', HGB: 'hgb', AktG: 'aktg',
  BetrVG: 'betrvg', InsO: 'inso', VwGO: 'vwgo', GWB: 'gwb',
  VwVfG: 'vwvfg', GVG: 'gvg', GewSchG: 'gewschg', SGG: 'sgg',
  StVO: 'stvo', StVG: 'stvg', UStG: 'ustg', WEG: 'weg',
}

const lawCache = new Map<string, string>()

async function loadLaw(lawId: string): Promise<string | null> {
  if (lawCache.has(lawId)) return lawCache.get(lawId)!
  try {
    const resp = await fetch(`./laws/${lawId}.md`)
    if (!resp.ok) return null
    const text = await resp.text()
    lawCache.set(lawId, text)
    return text
  } catch {
    return null
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeAbbrev(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export async function verifyCitation(c: ProCitation): Promise<Citation> {
  const abbr = normalizeAbbrev(c.gesetz)
  const display = `§ ${c.paragraph} ${abbr}`
  const lawId = LAW_ABBREV_MAP[abbr]

  if (!lawId) {
    return { display, lawId: '', section: c.paragraph, verified: false }
  }

  const text = await loadLaw(lawId)
  if (!text) {
    return { display, lawId, section: c.paragraph, verified: false }
  }

  // Find `### § 573` but not `### § 5` when we're looking for 573.
  const headingRe = new RegExp(`^###\\s+§\\s+${escapeRegex(c.paragraph)}(?![\\dA-Za-z])`, 'm')
  const m = headingRe.exec(text)
  if (!m) {
    return { display, lawId, section: c.paragraph, verified: false }
  }

  // Short excerpt from the matched heading onwards, stopping before the next
  // `### §` heading.
  const start = m.index + m[0].length
  const slice = text.slice(start, start + 600).trim()
  const next = slice.search(/^###\s+§/m)
  const excerptRaw = (next >= 0 ? slice.slice(0, next) : slice).trim()
  const excerpt = excerptRaw.replace(/\s+/g, ' ').slice(0, 280) +
    (excerptRaw.length > 280 ? '…' : '')

  return {
    display,
    lawId,
    section: c.paragraph,
    verified: true,
    excerpt,
  }
}

export async function verifyAllCitations(citations: ProCitation[]): Promise<Citation[]> {
  return Promise.all(citations.map(verifyCitation))
}
