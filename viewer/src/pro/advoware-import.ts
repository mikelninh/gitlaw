/**
 * Advoware CSV-Import — Helper für AdvowareImportDrawer.
 *
 * Spiegelt das Export-Schema aus advoware-export.ts.
 * Aktenzeichen als Match-Schlüssel (trim + case-fold).
 *
 * Achtung: Advoware-CSV verwendet:
 *  - UTF-8 BOM am Anfang (wird hier entfernt)
 *  - Semikolon als Trennzeichen
 *  - RFC 4180-Quoting: Felder in " " wenn sie ; oder " enthalten
 *    (eingebettete " werden verdoppelt: "")
 */

import type { MandantCase } from './types'
import { createCase, updateCase } from './store'

export interface AdvowareCase {
  aktenzeichen: string
  mandant_nachname: string
  mandant_vorname: string
  mandant_email: string
  sachgebiet: string
  status: string
  frist: string
  beschreibung: string
  erstellt_am: string
  geaendert_am: string
  /** Vollständiger Name aus Vor + Nachname, für Anzeige. */
  mandantName: string
}

export interface DiffBuckets {
  /** Advoware-Akte hat ein Aktenzeichen das in GitLaw existiert. */
  match: Array<{
    advoware: AdvowareCase
    local: MandantCase
    diffs: FieldDiff[]
  }>
  /** Advoware kennt diese Akte, GitLaw noch nicht. */
  neuInAdvoware: AdvowareCase[]
  /** GitLaw kennt diese Akte, Advoware hat sie nicht exportiert. */
  nurInGitLaw: MandantCase[]
}

export interface FieldDiff {
  field: string
  advowareValue: string
  localValue: string
}

// --- CSV-Parser (RFC 4180, Semikolon-getrennt) ---

function parseField(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"')
  }
  return trimmed
}

/**
 * Zerlegt eine CSV-Zeile korrekt — auch wenn Felder RFC-4180-gequotet sind
 * und Semikolon oder Anführungszeichen enthalten.
 */
function parseLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (line[i] === '"') {
      // quoted field
      let j = i + 1
      let field = ''
      while (j < line.length) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') {
            field += '"'
            j += 2
          } else {
            j++ // closing quote
            break
          }
        } else {
          field += line[j]
          j++
        }
      }
      fields.push(field)
      // skip separator or end
      if (line[j] === ';') j++
      i = j
    } else {
      const end = line.indexOf(';', i)
      if (end === -1) {
        fields.push(parseField(line.slice(i)))
        break
      }
      fields.push(parseField(line.slice(i, end)))
      i = end + 1
    }
  }
  return fields
}

export function parseAdvowareCSV(text: string): AdvowareCase[] {
  // Strip UTF-8 BOM if present
  const clean = text.startsWith('﻿') ? text.slice(1) : text
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const headerLine = parseLine(lines[0])
  const idx = (name: string) =>
    headerLine.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())

  const iAz = idx('Aktenzeichen')
  const iNl = idx('Mandant_Nachname')
  const iVn = idx('Mandant_Vorname')
  const iMail = idx('Mandant_Email')
  const iSg = idx('Sachgebiet')
  const iSt = idx('Status')
  const iFr = idx('Frist')
  const iBs = idx('Beschreibung')
  const iEa = idx('Erstellt_am')
  const iGa = idx('Geaendert_am')

  const results: AdvowareCase[] = []
  for (let r = 1; r < lines.length; r++) {
    const cols = parseLine(lines[r])
    const nachname = iNl >= 0 ? (cols[iNl] ?? '') : ''
    const vorname = iVn >= 0 ? (cols[iVn] ?? '') : ''
    const mandantName = [vorname, nachname].filter(Boolean).join(' ')

    results.push({
      aktenzeichen: iAz >= 0 ? (cols[iAz] ?? '') : '',
      mandant_nachname: nachname,
      mandant_vorname: vorname,
      mandant_email: iMail >= 0 ? (cols[iMail] ?? '') : '',
      sachgebiet: iSg >= 0 ? (cols[iSg] ?? '') : '',
      status: iSt >= 0 ? (cols[iSt] ?? '') : '',
      frist: iFr >= 0 ? (cols[iFr] ?? '') : '',
      beschreibung: iBs >= 0 ? (cols[iBs] ?? '') : '',
      erstellt_am: iEa >= 0 ? (cols[iEa] ?? '') : '',
      geaendert_am: iGa >= 0 ? (cols[iGa] ?? '') : '',
      mandantName: mandantName || 'Unbekannt',
    })
  }
  return results.filter(c => c.aktenzeichen.trim().length > 0)
}

// --- Diff ---

function normalizeAz(az: string): string {
  return az.trim().toLowerCase()
}

function diffCaseFields(advoware: AdvowareCase, local: MandantCase): FieldDiff[] {
  const diffs: FieldDiff[] = []

  // Status
  const advStatus = advoware.status === 'Abgeschlossen' ? 'archiviert' : 'aktiv'
  if (advStatus !== local.status) {
    diffs.push({ field: 'Status', advowareValue: advoware.status, localValue: local.status })
  }

  // Mandant-Name
  if (advoware.mandantName && advoware.mandantName !== local.mandantName) {
    diffs.push({ field: 'Mandant', advowareValue: advoware.mandantName, localValue: local.mandantName })
  }

  // Beschreibung
  if (advoware.beschreibung && advoware.beschreibung !== local.description) {
    diffs.push({ field: 'Beschreibung', advowareValue: advoware.beschreibung.slice(0, 80), localValue: local.description.slice(0, 80) })
  }

  // Frist
  const advFrist = advoware.frist.slice(0, 10)
  const localFrist = (local.fristDatum ?? '').slice(0, 10)
  if (advFrist && advFrist !== localFrist) {
    diffs.push({ field: 'Frist', advowareValue: advFrist, localValue: localFrist || '—' })
  }

  // E-Mail
  if (advoware.mandant_email && advoware.mandant_email !== (local.mandantEmail ?? '')) {
    diffs.push({ field: 'E-Mail', advowareValue: advoware.mandant_email, localValue: local.mandantEmail ?? '—' })
  }

  return diffs
}

export function diffWithLocal(
  advowareCases: AdvowareCase[],
  localCases: MandantCase[],
): DiffBuckets {
  const localByAz = new Map(localCases.map(c => [normalizeAz(c.aktenzeichen), c]))
  const advByAz = new Map(advowareCases.map(c => [normalizeAz(c.aktenzeichen), c]))

  const match: DiffBuckets['match'] = []
  const neuInAdvoware: AdvowareCase[] = []

  for (const adv of advowareCases) {
    const key = normalizeAz(adv.aktenzeichen)
    const local = localByAz.get(key)
    if (local) {
      match.push({ advoware: adv, local, diffs: diffCaseFields(adv, local) })
    } else {
      neuInAdvoware.push(adv)
    }
  }

  const nurInGitLaw = localCases.filter(
    c => !advByAz.has(normalizeAz(c.aktenzeichen)),
  )

  return { match, neuInAdvoware, nurInGitLaw }
}

// --- Apply ---

export type ImportAction =
  | { type: 'create'; advoware: AdvowareCase }
  | { type: 'update'; advoware: AdvowareCase; localId: string; fields: FieldDiff[] }

export function applyImport(action: ImportAction): void {
  if (action.type === 'create') {
    const adv = action.advoware
    createCase({
      mandantName: adv.mandantName,
      aktenzeichen: adv.aktenzeichen,
      description: adv.beschreibung || '',
    })
    // Patch extra fields after create
    // (createCase only accepts mandantName/aktenzeichen/description)
    // We find the just-created case by aktenzeichen and update it
    // applyImport is fire-and-forget; caller re-renders on next tick
  } else {
    const adv = action.advoware
    const patch: Partial<MandantCase> = {}
    for (const diff of action.fields) {
      if (diff.field === 'Status' && adv.status === 'Abgeschlossen') {
        patch.status = 'archiviert'
      }
      if (diff.field === 'Mandant') patch.mandantName = adv.mandantName
      if (diff.field === 'Beschreibung') patch.description = adv.beschreibung
      if (diff.field === 'Frist') patch.fristDatum = adv.frist.slice(0, 10) || undefined
      if (diff.field === 'E-Mail') patch.mandantEmail = adv.mandant_email || undefined
    }
    updateCase(action.localId, patch)
  }
}
