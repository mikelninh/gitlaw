/**
 * ProChecklistCard — eine Pflicht-Dokument-Card für die Anwalt-/Refa-Seite.
 *
 * Analog zur ChecklistCard in MandantAkte.tsx, aber mit Desktop-Primär-UX
 * und ohne Mandant-Voice. Bao/Refa scannt direkt am Schalter.
 */

import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Camera, Trash2, Image, AlertTriangle, Clock } from 'lucide-react'
import { addCaseDocument, getSettings, updateCase } from './store'
import { deleteServerDocument, uploadDocumentToVault } from './pro-api'
import { countUploadedForItem } from '../mandant/mandant-store'
import { computeItemStatus } from './checklist-status'
import type { ChecklistItem, CaseDocument, MandantCase } from './types'

interface Props {
  case: MandantCase
  item: ChecklistItem
  onUploaded: (newDoc: CaseDocument) => void
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'doc'
}

export default function ProChecklistCard({ case: c, item, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [recentlyUploaded, setRecentlyUploaded] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const allDocs = c.documents ?? []
  const itemDocs = allDocs.filter(d => d.checklistItemId === item.id)
  const required = item.requiredPhotoCount ?? 1
  const uploaded = countUploadedForItem(c, item.id)
  const itemStatus = computeItemStatus(c, item)

  const imageOnly =
    Array.isArray(item.acceptedFormats) &&
    item.acceptedFormats.length > 0 &&
    !item.acceptedFormats.includes('pdf')
  const fileAccept = imageOnly ? 'image/*' : 'image/*,application/pdf'

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)

    const internalName = `anwalt_${item.id}_${Date.now().toString(36)}_${slugPart(file.name)}`

    try {
      const uploaded = await uploadDocumentToVault(file, c.id, item.id)
      const doc = addCaseDocument(c.id, {
        originalName: file.name,
        internalName,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploadedBy: getSettings().anwaltName || 'anwalt',
        storageMode: uploaded.storageMode,
        serverDocumentId: uploaded.documentId,
        storageProvider: uploaded.storageProvider,
        checksumSha256: uploaded.checksumSha256,
        checklistItemId: item.id,
        kind: 'anwalt_upload',
      })
      if (doc) {
        setRecentlyUploaded(true)
        setTimeout(() => setRecentlyUploaded(false), 4000)
        onUploaded(doc)
      }
    } catch {
      // Fallback: lokal inline speichern
      try {
        const dataUrl = await new Promise<string | undefined>(resolve => {
          if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return resolve(undefined)
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => resolve(undefined)
          reader.readAsDataURL(file)
        })
        const doc = addCaseDocument(c.id, {
          originalName: file.name,
          internalName,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          uploadedBy: getSettings().anwaltName || 'anwalt',
          storageMode: 'local_inline',
          dataUrl,
          checklistItemId: item.id,
          kind: 'anwalt_upload',
        })
        if (doc) {
          setRecentlyUploaded(true)
          setTimeout(() => setRecentlyUploaded(false), 4000)
          onUploaded(doc)
        }
      } catch (fallbackErr) {
        setUploadError(fallbackErr instanceof Error ? fallbackErr.message : 'Upload fehlgeschlagen.')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleFile(file)
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId)
    setConfirmDeleteId(null)
    const doc = (c.documents ?? []).find(d => d.id === docId)
    try {
      if (doc?.serverDocumentId) {
        await deleteServerDocument(doc.serverDocumentId)
      }
      // Hard-remove aus lokalem State (kein soft-delete) — refreshDocuments
      // überschreibt mit Backend-Daten, die das Dok ebenfalls nicht mehr kennen.
      const nextDocs = (c.documents ?? []).filter(d => d.id !== docId)
      updateCase(c.id, { documents: nextDocs })
      onUploaded(doc as CaseDocument)
    } catch (err) {
      alert('Löschen fehlgeschlagen: ' + (err instanceof Error ? err.message : 'unbekannter Fehler'))
    } finally {
      setDeletingId(null)
    }
  }

  const visibleDocs = itemDocs.filter(d => !d.deletedAt)

  const cardBorder =
    itemStatus === 'approved' ? 'bg-green-50 border-green-200' :
    itemStatus === 'pending'  ? 'bg-amber-50 border-amber-300' :
    itemStatus === 'rejected' ? 'bg-red-50 border-red-200' :
    'bg-white border-[var(--color-border)]'

  const headerIcon =
    itemStatus === 'approved' ? <CheckCircle2 className="w-5 h-5 text-green-700" /> :
    itemStatus === 'pending'  ? <Clock className="w-5 h-5 text-amber-600" /> :
    itemStatus === 'rejected' ? <AlertTriangle className="w-5 h-5 text-red-600" /> :
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100">
      <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
    </span>

  const headerTextColor =
    itemStatus === 'approved' ? 'text-green-900' :
    itemStatus === 'pending'  ? 'text-amber-900' :
    itemStatus === 'rejected' ? 'text-red-900' :
    'text-[var(--color-ink)]'

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cardBorder}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {headerIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className={`text-sm font-medium leading-snug ${headerTextColor}`}>
              {item.label}
            </h3>
            {itemStatus === 'fehlt' && item.level === 'required' && (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                Pflicht — fehlt
              </span>
            )}
            {itemStatus === 'pending' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                <AlertTriangle className="w-3 h-3" />
                Wartet auf Prüfung
              </span>
            )}
            {itemStatus === 'rejected' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                <AlertTriangle className="w-3 h-3" />
                Zurückgegeben — neuer Upload nötig
              </span>
            )}
            {itemStatus === 'approved' && (
              <span className="inline-flex items-center rounded-full bg-green-200 text-green-900 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
                {required > 1 ? `${uploaded}/${required}` : 'Bestätigt'}
              </span>
            )}
          </div>
          {required > 1 && (
            <p className={`text-xs mt-0.5 ${itemStatus === 'approved' ? 'text-green-700' : 'text-[var(--color-ink-muted)]'}`}>
              {uploaded} von {required} Fotos hochgeladen
            </p>
          )}
          {item.description && (
            <p className="mt-1 text-xs text-[var(--color-ink-muted)] leading-relaxed">
              {item.description}
            </p>
          )}
          {item.typicalIssues && item.typicalIssues.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {item.typicalIssues.slice(0, 2).map((issue, idx) => (
                <li key={idx} className="text-xs text-[var(--color-ink-muted)] flex gap-1.5">
                  <span aria-hidden>-</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Vorschau bereits hochgeladener Docs */}
      {visibleDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleDocs.map(doc => {
            const isImage = doc.mimeType?.startsWith('image/')
            const isPdf = doc.mimeType === 'application/pdf'
            const src = doc.dataUrl ?? null
            const isConfirming = confirmDeleteId === doc.id
            const isDeleting = deletingId === doc.id
            // Anwalt darf nur eigene Uploads löschen (nicht Mandant-Uploads)
            const canDelete = doc.uploadedBy !== 'mandant'
            const isRejected = doc.reviewStatus === 'rejected'
            return (
              <div key={doc.id} className="relative group">
                {isImage && src ? (
                  <img
                    src={src}
                    alt={doc.originalName}
                    className={`w-16 h-16 rounded-lg object-cover border ${isRejected ? 'border-red-300 opacity-60' : 'border-[var(--color-border)]'}`}
                  />
                ) : isPdf ? (
                  <div className={`w-16 h-16 rounded-lg border bg-slate-50 flex items-center justify-center ${isRejected ? 'border-red-300 opacity-60' : 'border-[var(--color-border)]'}`}>
                    <FileText className="w-5 h-5 text-[var(--color-gold)]" />
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-lg border bg-slate-50 flex items-center justify-center ${isRejected ? 'border-red-300 opacity-60' : 'border-[var(--color-border)]'}`}>
                    <Image className="w-5 h-5 text-[var(--color-ink-muted)]" />
                  </div>
                )}
                {canDelete && (
                  <button
                    onClick={() =>
                      isConfirming ? handleDelete(doc.id) : setConfirmDeleteId(doc.id)
                    }
                    disabled={isDeleting}
                    title={isConfirming ? 'Wirklich löschen?' : 'Dokument entfernen'}
                    className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-red-300 text-red-600 flex items-center justify-center transition-opacity hover:bg-red-50 disabled:opacity-40 ${isRejected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5 truncate max-w-[64px]">
                  {isConfirming ? (
                    <span className="text-red-700 font-medium">Sicher?</span>
                  ) : (
                    doc.originalName
                  )}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload-Buttons (auch wenn complete, damit weitere Fotos möglich) */}
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={fileRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={handleChange}
        />
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] hover:border-[var(--color-gold)] disabled:opacity-50 transition-colors"
        >
          <Camera className="w-4 h-4" />
          Scannen / Foto
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] hover:border-[var(--color-gold)] disabled:opacity-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {uploading ? 'Wird hochgeladen…' : 'Datei wählen'}
        </button>
      </div>

      {imageOnly && (
        <p className="text-xs text-[var(--color-ink-muted)]">Nur Bild (JPG/PNG) — kein PDF</p>
      )}

      {recentlyUploaded && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Dokument gespeichert
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  )
}
