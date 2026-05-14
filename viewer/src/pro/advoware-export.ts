/**
 * Advoware CSV-Export für Mandanten-Stammdaten.
 *
 * Schema-Best-Guess basierend auf typischen Advoware-Konventionen (STP-Dokumentation).
 * Mit Bao + STP final validieren, bevor das produktiv eingesetzt wird.
 * Phase 2 ersetzt diesen CSV-Export durch direkte Advoware REST-API-Anbindung.
 *
 * Technische Details:
 *  - UTF-8 BOM (0xEF 0xBB 0xBF) für korrekte Darstellung in Excel-DE
 *  - Trennzeichen: Semikolon (DE-Excel-Standard)
 *  - Felder mit Sonderzeichen oder Semikolon werden in doppelte Anführungszeichen gesetzt
 *  - Zeilenumbrüche innerhalb von Feldern werden als Leerzeichen normalisiert
 */

import type { MandantCase } from './types'

/** Advoware-Mandanten-Schema (Best-Guess — mit Bao + STP verifizieren). */
interface AdvowareRow {
  Aktenzeichen: string
  Mandant_Nachname: string
  Mandant_Vorname: string
  Mandant_Email: string
  Sachgebiet: string
  Status: string
  Frist: string
  Beschreibung: string
  Erstellt_am: string
  Geaendert_am: string
}

export const HEADERS: (keyof AdvowareRow)[] = [
  'Aktenzeichen',
  'Mandant_Nachname',
  'Mandant_Vorname',
  'Mandant_Email',
  'Sachgebiet',
  'Status',
  'Frist',
  'Beschreibung',
  'Erstellt_am',
  'Geaendert_am',
]

/**
 * Gibt den Wert in Anführungszeichen zurück, wenn er Semikolons, Anführungszeichen
 * oder Zeilenumbrüche enthält. Interne Anführungszeichen werden gedoppelt (RFC 4180).
 */
function quoteField(value: string): string {
  const normalized = value.replace(/[\r\n]+/g, ' ')
  if (normalized.includes(';') || normalized.includes('"') || normalized.includes('\n')) {
    return '"' + normalized.replace(/"/g, '""') + '"'
  }
  return normalized
}

/** Formatiert ein ISO-Datum (oder ISO-Datetime) auf YYYY-MM-DD für Advoware. */
function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/**
 * Splittet einen vollständigen Namen auf Vor- und Nachname.
 * Best-Guess: letztes Wort = Nachname, alles davor = Vorname.
 * Für vietnamesische Namen mit Bao abstimmen — ggf. separate Felder im IntakeForm.
 */
function splitName(fullName: string): { vorname: string; nachname: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { vorname: '', nachname: parts[0] }
  const nachname = parts[parts.length - 1]
  const vorname = parts.slice(0, -1).join(' ')
  return { vorname, nachname }
}

/**
 * Gibt das interne Sachgebiet (caseStatus) auf einen Advoware-kompatiblen
 * Begriff zurück. Mapping mit Bao verifizieren.
 */
function mapSachgebiet(c: MandantCase): string {
  if (c.mandatsartId) return c.mandatsartId
  return 'Allgemein'
}

function mapStatus(c: MandantCase): string {
  if (c.status === 'archiviert') return 'Abgeschlossen'
  if (c.caseStatus) return c.caseStatus
  return 'Aktiv'
}

function caseToRow(c: MandantCase): AdvowareRow {
  const { vorname, nachname } = splitName(c.mandantName)
  return {
    Aktenzeichen: c.aktenzeichen,
    Mandant_Nachname: nachname,
    Mandant_Vorname: vorname,
    Mandant_Email: c.mandantEmail ?? '',
    Sachgebiet: mapSachgebiet(c),
    Status: mapStatus(c),
    Frist: formatDate(c.fristDatum),
    Beschreibung: c.description,
    Erstellt_am: formatDate(c.createdAt),
    Geaendert_am: formatDate(c.updatedAt),
  }
}

/**
 * Generiert einen CSV-String im Advoware-Mandanten-Schema.
 *
 * Beginnt mit UTF-8 BOM für Excel-DE-Kompatibilität.
 * Trennzeichen: Semikolon.
 */
export function exportCasesToAdvowareCSV(cases: MandantCase[]): string {
  const UTF8_BOM = '﻿'

  const headerLine = HEADERS.join(';')

  const dataLines = cases.map((c) => {
    const row = caseToRow(c)
    return HEADERS.map((h) => quoteField(row[h])).join(';')
  })

  return UTF8_BOM + [headerLine, ...dataLines].join('\r\n')
}
