import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface ResolvedLegalAuthority {
  citation: string
  lawName: string
  abbreviation: string
  marker: '§' | 'Art'
  number: string
  paragraphHeading: string
  paragraphText: string
  lawStand: string
  lawFile: string
  sourceUri: string
  sourceUrl: string
  corpusSha256: string
  paragraphSha256: string
}

const ROMAN_TO_ARABIC: Record<string, string> = {
  I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6',
  VII: '7', VIII: '8', IX: '9', X: '10', XI: '11', XII: '12',
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function lawsDir(): string {
  return process.env.GITLAW_LAWS_DIR || path.join(process.cwd(), 'laws')
}

function normalizeAbbreviation(value: string): string {
  const parts = value.trim().split(/\s+/)
  if (parts.length === 2 && ROMAN_TO_ARABIC[parts[1]]) return `${parts[0]} ${ROMAN_TO_ARABIC[parts[1]]}`
  return parts.join(' ')
}

export function parseLegalCitation(input: string): { marker: '§' | 'Art'; number: string; abbreviation: string } | null {
  const match = input.trim().match(/^(§|Art\.?)\s*(\d+[a-z]?)(?:\s+(?:Abs\.?\s*\d+|[IVX]+|S\.?\s*\d+|\(\d+\)))*\s+([A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü\-]{1,30}(?:\s+(?:\d{1,4}|[IVX]{1,4}))?)$/i)
  if (!match) return null
  const marker = match[1].startsWith('§') ? '§' : 'Art'
  return { marker, number: match[2], abbreviation: normalizeAbbreviation(match[3]) }
}

function readLawHeader(content: string): { name: string; abbreviation: string; stand: string } {
  const first = content.split('\n').slice(0, 40)
  const name = first.find((line) => line.startsWith('# '))?.slice(2).trim() ?? ''
  const abbreviation = first.find((line) => line.startsWith('**Abkürzung:**'))?.replace('**Abkürzung:**', '').trim() ?? ''
  const stand = first.find((line) => line.startsWith('**Stand:**'))?.replace('**Stand:**', '').trim() ?? ''
  return { name, abbreviation, stand }
}

function findLawFile(abbreviation: string): string | null {
  const dir = lawsDir()
  if (!fs.existsSync(dir)) return null
  const target = abbreviation.toUpperCase()
  const exact: Array<{ file: string; headerAbbr: string }> = []
  const prefixed: Array<{ file: string; headerAbbr: string }> = []
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue
    const full = path.join(dir, file)
    let head = ''
    try {
      head = fs.readFileSync(full, 'utf8').split('\n').slice(0, 40).join('\n')
    } catch {
      continue
    }
    const headerAbbr = readLawHeader(head).abbreviation
    if (!headerAbbr) continue
    const upper = headerAbbr.toUpperCase()
    if (upper === target) exact.push({ file: full, headerAbbr })
    else if (upper.startsWith(`${target} `)) prefixed.push({ file: full, headerAbbr })
  }
  if (exact.length > 0) return exact.sort((a, b) => a.file.length - b.file.length)[0].file
  if (prefixed.length === 1) return prefixed[0].file
  if (prefixed.length > 1) return prefixed.sort((a, b) => a.headerAbbr.localeCompare(b.headerAbbr)).at(-1)?.file ?? null
  return null
}

function extractParagraph(content: string, marker: '§' | 'Art', number: string): { heading: string; text: string } | null {
  const lines = content.split('\n')
  const prefix = marker === '§' ? `### § ${number}` : `### Art ${number}`
  let heading = ''
  const body: string[] = []
  let found = false
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (found) break
      const trimmed = line.trimEnd()
      if (trimmed === prefix || trimmed.startsWith(`${prefix} `) || trimmed.startsWith(`${prefix}—`)) {
        heading = trimmed.slice(4).trim()
        found = true
      }
      continue
    }
    if (found) body.push(line)
  }
  if (!found || !heading) return null
  return { heading, text: body.join('\n').trim() }
}

function officialSourceUrl(filePath: string): string {
  const slug = path.basename(filePath, '.md').toLowerCase()
  return `https://www.gesetze-im-internet.de/${encodeURIComponent(slug)}/`
}

export function resolveLegalAuthority(citationInput: string): ResolvedLegalAuthority {
  const parsed = parseLegalCitation(citationInput)
  if (!parsed) throw new Error('legal_citation_invalid')
  const lawFile = findLawFile(parsed.abbreviation)
  if (!lawFile) throw new Error('legal_authority_not_found')
  const content = fs.readFileSync(lawFile, 'utf8')
  const header = readLawHeader(content)
  if (!header.name || !header.abbreviation || !header.stand) throw new Error('legal_authority_metadata_incomplete')
  const paragraph = extractParagraph(content, parsed.marker, parsed.number)
  if (!paragraph || !paragraph.text) throw new Error('legal_paragraph_not_found')
  const relative = path.relative(process.cwd(), lawFile).replaceAll(path.sep, '/')
  return {
    citation: `${parsed.marker} ${parsed.number} ${header.abbreviation}`,
    lawName: header.name,
    abbreviation: header.abbreviation,
    marker: parsed.marker,
    number: parsed.number,
    paragraphHeading: paragraph.heading,
    paragraphText: paragraph.text,
    lawStand: header.stand,
    lawFile: relative,
    sourceUri: `gitlaw://corpus/${relative}#${encodeURIComponent(paragraph.heading)}`,
    sourceUrl: officialSourceUrl(lawFile),
    corpusSha256: sha256(content),
    paragraphSha256: sha256(paragraph.text),
  }
}
