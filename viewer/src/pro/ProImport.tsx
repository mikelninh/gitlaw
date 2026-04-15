/**
 * CSV-Import-Page — bringt Mandanten-Stammdaten aus DATEV / RA-Micro /
 * advoware / Excel in einem Rutsch in GitLaw Pro.
 *
 * Flow:
 *   1. Datei wählen → parseCsvFile() liefert headers + rows + suggested mapping
 *   2. UI zeigt Preview-Tabelle mit Spalten-Dropdowns (auto-vorausgewählt)
 *   3. User korrigiert Mapping wo nötig
 *   4. Klick "X Akten importieren" → loop createCase + updateCase
 *
 * Das ist der #1 gewünschte Feature aus der 100-Anwält:innen-Simulation
 * (89/100 Liebes-Quote): „endlich keine doppelte Pflege mehr".
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { createCase, updateCase } from './store'
import { parseCsvFile, rowToMandantData, type MandantCsvRow, type ParsedCsv } from './csv-import'

const FIELD_LABELS: Record<keyof MandantCsvRow, string> = {
  aktenzeichen: 'Aktenzeichen *',
  mandantName: 'Mandant:in *',
  description: 'Sache (optional)',
  mandantEmail: 'E-Mail (optional)',
  fristDatum: 'Frist-Datum (optional)',
  fristBezeichnung: 'Frist-Bezeichnung (optional)',
}

const FIELD_KEYS = Object.keys(FIELD_LABELS) as (keyof MandantCsvRow)[]

export default function ProImport() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<keyof MandantCsvRow, number>>>({})
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ ok: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setDone(null)
    try {
      const result = await parseCsvFile(file)
      setParsed(result)
      setMapping(result.suggestedMapping)
    } catch (err) {
      setError('CSV konnte nicht gelesen werden: ' + (err instanceof Error ? err.message : 'unbekannt'))
    }
  }

  function setCol(field: keyof MandantCsvRow, idx: string) {
    const next = { ...mapping }
    if (idx === '') delete next[field]
    else next[field] = parseInt(idx, 10)
    setMapping(next)
  }

  async function doImport() {
    if (!parsed) return
    setImporting(true)
    const errors: string[] = []
    let ok = 0
    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const data = rowToMandantData(parsed.rows[i], mapping)
        const c = createCase({
          aktenzeichen: data.aktenzeichen,
          mandantName: data.mandantName,
          description: data.description || '',
        })
        if (data.mandantEmail || data.fristDatum) {
          updateCase(c.id, {
            mandantEmail: data.mandantEmail,
            fristDatum: data.fristDatum,
            fristBezeichnung: data.fristBezeichnung,
          })
        }
        ok++
      } catch (err) {
        errors.push(`Zeile ${i + 2}: ${err instanceof Error ? err.message : 'unbekannt'}`)
      }
    }
    setImporting(false)
    setDone({ ok, failed: errors.length, errors: errors.slice(0, 10) })
  }

  function reset() {
    setParsed(null)
    setMapping({})
    setDone(null)
    setError(null)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="h-page">Akten-Import (CSV)</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Importiere Mandanten-Stammdaten aus DATEV Anwalt, RA-Micro, advoware oder Excel.
          Wir erkennen die Spalten automatisch, du kontrollierst einmal — danach landen
          alle Akten in deiner Übersicht.
        </p>
      </header>

      {!parsed && !done && (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
          <FileSpreadsheet className="w-10 h-10 text-[var(--color-gold)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-ink-soft)] mb-4">
            CSV-Datei auswählen (UTF-8 oder Windows-1252; Komma oder Semikolon)
          </p>
          <label className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 cursor-pointer hover:opacity-90">
            <Upload className="w-4 h-4" /> CSV wählen
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>
          {error && <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] text-left max-w-md mx-auto">
            <p className="font-semibold mb-1">Wo finde ich die CSV in meiner Software?</p>
            <ul className="space-y-0.5">
              <li>• <strong>DATEV Anwalt classic:</strong> Mandanten → Liste → Export → CSV</li>
              <li>• <strong>RA-Micro:</strong> Adressliste → Datei → Exportieren → CSV</li>
              <li>• <strong>advoware:</strong> Adressdaten → Aktion → CSV-Export</li>
              <li>• <strong>Excel:</strong> Datei → Speichern unter → CSV (UTF-8)</li>
            </ul>
          </div>
        </div>
      )}

      {parsed && !done && (
        <>
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Spalten zuordnen</h2>
              <button
                onClick={reset}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Andere Datei
              </button>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {parsed.rows.length} Datensätze · Trenner „{parsed.delimiter === '\t' ? 'TAB' : parsed.delimiter}" ·
              {' '}{Object.keys(mapping).length} von {FIELD_KEYS.length} Spalten erkannt
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FIELD_KEYS.map(field => (
                <label key={field} className="text-xs">
                  <span className="block font-medium mb-1 text-[var(--color-ink-soft)]">{FIELD_LABELS[field]}</span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={e => setCol(field, e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">— nicht zuordnen —</option>
                    {parsed.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `(Spalte ${i + 1})`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)] text-sm font-semibold flex items-baseline justify-between">
              <span>Vorschau (erste 5 Zeilen)</span>
              <span className="text-xs text-[var(--color-ink-muted)] font-normal">
                so werden die Akten angelegt
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--color-bg-alt)]">
                  <tr>
                    {FIELD_KEYS.map(f => (
                      <th key={f} className="text-left px-3 py-2 font-medium">{FIELD_LABELS[f]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => {
                    let preview: MandantCsvRow | null = null
                    let err: string | null = null
                    try { preview = rowToMandantData(row, mapping) } catch (e) { err = e instanceof Error ? e.message : 'Fehler' }
                    return (
                      <tr key={i} className="border-t border-[var(--color-border)]">
                        {err ? (
                          <td colSpan={FIELD_KEYS.length} className="px-3 py-2 text-[var(--color-danger)] italic">
                            ⚠ {err}
                          </td>
                        ) : (
                          FIELD_KEYS.map(f => (
                            <td key={f} className="px-3 py-2 text-[var(--color-ink-soft)]">
                              {preview?.[f] || <span className="text-[var(--color-ink-muted)]">—</span>}
                            </td>
                          ))
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={doImport}
              disabled={importing || !mapping.aktenzeichen || mapping.aktenzeichen === undefined || mapping.mandantName === undefined}
              className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              {importing ? `Importiere ${parsed.rows.length} Akten…` : `${parsed.rows.length} Akten importieren`}
            </button>
            {(mapping.aktenzeichen === undefined || mapping.mandantName === undefined) && (
              <span className="text-xs text-[var(--color-ink-muted)]">
                Aktenzeichen und Mandant:in müssen zugeordnet sein
              </span>
            )}
          </div>
        </>
      )}

      {done && (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{done.ok} Akten importiert</h2>
              {done.failed > 0 && (
                <p className="text-sm text-[var(--color-danger)]">
                  {done.failed} Datensätze übersprungen (siehe unten)
                </p>
              )}
            </div>
          </div>
          {done.errors.length > 0 && (
            <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-lg p-3 text-xs text-[var(--color-ink-soft)]">
              <p className="font-semibold mb-2 text-[var(--color-danger)] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Übersprungene Zeilen:
              </p>
              <ul className="space-y-0.5 font-mono">
                {done.errors.map((e, i) => <li key={i}>• {e}</li>)}
                {done.failed > done.errors.length && (
                  <li className="italic">…und {done.failed - done.errors.length} weitere</li>
                )}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/akten"
              className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 text-sm hover:opacity-90"
            >
              Zur Akten-Liste
            </Link>
            <button
              onClick={reset}
              className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Nochmal importieren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
