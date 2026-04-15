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

/**
 * Abbreviation → law file id, reconciled against actual files in
 * viewer/public/laws/. Wrong mappings mean "verified" always fails even
 * though the law is in our corpus — directly kills user trust.
 *
 * Verified 2026-04-14 by spot-checking each target with `ls viewer/public/laws/`.
 * If you add an abbreviation here, confirm the file exists AND the heading
 * format inside the file uses `### § N` (our lookup pattern).
 */
const LAW_ABBREV_MAP: Record<string, string> = {
  GG: 'gg', StGB: 'stgb', BGB: 'bgb', StPO: 'stpo', ZPO: 'zpo',
  'SGB V': 'sgb_5', 'SGB VI': 'sgb_6', 'SGB II': 'sgb_2', 'SGB XII': 'sgb_12',
  'SGB IX': 'sgb_9', 'SGB IV': 'sgb_4', 'SGB X': 'sgb_10', 'SGB I': 'sgb_1',
  'SGB III': 'sgb_3', 'SGB VII': 'sgb_7', 'SGB VIII': 'sgb_8', 'SGB XI': 'sgb_11',
  EStG: 'estg', AO: 'ao_1977', NetzDG: 'netzdg', TierSchG: 'tierschg',
  AufenthG: 'aufenthg_2004', ArbZG: 'arbzg', KSchG: 'kschg',
  // Files with dated suffixes: use the dated version since that's what the corpus has.
  MuSchG: 'muschg_2018',
  UWG: 'uwg_2004',
  UStG: 'ustg_1980',
  StVO: 'stvo_2013',
  AGG: 'agg', GEG: 'geg', BEEG: 'beeg',
  BImSchG: 'bimschg', HGB: 'hgb', AktG: 'aktg',
  BetrVG: 'betrvg', InsO: 'inso', VwGO: 'vwgo', GWB: 'gwb',
  VwVfG: 'vwvfg', GVG: 'gvg', GewSchG: 'gewschg', SGG: 'sgg',
  StVG: 'stvg',
  // WEG colloquial, WoEigG official — both used. Both route to same file.
  WEG: 'woeigg',
  WoEigG: 'woeigg',
}

const lawCache = new Map<string, string>()

/**
 * Laws werden NICHT mit Vercel deployed (5.936 Files = zu viele kleine
 * Uploads), sondern direkt von der GitHub-Pages-URL geladen, wo sie
 * bereits liegen. Vorteil: Single-Source-Truth, Cache-Header von GH
 * Pages, kein doppeltes Hosting.
 */
const LAW_BASE_URL = (() => {
  // In dev/GH-Pages selbst: relative URL funktioniert
  if (typeof window !== 'undefined' && window.location.hostname.includes('mikelninh.github.io')) {
    return './laws'
  }
  // Auf Vercel/Custom-Domain: absolute URL zu GH Pages
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return './laws'  // Vite dev serves laws from public/
  }
  return 'https://mikelninh.github.io/gitlaw/laws'
})()

async function loadLaw(lawId: string): Promise<string | null> {
  if (lawCache.has(lawId)) return lawCache.get(lawId)!
  try {
    const resp = await fetch(`${LAW_BASE_URL}/${lawId}.md`)
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
