/**
 * Citation verification.
 *
 * The LLM cites paragraphs in answers ("§ 573 BGB", "§§ 185, 186 StGB").
 * Anwält:innen need to know which of those exist in real law texts vs.
 * are AI hallucinations. We:
 *   1. Parse citations from the answer text via regex
 *   2. Map abbreviation → law file id (e.g. BGB → bgb.md)
 *   3. Fetch the law markdown and look for `### § XXX` headings
 *   4. Return verified/unverified plus a short excerpt
 *
 * Cache fetched laws in-memory to avoid repeated network hits.
 */

import type { Citation } from './types'

const LAW_ABBREV_MAP: Record<string, string> = {
  GG: 'gg', StGB: 'stgb', BGB: 'bgb', StPO: 'stpo', ZPO: 'zpo',
  'SGB V': 'sgb_5', 'SGB VI': 'sgb_6', 'SGB II': 'sgb_2', 'SGB XII': 'sgb_12',
  'SGB IX': 'sgb_9', 'SGB IV': 'sgb_4', 'SGB X': 'sgb_10', 'SGB I': 'sgb_1',
  EStG: 'estg', AO: 'ao_1977', NetzDG: 'netzdg', TierSchG: 'tierschg',
  AufenthG: 'aufenthg_2004', ArbZG: 'arbzg', KSchG: 'kschg',
  MuSchG: 'muschg', AGG: 'agg', GEG: 'geg', BEEG: 'beeg',
  BImSchG: 'bimschg', UWG: 'uwg', HGB: 'hgb', AktG: 'aktg',
  BetrVG: 'betrvg', InsO: 'inso', VwGO: 'vwgo', GWB: 'gwb',
  VwVfG: 'vwvfg', GVG: 'gvg', GewSchG: 'gewschg', SGG: 'sgg',
  StVO: 'stvo', StVG: 'stvg', UStG: 'ustg',
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

/**
 * Extract paragraph citations from a German legal text.
 * Examples matched:
 *   - "§ 573 BGB"
 *   - "§§ 185, 186 StGB"
 *   - "§ 147 StPO"
 *   - "§ 32a Abs. 5 EStG"  → captures "32a"
 */
export function extractCitations(answer: string): { display: string; section: string; abbr: string }[] {
  const out: { display: string; section: string; abbr: string }[] = []
  const seen = new Set<string>()

  // Pattern: §§? section (Abs./etc) abbreviation
  // section example: 573, 32a, 263a
  // abbreviation: BGB, StGB, SGB V, etc.
  const re = /§§?\s*(\d+\w*)((?:\s*(?:Abs\.|Absatz|Nr\.|Nummer|Satz|Buchst\.)\s*\d+\w*)*)\s+((?:SGB\s+[IVX]+|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(answer)) !== null) {
    const section = m[1]
    const abbr = m[3].trim()
    const display = `§ ${section}${m[2] || ''} ${abbr}`.replace(/\s+/g, ' ').trim()
    const key = `${abbr}|${section}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ display, section, abbr })
  }

  // Also handle "§§ 185, 186 StGB" → multiple sections sharing one abbreviation
  const multiRe = /§§\s*(\d+\w*(?:\s*,\s*\d+\w*)+)\s+((?:SGB\s+[IVX]+|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]+))/g
  while ((m = multiRe.exec(answer)) !== null) {
    const sections = m[1].split(',').map(s => s.trim())
    const abbr = m[2].trim()
    for (const section of sections) {
      const key = `${abbr}|${section}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ display: `§ ${section} ${abbr}`, section, abbr })
    }
  }

  return out
}

/**
 * Verify a single parsed citation against the local law corpus.
 * If the abbreviation is unknown OR the law file cannot be fetched OR
 * the section heading is not present, returns verified=false.
 */
export async function verifyCitation(parsed: {
  display: string
  section: string
  abbr: string
}): Promise<Citation> {
  const lawId = LAW_ABBREV_MAP[parsed.abbr]
  if (!lawId) {
    return { ...parsed, lawId: '', verified: false }
  }
  const text = await loadLaw(lawId)
  if (!text) {
    return { ...parsed, lawId, verified: false }
  }

  // Look for `### § 573` (allowing trailing word boundary so "§ 5" doesn't
  // match "§ 573") — paragraph headings may include suffixes like "573a",
  // so we accept a word boundary OR digit-letter boundary.
  const headingRe = new RegExp(`^###\\s+§\\s+${escapeRegex(parsed.section)}(?![\\dA-Za-z])`, 'm')
  const match = headingRe.exec(text)
  if (!match) {
    return { ...parsed, lawId, verified: false }
  }

  // Grab a short excerpt: first 280 chars after the heading.
  const start = match.index + match[0].length
  const slice = text.slice(start, start + 600).trim()
  // Stop at next heading
  const next = slice.search(/^###\s+§/m)
  const excerpt = (next >= 0 ? slice.slice(0, next) : slice).trim().replace(/\s+/g, ' ')

  return {
    ...parsed,
    lawId,
    verified: true,
    excerpt: excerpt.slice(0, 280) + (excerpt.length > 280 ? '…' : ''),
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function verifyAllCitations(answer: string): Promise<Citation[]> {
  const parsed = extractCitations(answer)
  return Promise.all(parsed.map(verifyCitation))
}
