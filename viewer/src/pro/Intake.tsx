/**
 * Triage-Page — Anwält:in lädt einen Stapel ungeordneter Dokumente
 * (PDFs, Briefe als Foto, Screenshots, Emails als Bild) hoch und bekommt
 * automatisch klassifizierte, sinnvoll benannte Dateien zurück.
 *
 * Flow:
 *   1. Datei(en) wählen oder droppen
 *   2. Pro Datei: upload → POST /api/pro/intake/classify → Ergebnis-Zeile
 *   3. Tabelle: Originalname → vorgeschlagener Name, Typ, Datum, Absender,
 *      Zusammenfassung. Inline editierbar.
 *   4. "Als ZIP exportieren" → eine sortierte Datei pro Mandant:in.
 *
 * MVP-Scope (2026-05-04): bewusst KEINE automatische Mandant:innen-Gruppierung
 * — die Anwält:in kann gruppieren, indem sie mehrere Zeilen auswählt und
 * exportiert. Auto-Grouping kommt in v2 wenn Klassifikation stabil läuft.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  ArrowLeft,
} from 'lucide-react'
import JSZip from 'jszip'
import {
  uploadDocumentToVault,
  classifyIntakeDocument,
  type IntakeClassification,
} from './pro-api'

// ── State types ──────────────────────────────────────────────────────────────

type Status = 'pending' | 'uploading' | 'classifying' | 'done' | 'error'

interface Row {
  id: string                      // UI key, separate from documentId
  file: File                      // original blob (kept for ZIP export)
  status: Status
  errorMessage?: string
  documentId?: string             // server document id once uploaded
  classification?: IntakeClassification
}

const DOC_TYPES: IntakeClassification['doc_type'][] = [
  'Brief',
  'Email',
  'Bescheid',
  'Mahnung',
  'Klage',
  'Vertrag',
  'Rechnung',
  'Foto',
  'Screenshot',
  'Sonstiges',
]

const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'text/plain',
]

const MAX_BASE64_BYTES = 700_000  // matches /api/pro/upload server cap

// OpenAI free/low tiers cap at ~5 RPM on gpt-4o-mini, and our endpoint can
// fire two calls per file (Vision-OCR for images + classification). At
// concurrency 2 we stay under the limit even with mixed file types, while
// keeping the demo feeling responsive. Bump when the API key tier goes up.
const MAX_CONCURRENT_CLASSIFICATIONS = 2

function rowKey(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function fileExtension(mime: string, fallback: string): string {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic') return 'heic'
  if (mime.startsWith('text/')) return 'txt'
  // last-ditch: take from original filename
  const dot = fallback.lastIndexOf('.')
  return dot > 0 ? fallback.slice(dot + 1).toLowerCase() : 'bin'
}

function safeFilename(stem: string, ext: string): string {
  const cleaned = stem.replace(/[^A-Za-z0-9_\-]/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
  return `${cleaned || 'Dokument'}.${ext}`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Intake() {
  const [rows, setRows] = useState<Row[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Simple FIFO queue + slot counter, scoped to the component instance.
  const queueRef = useRef<Array<{ id: string; file: File }>>([])
  const activeRef = useRef(0)

  const summary = useMemo(() => {
    const total = rows.length
    const done = rows.filter((r) => r.status === 'done').length
    const review = rows.filter((r) => r.classification?.needs_review).length
    const errors = rows.filter((r) => r.status === 'error').length
    return { total, done, review, errors }
  }, [rows])

  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const updateClassification = useCallback(
    (id: string, patch: Partial<IntakeClassification>) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id && r.classification
            ? { ...r, classification: { ...r.classification, ...patch } }
            : r,
        ),
      )
    },
    [],
  )

  const processFile = useCallback(
    async (rowId: string, file: File) => {
      try {
        // Browser base64 length ≈ 4/3 of byte length. Block oversized before the
        // server has to reject it.
        if (Math.ceil((file.size * 4) / 3) > MAX_BASE64_BYTES) {
          updateRow(rowId, {
            status: 'error',
            errorMessage: `Datei zu groß für Beta-Vault (max ~500 KB original).`,
          })
          return
        }

        updateRow(rowId, { status: 'uploading' })
        const upload = await uploadDocumentToVault(file)
        updateRow(rowId, { status: 'classifying', documentId: upload.documentId })

        const result = await classifyIntakeDocument(upload.documentId)
        updateRow(rowId, { status: 'done', classification: result.classification })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
        // 429 / "rate limit" is recoverable — surface as a hint instead of a hard error.
        const isRateLimit = /rate.?limit|HTTP 429|RPM/i.test(message)
        updateRow(rowId, {
          status: 'error',
          errorMessage: isRateLimit
            ? 'OpenAI Rate-Limit — bitte 30 Sek. warten und erneut hinzufügen.'
            : message,
        })
      }
    },
    [updateRow],
  )

  // Simple concurrency-limited queue: pull from queueRef, run processFile,
  // free the slot, recurse. Keeps us under the OpenAI RPM cap while still
  // feeling parallel.
  const drainQueue = useCallback(() => {
    while (activeRef.current < MAX_CONCURRENT_CLASSIFICATIONS && queueRef.current.length > 0) {
      const next = queueRef.current.shift()
      if (!next) break
      activeRef.current += 1
      void processFile(next.id, next.file).finally(() => {
        activeRef.current -= 1
        drainQueue()
      })
    }
  }, [processFile])

  const acceptFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming: Row[] = []
      for (const file of Array.from(files)) {
        if (!ACCEPTED_MIME.includes(file.type) && !file.type.startsWith('image/')) {
          // Allow common image types we missed; reject anything obviously not a doc.
          if (!file.type) {
            // empty type happens on .heic / weird extensions — let it through
          } else if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            continue
          }
        }
        incoming.push({ id: rowKey(), file, status: 'pending' })
      }
      if (incoming.length === 0) return
      setRows((prev) => [...prev, ...incoming])
      queueRef.current.push(...incoming.map((r) => ({ id: r.id, file: r.file })))
      drainQueue()
    },
    [drainQueue],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer?.files?.length) acceptFiles(e.dataTransfer.files)
    },
    [acceptFiles],
  )

  const onPickFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) acceptFiles(e.target.files)
      // reset so picking the same files again still triggers change
      e.target.value = ''
    },
    [acceptFiles],
  )

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const exportZip = useCallback(async () => {
    const usable = rows.filter((r) => r.status === 'done' && r.classification)
    if (usable.length === 0) return

    const zip = new JSZip()
    const usedNames = new Set<string>()

    for (const row of usable) {
      const c = row.classification!
      const ext = fileExtension(row.file.type || '', row.file.name)
      let name = safeFilename(c.suggested_filename, ext)
      // dedupe identical suggested names
      let counter = 2
      while (usedNames.has(name)) {
        name = safeFilename(`${c.suggested_filename}_${counter}`, ext)
        counter += 1
      }
      usedNames.add(name)
      const buffer = await row.file.arrayBuffer()
      zip.file(name, buffer)
    }

    // Manifest with metadata for the lawyer's records.
    const manifest = usable.map((r) => ({
      original: r.file.name,
      benannt: safeFilename(r.classification!.suggested_filename, fileExtension(r.file.type || '', r.file.name)),
      typ: r.classification!.doc_type,
      datum: r.classification!.document_date,
      absender: r.classification!.sender,
      empfaenger: r.classification!.recipient,
      parteien: r.classification!.parties,
      aktenzeichen: r.classification!.aktenzeichen,
      zusammenfassung: r.classification!.summary_de,
      confidence: r.classification!.confidence,
      manuell_pruefen: r.classification!.needs_review,
    }))
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    a.download = `triage_${stamp}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [rows])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/pro" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Triage — Mandats-Posteingang</h1>
          <p className="text-sm text-slate-500 mt-1">
            Lade ungeordnete Dokumente hoch — die Klassifikation schlägt Typ, Datum, Absender und
            sinnvollen Dateinamen vor. Du prüfst und exportierst als ZIP.
          </p>
        </div>
        {summary.done > 0 && (
          <button
            onClick={() => void exportZip()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            Als ZIP exportieren ({summary.done})
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition',
          dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-500',
        ].join(' ')}
      >
        <Upload className="w-8 h-8 mx-auto text-slate-400" />
        <p className="mt-2 text-sm font-medium">Dateien hier ablegen oder klicken zum Auswählen</p>
        <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WebP, HEIC, TXT — bis ~500 KB pro Datei (Beta-Limit)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,image/*,application/pdf,text/plain"
          onChange={onPickFiles}
          className="hidden"
        />
      </div>

      {summary.total > 0 && (
        <div className="flex gap-3 text-sm text-slate-600">
          <span>Gesamt: <strong>{summary.total}</strong></span>
          <span>·</span>
          <span>Fertig: <strong className="text-emerald-700">{summary.done}</strong></span>
          {summary.review > 0 && (
            <>
              <span>·</span>
              <span>Prüfen: <strong className="text-amber-700">{summary.review}</strong></span>
            </>
          )}
          {summary.errors > 0 && (
            <>
              <span>·</span>
              <span>Fehler: <strong className="text-rose-700">{summary.errors}</strong></span>
            </>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-600">Original</th>
                <th className="px-3 py-2 font-medium text-slate-600">Vorschlag</th>
                <th className="px-3 py-2 font-medium text-slate-600">Typ</th>
                <th className="px-3 py-2 font-medium text-slate-600">Datum</th>
                <th className="px-3 py-2 font-medium text-slate-600">Absender</th>
                <th className="px-3 py-2 font-medium text-slate-600">Zusammenfassung</th>
                <th className="px-3 py-2 font-medium text-slate-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RowView
                  key={row.id}
                  row={row}
                  onChangeClassification={(patch) => updateClassification(row.id, patch)}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Row component ────────────────────────────────────────────────────────────

function RowView({
  row,
  onChangeClassification,
  onRemove,
}: {
  row: Row
  onChangeClassification: (patch: Partial<IntakeClassification>) => void
  onRemove: () => void
}) {
  const c = row.classification

  const statusBadge = (() => {
    if (row.status === 'uploading') return <PendingBadge label="Upload..." />
    if (row.status === 'classifying') return <PendingBadge label="Klassifiziere..." />
    if (row.status === 'error') return <ErrorBadge label="Fehler" />
    if (c?.needs_review) return <ReviewBadge />
    if (row.status === 'done') return <DoneBadge confidence={c?.confidence ?? 0} />
    return null
  })()

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="break-all">{row.file.name}</div>
            <div className="mt-1">{statusBadge}</div>
            {row.errorMessage && (
              <div className="mt-1 text-xs text-rose-600 max-w-xs">{row.errorMessage}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        {c ? (
          <input
            value={c.suggested_filename}
            onChange={(e) => onChangeClassification({ suggested_filename: e.target.value })}
            className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs"
          />
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {c ? (
          <select
            value={c.doc_type}
            onChange={(e) =>
              onChangeClassification({ doc_type: e.target.value as IntakeClassification['doc_type'] })
            }
            className="px-2 py-1 border border-slate-200 rounded text-xs"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {c ? (
          <input
            type="date"
            value={c.document_date || ''}
            onChange={(e) => onChangeClassification({ document_date: e.target.value || null })}
            className="px-2 py-1 border border-slate-200 rounded text-xs"
          />
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {c ? (
          <input
            value={c.sender || ''}
            onChange={(e) => onChangeClassification({ sender: e.target.value || null })}
            className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
            placeholder="Absender"
          />
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-slate-600 max-w-md">
        {c ? (
          <div>
            <div>{c.summary_de}</div>
            {c.aktenzeichen && (
              <div className="mt-1 font-mono text-[11px] text-slate-500">AZ: {c.aktenzeichen}</div>
            )}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-600"
          title="Entfernen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

function PendingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Loader2 className="w-3 h-3 animate-spin" />
      {label}
    </span>
  )
}

function DoneBadge({ confidence }: { confidence: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
      <CheckCircle2 className="w-3 h-3" />
      OK · {(confidence * 100).toFixed(0)}%
    </span>
  )
}

function ReviewBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      Manuell prüfen
    </span>
  )
}

function ErrorBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose-700">
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  )
}
