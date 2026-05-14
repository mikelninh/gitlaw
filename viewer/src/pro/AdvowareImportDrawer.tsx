/**
 * Drawer: Advoware CSV-Import (Option A — Pilot-Quick-Win).
 *
 * Bao klickt "Sync mit Advoware" → waehlt Advoware-CSV-Export → Smart-Match
 * per Aktenzeichen → sieht drei Buckets:
 *   1. Match — Diff pro Feld, Bao bestaetigt pro Akte was er uebernehmen will
 *   2. Neu in Advoware — Bao klickt "Importieren" pro Akte
 *   3. Nur in GitLaw — Info, keine Aktion noetig
 *
 * Nach Bestaetigung: applyImport + Audit-Log pro Akte.
 */

import { useRef, useState } from 'react'
import { Upload, X, Check, ChevronRight, AlertTriangle, RefreshCw, Info } from 'lucide-react'
import { parseAdvowareCSV, diffWithLocal, applyImport } from './advoware-import'
import type { DiffBuckets, AdvowareCase } from './advoware-import'
import { listCases, log } from './store'
import type { MandantCase } from './types'

interface Props {
  onClose: () => void
  onDone: () => void
}

type Step = 'upload' | 'review' | 'done'

export default function AdvowareImportDrawer({ onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffBuckets | null>(null)
  const [_filename, setFilename] = useState('')

  // Which "match" diffs the user wants to apply (index → set of field names)
  const [selectedFields, setSelectedFields] = useState<Map<number, Set<string>>>(new Map())
  // Which "neu in Advoware" cases to import (set of aktenzeichen)
  const [toImport, setToImport] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [summary, setSummary] = useState<{ imported: number; updated: number }>({ imported: 0, updated: 0 })

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Nur .csv-Dateien werden unterstuetzt.')
      return
    }
    setFilename(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const advowareCases = parseAdvowareCSV(text)
        if (advowareCases.length === 0) {
          setError('Keine Akten gefunden. Pruefe ob die Datei das Advoware-Export-Format hat (Semikolon-getrennt).')
          return
        }
        const localCases: MandantCase[] = listCases()
        const buckets = diffWithLocal(advowareCases, localCases)

        // Pre-select all diffs for convenience — Bao kann abwaehlen
        const fieldMap = new Map<number, Set<string>>()
        buckets.match.forEach(({ diffs }, i) => {
          if (diffs.length > 0) {
            fieldMap.set(i, new Set(diffs.map(d => d.field)))
          }
        })
        setSelectedFields(fieldMap)
        setToImport(new Set(buckets.neuInAdvoware.map(c => c.aktenzeichen)))
        setDiff(buckets)
        setStep('review')
      } catch {
        setError('Fehler beim Lesen der CSV. Datei beschaedigt?')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function toggleField(matchIdx: number, fieldName: string) {
    setSelectedFields(prev => {
      const next = new Map(prev)
      const set = new Set(next.get(matchIdx) ?? [])
      if (set.has(fieldName)) set.delete(fieldName)
      else set.add(fieldName)
      next.set(matchIdx, set)
      return next
    })
  }

  function toggleImport(az: string) {
    setToImport(prev => {
      const next = new Set(prev)
      if (next.has(az)) next.delete(az)
      else next.add(az)
      return next
    })
  }

  async function applyAll() {
    if (!diff) return
    setApplying(true)
    let imported = 0
    let updated = 0

    for (const [i, { advoware, local, diffs }] of diff.match.entries()) {
      const fields = selectedFields.get(i)
      if (!fields || fields.size === 0) continue
      const selectedDiffs = diffs.filter(d => fields.has(d.field))
      if (selectedDiffs.length === 0) continue
      applyImport({ type: 'update', advoware, localId: local.id, fields: selectedDiffs })
      log(
        'advoware.import',
        `Aktualisiert: ${advoware.aktenzeichen} — Felder: ${selectedDiffs.map(d => d.field).join(', ')}`,
        local.id,
      )
      updated++
    }

    for (const adv of diff.neuInAdvoware) {
      if (!toImport.has(adv.aktenzeichen)) continue
      applyImport({ type: 'create', advoware: adv })
      log('advoware.import', `Neu importiert: ${adv.aktenzeichen} — ${adv.mandantName}`)
      imported++
    }

    setSummary({ imported, updated })
    setApplying(false)
    setStep('done')
    onDone()
  }

  const totalChanges = (() => {
    if (!diff) return 0
    let n = 0
    diff.match.forEach(({ diffs }, i) => {
      const fields = selectedFields.get(i)
      if (fields && fields.size > 0) n += diffs.filter(d => fields.has(d.field)).length
    })
    n += diff.neuInAdvoware.filter(c => toImport.has(c.aktenzeichen)).length
    return n
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border border-[var(--color-border)] shadow-xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">Sync mit Advoware</h2>
            {step === 'upload' && (
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                Advoware-CSV importieren — Aktenzeichen als Match-Schluessel
              </p>
            )}
            {step === 'review' && diff && (
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                {diff.match.length} Treffer · {diff.neuInAdvoware.length} neu · {diff.nurInGitLaw.length} nur in GitLaw
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* Step: Upload */}
          {step === 'upload' && (
            <>
              <div
                className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-gold)] transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
              >
                <Upload className="w-8 h-8 text-[var(--color-ink-muted)]" />
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  CSV hier ablegen oder klicken
                </p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Advoware: Extras → Datenexport → Mandanten-Stammdaten als CSV
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-[var(--color-border)] rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Tipp: CSV aus GitLaw-Export als Test</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Noch kein Advoware-Export zur Hand? In den Akten oben rechts auf "Akten als CSV exportieren"
                  klicken — dieselbe Datei laesst sich hier wieder importieren.
                </p>
              </div>

              {/* Live-Sync Vision Banner */}
              <div className="border border-blue-200 bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Demnachst: Live-Sync via Companion-App</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Kleine App auf deinem Mac beobachtet den Advoware-Export-Ordner und synchronisiert
                    automatisch — ohne manuellen CSV-Upload. API-Vertrag mit STP laeuft.
                  </p>
                  <a
                    href="mailto:hallo.chupi@gmail.com?subject=Companion-App%20Interesse%20GitLaw%20Pro&body=Ich%20bin%20interessiert%20an%20der%20Companion-App%20fuer%20automatischen%20Advoware-Sync."
                    className="text-xs text-blue-600 underline mt-1.5 inline-block hover:text-blue-800"
                  >
                    Interesse melden
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Step: Review */}
          {step === 'review' && diff && (
            <>
              {/* Bucket 1: Match */}
              {diff.match.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Bekannte Akten ({diff.match.length})
                  </h3>
                  <div className="space-y-3">
                    {diff.match.map(({ advoware, diffs }, i) => (
                      <div key={advoware.aktenzeichen} className="border border-[var(--color-border)] rounded-xl p-4">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="font-medium text-sm text-[var(--color-ink)]">{advoware.aktenzeichen}</span>
                          <span className="text-xs text-[var(--color-ink-muted)]">{advoware.mandantName}</span>
                        </div>
                        {diffs.length === 0 ? (
                          <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 inline-block">
                            Kein Unterschied — alles aktuell
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {diffs.map(diff => {
                              const checked = selectedFields.get(i)?.has(diff.field) ?? false
                              return (
                                <label
                                  key={diff.field}
                                  className={`flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                    checked ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-transparent'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleField(i, diff.field)}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <span className="flex-1">
                                    <span className="font-medium text-[var(--color-ink)]">{diff.field}:</span>{' '}
                                    <span className="text-amber-800">Advoware: {diff.advowareValue}</span>
                                    {' · '}
                                    <span className="text-slate-500">GitLaw: {diff.localValue}</span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Bucket 2: Neu in Advoware */}
              {diff.neuInAdvoware.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                    Neu in Advoware ({diff.neuInAdvoware.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.neuInAdvoware.map((c: AdvowareCase) => {
                      const checked = toImport.has(c.aktenzeichen)
                      return (
                        <label
                          key={c.aktenzeichen}
                          className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 text-sm transition-colors ${
                            checked
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-[var(--color-border)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleImport(c.aktenzeichen)}
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-[var(--color-ink)]">{c.aktenzeichen}</span>
                            <span className="text-[var(--color-ink-muted)] ml-2">{c.mandantName}</span>
                            {c.beschreibung && (
                              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 truncate">{c.beschreibung}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Bucket 3: Nur in GitLaw */}
              {diff.nurInGitLaw.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-[var(--color-ink-muted)] mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Nur in GitLaw ({diff.nurInGitLaw.length}) — kein Handlungsbedarf
                  </h3>
                  <div className="space-y-1.5">
                    {diff.nurInGitLaw.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)]"
                      >
                        <span className="font-medium">{c.aktenzeichen}</span>
                        <span>{c.mandantName}</span>
                        <span className="ml-auto opacity-60">nicht in Advoware-Export</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {diff.match.length === 0 && diff.neuInAdvoware.length === 0 && (
                <div className="text-sm text-[var(--color-ink-soft)] text-center py-4">
                  Keine Unterschiede gefunden.
                </div>
              )}
            </>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <Check className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-base font-semibold text-[var(--color-ink)]">Sync abgeschlossen</p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {summary.imported} neue Akte{summary.imported !== 1 ? 'n' : ''} importiert
                · {summary.updated} Akte{summary.updated !== 1 ? 'n' : ''} aktualisiert
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">Audit-Log-Eintraege wurden erstellt.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && diff && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center gap-3 shrink-0">
            <button
              onClick={() => setStep('upload')}
              className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Zurueck
            </button>
            <span className="text-xs text-[var(--color-ink-muted)] flex-1">
              {totalChanges} Aenderung{totalChanges !== 1 ? 'en' : ''} ausgewaehlt
            </span>
            <button
              onClick={applyAll}
              disabled={applying || totalChanges === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-ink)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {applying ? 'Wird uebernommen...' : `${totalChanges} uebernehmen`}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[var(--color-ink)] text-white text-sm font-medium hover:opacity-90"
            >
              Schliessen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
