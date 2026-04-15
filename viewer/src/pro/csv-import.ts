/**
 * CSV-Import für Mandanten-Stammdaten aus DATEV / RA-Micro / advoware / Excel.
 *
 * Strategie:
 *  1. Datei einlesen (UTF-8 mit BOM-Toleranz, fallback Windows-1252 für RA-Micro)
 *  2. RFC 4180-ish Parser (Komma oder Semikolon auto-detect — DE-Excel nutzt ;)
 *  3. Header-Erkennung via Heuristik: ähnliche Begriffe matching auf unsere Akten-Felder
 *  4. Liefert ParsedCsv für UI-Preview + interaktives Mapping
 *
 * Das tatsächliche Anlegen der Akten passiert nicht hier — diese Datei ist
 * nur Parsing + Mapping-Hilfe. Der Caller (ProImport.tsx) ruft am Ende
 * createCase() für jeden gemappten Datensatz.
 */

import type { MandantCase } from './types'

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  /** Vorschlag, welcher CSV-Header zu welchem unserer Felder passt. */
  suggestedMapping: Partial<Record<keyof MandantCsvRow, number>>
  delimiter: ',' | ';' | '\t'
}

/** Felder einer Mandant:innen-Akte, die wir aus der CSV mappen können. */
export interface MandantCsvRow {
  aktenzeichen: string
  mandantName: string
  description?: string
  mandantEmail?: string
  fristDatum?: string  // ISO YYYY-MM-DD
  fristBezeichnung?: string
}

/** Erkennt den Trenner durch Häufigkeitsvergleich auf den ersten 3 Zeilen. */
function detectDelimiter(text: string): ',' | ';' | '\t' {
  const sample = text.split(/\r?\n/, 3).join('\n')
  const counts = {
    ',': (sample.match(/,/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
  }
  let best: ',' | ';' | '\t' = ';'  // Default DE: Semikolon (Excel-Standard)
  let bestCount = -1
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) { best = d as ',' | ';' | '\t'; bestCount = c }
  }
  return best
}

/** RFC 4180-ish CSV parser. Handles quoted fields with embedded delimiter/newlines. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++
      } else { field += c; i++ }
    } else {
      if (c === '"') { inQuotes = true; i++ }
      else if (c === delimiter) { row.push(field); field = ''; i++ }
      else if (c === '\r') { i++ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++ }
      else { field += c; i++ }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  // Filter komplett leere Zeilen
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

/**
 * Heuristisches Header-Mapping auf unsere MandantCsvRow-Felder.
 *
 * Berücksichtigt deutsche Headers von DATEV, RA-Micro, advoware, AnNoText
 * sowie englische Excel-Exporte.
 */
const HEADER_PATTERNS: Record<keyof MandantCsvRow, RegExp[]> = {
  aktenzeichen: [
    /^a(kten)?z(eichen)?\.?$/i,
    /^aktennr\.?$/i,
    /^az\.?$/i,
    /^matter[\s_]?id$/i,
    /^reference$/i,
    /^vorgangs?nr\.?$/i,
    /^akten-?nr\.?$/i,
  ],
  mandantName: [
    /^mandant(in)?$/i,
    /^mandant(en)?[\s_]?name$/i,
    /^name$/i,
    /^client$/i,
    /^kunde$/i,
    /^vertragspartner$/i,
    /^bezeichnung$/i,
  ],
  description: [
    /^sache$/i,
    /^streitgegenstand$/i,
    /^description$/i,
    /^vorgang$/i,
    /^betreff$/i,
    /^bemerkungen?$/i,
    /^notiz(en)?$/i,
    /^matter$/i,
  ],
  mandantEmail: [
    /^e?[\s_-]?mail(adresse)?$/i,
    /^email$/i,
    /^e-mail$/i,
    /^kontakt[\s_]?email$/i,
  ],
  fristDatum: [
    /^frist(datum)?$/i,
    /^termin$/i,
    /^deadline$/i,
    /^fristablauf$/i,
    /^wiedervorlage$/i,
    /^next[\s_]?action$/i,
    /^due[\s_]?date$/i,
  ],
  fristBezeichnung: [
    /^frist[\s_]?(typ|art|grund|bezeichnung)$/i,
    /^terminart$/i,
    /^deadline[\s_]?type$/i,
    /^anlass$/i,
  ],
}

function suggestMapping(headers: string[]): Partial<Record<keyof MandantCsvRow, number>> {
  const result: Partial<Record<keyof MandantCsvRow, number>> = {}
  const usedIdx = new Set<number>()
  for (const [field, patterns] of Object.entries(HEADER_PATTERNS) as Array<[keyof MandantCsvRow, RegExp[]]>) {
    for (let i = 0; i < headers.length; i++) {
      if (usedIdx.has(i)) continue
      const h = headers[i].trim()
      if (patterns.some(p => p.test(h))) {
        result[field] = i
        usedIdx.add(i)
        break
      }
    }
  }
  return result
}

/** Hauptfunktion — wird aus ProImport.tsx aufgerufen. */
export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const buf = await file.arrayBuffer()
  // BOM strippen, UTF-8 + Win-1252-Fallback
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    // Wahrscheinlich Windows-1252 (Excel ohne BOM-Save)
    text = new TextDecoder('windows-1252').decode(buf)
  }
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const delimiter = detectDelimiter(text)
  const rows = parseCsv(text, delimiter)
  if (rows.length === 0) {
    return { headers: [], rows: [], suggestedMapping: {}, delimiter }
  }
  const headers = rows[0].map(h => h.trim())
  const dataRows = rows.slice(1)
  return {
    headers,
    rows: dataRows,
    suggestedMapping: suggestMapping(headers),
    delimiter,
  }
}

/**
 * Konvertiert eine CSV-Row (string-array) + Spalten-Mapping in einen
 * MandantCsvRow für createCase. Wirft, wenn aktenzeichen/mandantName fehlen.
 */
export function rowToMandantData(
  row: string[],
  mapping: Partial<Record<keyof MandantCsvRow, number>>,
): MandantCsvRow {
  const get = (field: keyof MandantCsvRow): string => {
    const idx = mapping[field]
    if (idx === undefined) return ''
    return (row[idx] || '').trim()
  }
  const aktenzeichen = get('aktenzeichen')
  const mandantName = get('mandantName')
  if (!aktenzeichen) throw new Error('Aktenzeichen-Spalte nicht zugeordnet oder leer')
  if (!mandantName) throw new Error('Mandant:innen-Name-Spalte nicht zugeordnet oder leer')
  // Frist-Datum: versuche TT.MM.JJJJ → ISO; sonst durchreichen
  let fristDatum = get('fristDatum')
  if (fristDatum) {
    const m = fristDatum.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
    if (m) {
      const [, d, mo, y] = m
      const year = y.length === 2 ? '20' + y : y
      fristDatum = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return {
    aktenzeichen,
    mandantName,
    description: get('description') || undefined,
    mandantEmail: get('mandantEmail') || undefined,
    fristDatum: fristDatum || undefined,
    fristBezeichnung: get('fristBezeichnung') || undefined,
  }
}

export type { MandantCase }
