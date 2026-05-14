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
    return {
      display,
      lawId: '',
      section: c.paragraph,
      verified: false,
      verificationReason: 'law_not_found',
      verificationHint: `Abkürzung "${abbr}" ist im Korpus nicht bekannt. Möglicherweise Schreibfehler oder Gesetz aus anderer Jurisdiktion.`,
    }
  }

  const text = await loadLaw(lawId)
  if (!text) {
    return {
      display,
      lawId,
      section: c.paragraph,
      verified: false,
      verificationReason: 'law_not_found',
      verificationHint: `Datei "laws/${lawId}.md" konnte nicht geladen werden — temporärer Netzwerk-Fehler oder Ressource fehlt.`,
    }
  }

  // Detect explicit "weggefallen" markers covering this paragraph BEFORE
  // checking the heading — covers the StGB §-aufgehoben and NetzDG-style
  // collective markers (e.g. `### (XXXX) §§ 2 bis 3f — (weggefallen)`).
  const repealed = isRepealed(text, c.paragraph)
  if (repealed) {
    return {
      display,
      lawId,
      section: c.paragraph,
      verified: false,
      verificationReason: 'repealed',
      verificationHint: 'Dieser Paragraph wurde aufgehoben (weggefallen) und ist nicht mehr in Kraft. Bitte Folge-Vorschrift recherchieren.',
    }
  }

  // Find `### § 573` but not `### § 5` when we're looking for 573.
  const headingRe = new RegExp(`^###\\s+§\\s+${escapeRegex(c.paragraph)}(?![\\dA-Za-z])`, 'm')
  const m = headingRe.exec(text)
  if (!m) {
    return {
      display,
      lawId,
      section: c.paragraph,
      verified: false,
      verificationReason: 'paragraph_not_found',
      verificationHint: `${abbr} existiert, aber § ${c.paragraph} wurde im Korpus nicht gefunden. Möglich: falsch zitiert, umbenannt, oder neue Vorschrift, die noch nicht im Korpus ist.`,
    }
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

/**
 * Detects whether the cited paragraph is covered by a "(weggefallen)" marker.
 * Two patterns to handle:
 *   1. Single-paragraph: `### § 5a — (weggefallen)`
 *   2. Range collective: `### (XXXX) §§ 2 bis 3f — (weggefallen)`
 *      → repeals all paragraphs from N to M (with optional letter suffix)
 */
function isRepealed(text: string, paragraph: string): boolean {
  // Pattern 1 — exact match
  const single = new RegExp(
    `^###\\s+§\\s+${escapeRegex(paragraph)}(?![\\dA-Za-z])[^\\n]*\\(weggefallen\\)`,
    'm',
  )
  if (single.test(text)) return true

  // Pattern 2 — range markers like "§§ 2 bis 3f"
  const num = parseFloat(paragraph)
  if (Number.isNaN(num)) return false
  const rangeRe = /^###[^\n]*§§\s*(\d+[a-z]?)\s*bis\s*(\d+[a-z]?)[^\n]*\(weggefallen\)/gm
  let m: RegExpExecArray | null
  while ((m = rangeRe.exec(text)) !== null) {
    const lo = parseFloat(m[1])
    const hi = parseFloat(m[2])
    if (!Number.isNaN(lo) && !Number.isNaN(hi) && num >= lo && num <= hi) return true
  }
  return false
}

export async function verifyAllCitations(citations: ProCitation[]): Promise<Citation[]> {
  return Promise.all(citations.map(verifyCitation))
}

// ---------------------------------------------------------------------------
// Draft-text verification
// ---------------------------------------------------------------------------

export interface DraftCitationVerified {
  display: string
  lawId: string
  section: string
}

export interface DraftCitationUnverified {
  display: string
  reason: string
}

export interface DraftVerification {
  verified: DraftCitationVerified[]
  unverified: DraftCitationUnverified[]
  total: number
}

/**
 * Extracts §-citations from free draft text and verifies each against the
 * local law corpus.
 *
 * Handles:
 *   "§ 263 StGB"          → {paragraph: "263", gesetz: "StGB"}
 *   "§ 147 Abs. 1 StPO"   → {paragraph: "147", gesetz: "StPO"}
 *   "§ 81a AufenthG"      → {paragraph: "81a", gesetz: "AufenthG"}
 *   "§§ 263, 264 StGB"    → flagged as Sammelzitat (not expanded)
 *
 * Does NOT handle:
 *   "§§ 263, 264 StGB" — listed as unverified with reason "Sammelzitat"
 *   Cross-references like "(vgl. § 3 NetzDG)" — parsed normally
 *   Multi-law ranges like "§§ 3 bis 5 StGB" — flagged as Sammelzitat
 */
export async function verifyDraftCitations(text: string): Promise<DraftVerification> {
  // Sammelzitate ("§§") — detect and surface as unverified without expanding
  const sammelRe = /§§\s*[\d][\d,\sa-z–-]*/gi
  const sammelMatches: string[] = []
  for (const m of text.matchAll(sammelRe)) {
    sammelMatches.push(m[0].trim())
  }

  // Build a list of known law abbrevs, longest first so "SGB V" matches
  // before a possible bare "V" if we ever see that.
  const knownAbbrevs = Object.keys(LAW_ABBREV_MAP).sort((a, b) => b.length - a.length)
  const abbrevPattern = knownAbbrevs.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

  // Match:  § <num>[letter]  [any Abs./Nr./S./Satz etc. noise]  <KnownGesetz>
  // The noise group skips over modifiers like "Abs. 1 Nr. 2" that sit
  // between the paragraph number and the law abbreviation.
  const singleRe = new RegExp(
    `§\\s*(\\d+[a-z]?)(?:\\s+(?:Abs\\.?|Nr\\.?|Satz|S\\.?)\\s*\\d+(?:\\s+Nr\\.?\\s*\\d+)?)*\\s+(${abbrevPattern})`,
    'gi',
  )

  // Collect unique citations (dedupe by "paragraph|gesetz" key)
  const seen = new Map<string, ProCitation>()
  for (const m of text.matchAll(singleRe)) {
    const paragraph = m[1].toLowerCase().replace(/^0+/, '') || m[1]  // strip leading zeros
    const gesetz = normalizeAbbrev(m[2])
    const key = `${paragraph}|${gesetz}`
    if (!seen.has(key)) {
      seen.set(key, { paragraph: m[1], gesetz, bedeutung: '' })
    }
  }

  const citations = Array.from(seen.values())
  const results = await verifyAllCitations(citations)

  const verified: DraftCitationVerified[] = []
  const unverified: DraftCitationUnverified[] = []

  for (const c of results) {
    if (c.verified) {
      verified.push({ display: c.display, lawId: c.lawId, section: c.section })
    } else {
      unverified.push({
        display: c.display,
        reason: c.verificationHint ?? c.verificationReason ?? 'Unbekannter Fehler',
      })
    }
  }

  for (const s of sammelMatches) {
    unverified.push({
      display: s,
      reason: 'Sammelzitat — bitte jeden Paragraphen einzeln prüfen.',
    })
  }

  return { verified, unverified, total: verified.length + unverified.length }
}
