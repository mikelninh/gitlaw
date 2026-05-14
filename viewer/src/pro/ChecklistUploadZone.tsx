/**
 * ChecklistUploadZone — OCR-Drop-Zone für die Akten-Checkliste.
 *
 * Datei wird per Drag & Drop oder Klick ausgewählt, per FileReader in base64
 * umgewandelt, dann an /api/ocr gesendet. Der OCR-Text wird mit den
 * Checklisten-Items abgeglichen — Vorschläge müssen explizit bestätigt werden.
 *
 * Beta-Feature: OCR-Erkennung auf echten Mandanten-Dokumenten kann fehlschlagen.
 * Bao muss jeden Vorschlag manuell bestätigen.
 */

import { useRef, useState } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { getChecklistById } from './mandatsart-checklists'
import { matchesItem } from './checklist-match'
import type { MandantCase } from './types'

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

type OcrStatus = 'idle' | 'loading' | 'done' | 'error' | 'needs_render'

interface OcrMatch {
  itemId: string
  itemLabel: string
  confirmed: boolean | null  // null = pending, true = akzeptiert, false = verworfen
  suggestedFilename?: string  // Feature 2: gesetzt nach Bestätigung
  filenameCopied?: boolean
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen für Feature 2 — Auto-Benennung
// ---------------------------------------------------------------------------

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss',
}

function mapUmlaute(s: string): string {
  return s.replace(/[äöüÄÖÜß]/g, c => UMLAUT_MAP[c] ?? c)
}

/**
 * Extrahiert das erste Wort aus einem Checklist-Label, mappt Umlaute,
 * entfernt Sonderzeichen — für den Kategorie-Teil des Dateinamens.
 */
function kategorieFromLabel(label: string): string {
  const first = label.split(/[\s(]/)[0] ?? label
  return mapUmlaute(first).replace(/[^A-Za-z0-9]/g, '')
}

/**
 * Reinigt einen Mandant-Namen für den Dateinamen:
 * Diakritika per NFKD-Normalize entfernen, Leerzeichen → Bindestriche.
 */
function mandantNameClean(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
}

function buildSuggestedFilename(
  itemLabel: string,
  mandantName: string,
  originalFilename: string,
): string {
  const kategorie = kategorieFromLabel(itemLabel)
  const nameClean = mandantNameClean(mandantName)
  const isoDate = new Date().toISOString().slice(0, 10)
  const ext = originalFilename.includes('.')
    ? originalFilename.slice(originalFilename.lastIndexOf('.')).toLowerCase()
    : ''
  return `${kategorie}_${nameClean}_${isoDate}${ext}`
}

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

interface Props {
  case: MandantCase
  onChange: (updated: MandantCase) => void
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export default function ChecklistUploadZone({ case: c, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrText, setOcrText] = useState<string>('')
  const [ocrTextOpen, setOcrTextOpen] = useState(false)
  const [ocrError, setOcrError] = useState<string>('')
  const [matches, setMatches] = useState<OcrMatch[]>([])
  const [fileName, setFileName] = useState<string>('')

  const checklist = c.mandatsartId ? getChecklistById(c.mandatsartId) : null
  const hasChecklist = Boolean(checklist)

  async function processFile(file: File) {
    setFileName(file.name)
    setOcrStatus('loading')
    setOcrText('')
    setMatches([])
    setOcrError('')
    setOcrTextOpen(false)

    let base64 = ''
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // data:mime/type;base64,XXXX — wir wollen nur den Base64-Teil
          resolve(result.split(',')[1] ?? '')
        }
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
        reader.readAsDataURL(file)
      })
    } catch (err) {
      setOcrStatus('error')
      setOcrError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Lesen der Datei.')
      return
    }

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          base64,
          lang: 'de',
        }),
      })
      const data = await res.json()

      if (!data.ok) {
        setOcrStatus('error')
        setOcrError(data.message ?? 'OCR-Fehler vom Server.')
        return
      }

      if (data.status === 'needs_render') {
        setOcrStatus('needs_render')
        return
      }

      const text: string = data.ocrText ?? ''
      setOcrText(text)
      setOcrStatus('done')

      // Matching nur wenn Checkliste vorhanden
      if (checklist) {
        const found: OcrMatch[] = checklist.requiredDocuments
          .filter(item => {
            const alreadyReceived = (c.checklistStates ?? {})[item.id] === 'received'
            if (alreadyReceived) return false
            return matchesItem(item.label, item.id, text).matched
          })
          .map(item => ({
            itemId: item.id,
            itemLabel: item.label,
            confirmed: null,
          }))
        setMatches(found)
      }
    } catch (err) {
      setOcrStatus('error')
      setOcrError(err instanceof Error ? err.message : 'Netzwerkfehler.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so dieselbe Datei nochmal gewählt werden kann
    e.target.value = ''
  }

  function confirmMatch(itemId: string, accept: boolean) {
    if (accept) {
      const newStates = {
        ...(c.checklistStates ?? {}),
        [itemId]: 'received' as const,
      }
      onChange({ ...c, checklistStates: newStates })
    }
    setMatches(prev =>
      prev.map(m => {
        if (m.itemId !== itemId) return m
        // Feature 2: Dateiname-Vorschlag beim Bestätigen generieren
        const suggestedFilename = accept
          ? buildSuggestedFilename(m.itemLabel, c.mandantName, fileName)
          : undefined
        return { ...m, confirmed: accept, suggestedFilename }
      })
    )
  }

  function copyFilename(itemId: string, name: string) {
    navigator.clipboard.writeText(name).then(() => {
      setMatches(prev =>
        prev.map(m => m.itemId === itemId ? { ...m, filenameCopied: true } : m)
      )
      setTimeout(() => {
        setMatches(prev =>
          prev.map(m => m.itemId === itemId ? { ...m, filenameCopied: false } : m)
        )
      }, 2000)
    })
  }

  function reset() {
    setOcrStatus('idle')
    setOcrText('')
    setMatches([])
    setOcrError('')
    setFileName('')
    setOcrTextOpen(false)
  }

  const pendingMatches = matches.filter(m => m.confirmed === null)
  const acceptedMatches = matches.filter(m => m.confirmed === true)

  return (
    <div className="space-y-3">
      {/* Drop-Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => ocrStatus !== 'loading' && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed px-5 py-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-[var(--color-gold)] bg-amber-50'
            : 'border-[var(--color-border)] bg-[var(--color-bg-alt)] hover:border-[var(--color-gold)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-0.5">
            Beta-Erkennung
          </span>
          {ocrStatus === 'loading' ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Wird ausgewertet …
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Datei hier ablegen oder klicken
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                PNG, JPG, PDF (mit Text-Layer)
              </p>
            </>
          )}
          {!hasChecklist && (
            <p className="text-xs text-amber-700 mt-1">
              Mandatsart wählen, um Auto-Erkennung zu aktivieren — OCR funktioniert auch ohne.
            </p>
          )}
        </div>
      </div>

      {/* Scan-PDF Hinweis */}
      {ocrStatus === 'needs_render' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scan-PDF erkannt — Text-Erkennung bei Bildern (PNG/JPG) klappt zuverlässiger. Bitte als Bild hochladen oder PDF mit Text-Layer verwenden.
          <button onClick={reset} className="ml-2 underline text-amber-700 hover:text-amber-900">
            nochmal versuchen
          </button>
        </div>
      )}

      {/* Fehler */}
      {ocrStatus === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {ocrError || 'Unbekannter Fehler.'}
          <button onClick={reset} className="ml-2 underline text-red-700 hover:text-red-900">
            nochmal versuchen
          </button>
        </div>
      )}

      {/* Ergebnis */}
      {ocrStatus === 'done' && (
        <div className="space-y-3">
          {/* Dateiname + Reset */}
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-ink-muted)]">
            <span className="truncate">{fileName}</span>
            <button onClick={reset} className="shrink-0 underline hover:text-[var(--color-ink)]">
              neue Datei
            </button>
          </div>

          {/* Feature 1 — §12.2 Lesbarkeits-Hinweis */}
          {ocrText.length < 80 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Scan möglicherweise unleserlich (sehr wenig Text erkannt).
                Bitte gegenprüfen oder als höher aufgelöstes Bild erneut hochladen.
              </span>
            </div>
          )}
          {ocrText.length >= 80 && hasChecklist && matches.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Text wurde erkannt, aber kein Pflicht-Item passt.
                Möglicherweise gehört das Dokument zu einer anderen Mandatsart oder ist unklar.
                Bitte manuell zuordnen.
              </span>
            </div>
          )}

          {/* Bestätigte Matches + Feature 2 — Dateiname-Vorschlag */}
          {acceptedMatches.length > 0 && (
            <div className="space-y-2">
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                {acceptedMatches.length} Unterlage{acceptedMatches.length === 1 ? '' : 'n'} als erhalten markiert.
              </div>
              {acceptedMatches.filter(m => m.suggestedFilename).map(m => (
                <div key={`fn-${m.itemId}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)] font-semibold">
                    Vorschlag — kopieren und manuell beim Speichern verwenden
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={m.suggestedFilename}
                      className="flex-1 font-mono text-xs bg-white border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-ink)] focus:outline-none"
                    />
                    <button
                      onClick={() => m.suggestedFilename && copyFilename(m.itemId, m.suggestedFilename)}
                      className={`inline-flex items-center gap-1 text-xs rounded border px-2 py-1 transition-colors shrink-0 ${
                        m.filenameCopied
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-[var(--color-border)] bg-white text-[var(--color-ink-muted)] hover:border-[var(--color-gold)]'
                      }`}
                    >
                      {m.filenameCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {m.filenameCopied ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ausstehende Matches */}
          {pendingMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide">
                Erkannte Unterlagen — bitte bestätigen
              </p>
              {pendingMatches.map(m => (
                <div
                  key={m.itemId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5"
                >
                  <span className="text-sm text-[var(--color-ink)] truncate">
                    Erkannt: {m.itemLabel}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => confirmMatch(m.itemId, true)}
                      className="rounded border border-green-300 bg-green-50 px-2.5 py-1 text-xs text-green-800 hover:bg-green-100 transition-colors"
                    >
                      als erhalten markieren
                    </button>
                    <button
                      onClick={() => confirmMatch(m.itemId, false)}
                      className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      verwerfen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* OCR-Text collapsible */}
          {ocrText && (
            <div>
              <button
                onClick={() => setOcrTextOpen(s => !s)}
                className="text-xs text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
              >
                {ocrTextOpen ? 'Erkannten Text ausblenden' : 'Erkannten Text anzeigen'}
              </button>
              {ocrTextOpen && (
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] px-3 py-2 text-[11px] text-[var(--color-ink-soft)] whitespace-pre-wrap font-mono">
                  {ocrText}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
