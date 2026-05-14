/**
 * Akten-Uebersicht fuer den Mandanten -- mobile-first.
 *
 * Aufbau:
 *  1. Aktenzeichen-Card oben (fuer Telefon-Referenz, identisch mit /pro)
 *  2. Onboarding-Banner beim Erst-Login (3 Schritte, dismiss-bar)
 *  3. Smart-Upload-Banner (OCR-Erkennung ohne vorherige Zuordnung)
 *  4. Pro Pflicht-Dokument eine ChecklistCard (fehlend = amber, komplett = gruen)
 *  5. Status-Badge + Beschreibung
 *  6. Bereits eingereichte Dokumente collapsible
 *
 * Backend-Modus (backendToken gesetzt): laedt Akte vom Server, Upload geht ans Backend.
 * Demo-Modus (backendToken null): liest aus localStorage, Upload schreibt lokal.
 */

import { useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Camera, FileText, Phone, ChevronDown, ChevronUp, Hash, Image, Trash2, ExternalLink, Clock } from 'lucide-react'
import {
  getAllRequiredChecklistItems,
  getMissingChecklistItems,
  countUploadedForItem,
  isItemComplete,
  mandantUploadForChecklistItem,
  mandantAddDocument,
} from './mandant-store'
import { uploadMandantDocument, deleteMandantDocument, getMandantDocumentUrl } from './mandant-api'
import { useMandantCase } from './useMandantCase'
import { CASE_STATUSES } from '../pro/case-status'
import type { ChecklistItem, CaseDocument } from '../pro/types'
import { getChecklistById } from '../pro/mandatsart-checklists'
import { loadDemoData, isDemoLoaded } from '../pro/demo-data'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'
import MandantSmartUpload from './MandantSmartUpload'
import MandantOnboarding from './MandantOnboarding'

const ONBOARDING_KEY = 'gitlaw.mandant.onboarding.dismissed.v1'

interface Props {
  mandantId: string
  backendToken: string | null
  lang: MandantLang
}

export default function MandantAkte({ mandantId, backendToken, lang: langProp }: Props) {
  const { data: caseData, loading, error, reload } = useMandantCase(mandantId, backendToken)
  // Im Backend-Modus kommt lang vom Server, im Demo-Modus von aussen
  const lang = langProp
  const t = getMandantStrings(lang)

  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem(ONBOARDING_KEY) !== '1')
  const [showReceived, setShowReceived] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [recentlyUploadedId, setRecentlyUploadedId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletedSuccessId, setDeletedSuccessId] = useState<string | null>(null)

  function handleLoadDemo() {
    try {
      if (!isDemoLoaded()) loadDemoData('nguyen')
      reload()
    } catch {}
  }

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowOnboarding(false)
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-ink-muted)] text-sm">
        {lang === 'vi' ? 'Dang tai...' : 'Lade Akte...'}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-4 px-4">
        <div className="flex items-center justify-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={reload}
          className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] hover:bg-slate-50"
        >
          {lang === 'vi' ? 'Thu lai' : 'Erneut versuchen'}
        </button>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="py-12 text-center space-y-4 px-4">
        <p className="text-[var(--color-ink-muted)] text-base">{t.akteEmpty}</p>
        {mandantId === 'mandant-demo' && (
          <button
            onClick={handleLoadDemo}
            className="text-base px-5 py-3 rounded-lg bg-[var(--color-gold)] text-white active:opacity-80"
          >
            {lang === 'vi' ? 'Tai ho so demo' : 'Demo-Akte laden'}
          </button>
        )}
      </div>
    )
  }

  const statusInfo = CASE_STATUSES.find(s => s.id === caseData.caseStatus)
  const statusLabel = lang === 'vi' && statusInfo?.labelVi
    ? statusInfo.labelVi
    : (statusInfo?.label ?? t.unknownStatus)

  const checklist = caseData.mandatsartId ? (getChecklistById(caseData.mandatsartId) ?? null) : null
  const allRequiredItems = getAllRequiredChecklistItems(caseData, checklist)
  const missingItems = getMissingChecklistItems(caseData, checklist)
  const allDocs = caseData.documents ?? []
  // "Bereits eingereichte" Liste: nur Mandant-eigene Uploads + Vollmacht
  // (Pro-Side-Uploads werden als "von Kanzlei eingebracht" innerhalb der
  // Pflicht-Card angezeigt, NICHT in dieser Liste — sonst verwirrend.)
  const receivedDocs = allDocs.filter(d =>
    (d as { uploadedBy?: string }).uploadedBy !== 'kanzlei' || (d as { kind?: string }).kind === 'vollmacht'
  )

  // Lookup-Map: checklistItemId → item (für Bezeichnung in der Dokumenten-Liste)
  const itemById = new Map(
    checklist?.requiredDocuments.map(i => [i.id, i]) ?? []
  )

  const colorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  const statusBadge = statusInfo ? colorMap[statusInfo.color] ?? colorMap.gray : colorMap.gray

  async function uploadFor(item: ChecklistItem | null, file: File, photoSlotId?: string) {
    if (!caseData) return
    const itemId = item?.id ?? null
    setUploadingId(itemId ?? '__loose__')
    setErrorId(null)
    setErrorMessage(null)

    try {
      if (backendToken) {
        // Backend-Modus
        await uploadMandantDocument(backendToken, file, itemId ?? undefined)
        setUploadingId(null)
        setRecentlyUploadedId(itemId ?? '__loose__')
        setTimeout(() => setRecentlyUploadedId(null), 4000)
        reload()
      } else {
        // Demo-Modus
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject()
          reader.readAsDataURL(file)
        }).catch(() => null)

        const isoDate = new Date().toISOString().slice(0, 10)
        const internalName = item
          ? `mandant_${item.id}_${isoDate}_${file.name}`
          : `mandant_${isoDate}_${file.name}`

        const doc = item
          ? mandantUploadForChecklistItem(caseData.id, item.id, {
              originalName: file.name,
              internalName,
              mimeType: file.type,
              sizeBytes: file.size,
              dataUrl: dataUrl ?? undefined,
              photoSlotId,
            })
          : mandantAddDocument(caseData.id, {
              originalName: file.name,
              internalName,
              mimeType: file.type,
              sizeBytes: file.size,
              dataUrl: dataUrl ?? undefined,
            })

        setUploadingId(null)

        if (doc) {
          reload()
          setRecentlyUploadedId(itemId ?? '__loose__')
          setTimeout(() => setRecentlyUploadedId(null), 4000)
        } else {
          setErrorId(itemId ?? '__loose__')
          setTimeout(() => { setErrorId(null); setErrorMessage(null) }, 4000)
        }
      }
    } catch (err) {
      setUploadingId(null)
      setErrorId(itemId ?? '__loose__')
      // Surface backend error message (e.g. "Für dieses Dokument bitte ein Foto, kein PDF")
      const msg = err instanceof Error ? err.message : null
      setErrorMessage(msg)
      setTimeout(() => { setErrorId(null); setErrorMessage(null) }, 5000)
    }
  }

  async function handleDeleteDoc(documentId: string) {
    if (!caseData) return
    setDeletingDocId(documentId)
    setDeleteConfirmId(null)
    try {
      if (backendToken) {
        await deleteMandantDocument(backendToken, documentId)
      } else {
        // Demo-Modus: kein Backend — nur lokalen State bereinigen
      }
      setDeletedSuccessId(documentId)
      setTimeout(() => setDeletedSuccessId(null), 4000)
      reload()
    } catch {
      // Fehler-Feedback wird inline angezeigt — kein weiterer State nötig
    } finally {
      setDeletingDocId(null)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Onboarding -- nur Erst-Login */}
      {showOnboarding && (
        <MandantOnboarding
          lang={lang}
          onDismiss={dismissOnboarding}
          mandantName={caseData.mandantName ?? ''}
          kanzleiName="Anwaltskanzlei Thai Bao Nguyen"
        />
      )}

      {/* Aktenzeichen-Card -- prominent fuer Telefon-Referenz */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--color-ink-muted)] text-xs uppercase tracking-wide font-medium">
              <Hash className="w-3.5 h-3.5" />
              {t.akteNumber}
            </div>
            <p className="font-mono text-2xl sm:text-3xl font-semibold mt-1 text-[var(--color-ink)] break-all">
              {caseData.aktenzeichen}
            </p>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">{caseData.mandantName}</p>
          </div>
          {statusInfo && (
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${statusBadge}`}>
              {statusLabel}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-[var(--color-ink-muted)] leading-relaxed">
          <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t.caseRefHint}</span>
        </div>
        {caseData.description && (
          <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
            {caseData.description}
          </p>
        )}
      </div>

      {/* Smart-Upload -- versteckt default, nur als Notfall fuer unsichere Mandanten */}
      {checklist && missingItems.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-4 py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] flex items-center justify-center gap-2">
            <span>{lang === 'vi' ? 'Không chắc tài liệu nào? Để chúng tôi giúp xác định' : 'Unsicher welches Dokument? Foto zur automatischen Erkennung'}</span>
          </summary>
          <div className="mt-2">
            <MandantSmartUpload
              caseData={caseData}
              checklist={checklist}
              lang={lang}
              backendToken={backendToken}
              onConfirm={(item, file) => uploadFor(item, file)}
            />
          </div>
        </details>
      )}

      {/* Pflicht-Dokument-Cards -- alle required Items (fehlend = amber, komplett = gruen) */}
      {allRequiredItems.length > 0 && (
        <div className="space-y-3">
          {/* Fortschritts-Header: X von Y Dokumenten eingereicht */}
          {(() => {
            const totalRequired = allRequiredItems.length
            const submittedCount = allRequiredItems.filter(i => isItemComplete(caseData, i)).length
            const pct = totalRequired > 0 ? Math.round((submittedCount / totalRequired) * 100) : 0
            const allDone = submittedCount === totalRequired
            return (
              <div className={`rounded-xl border px-4 py-3 ${allDone ? 'bg-green-50 border-green-200' : 'bg-white border-[var(--color-border)]'}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-sm font-medium ${allDone ? 'text-green-800' : 'text-[var(--color-ink)]'}`}>
                    {t.checklistProgress(submittedCount, totalRequired)}
                  </span>
                  <span className={`text-xs font-semibold ${allDone ? 'text-green-700' : 'text-[var(--color-ink-muted)]'}`}>
                    {pct} %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })()}

          {missingItems.length > 0 && (
            <div className="flex items-start gap-2 px-1">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                  {t.akteMissingDocuments}
                </h2>
                <p className="text-sm text-[var(--color-ink-soft)] mt-0.5 leading-relaxed">
                  {t.checklistIntro}
                </p>
              </div>
            </div>
          )}

          {allRequiredItems.map(item => {
            const complete = isItemComplete(caseData, item)
            const uploadedCount = countUploadedForItem(caseData, item.id)
            const itemDocs = allDocs.filter(d => d.checklistItemId === item.id)
            const rejectedDoc = itemDocs.find(d => d.reviewStatus === 'rejected')
            // Banner nur zeigen wenn KEIN neuerer (non-rejected, non-deleted) Doc existiert
            // → wenn Mandant neu hochgeladen hat, ist die Beanstandung erledigt
            const hasNewerValidDoc = rejectedDoc
              ? itemDocs.some(d =>
                  d.id !== rejectedDoc.id &&
                  d.reviewStatus !== 'rejected' &&
                  !(d as { deletedAt?: string }).deletedAt &&
                  new Date(d.uploadedAt) > new Date(rejectedDoc.uploadedAt)
                )
              : false
            const showRejectionBanner = rejectedDoc && !hasNewerValidDoc
            return (
              <div key={item.id} className="space-y-1">
                {/* Kanzlei-Hinweis: Dokument zurückgegeben (verschwindet sobald neuer Upload da) */}
                {showRejectionBanner && rejectedDoc && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {t.docRejectedBanner}
                      {/* TODO: VI-review native speaker */}
                      {rejectedDoc.reviewComment && (
                        <span className="ml-1 font-medium">„{rejectedDoc.reviewComment}"</span>
                      )}
                    </span>
                  </div>
                )}
                <ChecklistCard
                  item={item}
                  lang={lang}
                  t={t}
                  complete={complete}
                  uploaded={uploadedCount}
                  itemDocs={itemDocs}
                  uploading={uploadingId === item.id}
                  recentlyUploaded={recentlyUploadedId === item.id}
                  error={errorId === item.id}
                  errorMessage={errorId === item.id ? errorMessage : null}
                  onFile={(file, slotId) => uploadFor(item, file, slotId)}
                />
              </div>
            )
          })}
        </div>
      )}

      {missingItems.length === 0 && checklist && (() => {
        // Differenziertes Footer-Banner basierend auf reviewStatus aller Docs:
        // alle approved → grün "alles bestätigt"
        // mind. 1 pending → gelb "alle eingereicht, wartet auf Prüfung"
        // mind. 1 rejected → rot "Anwalt hat etwas abgelehnt — handle nach"
        const allDocs = caseData.documents ?? []
        const anyRejected = allDocs.some((d) => d.reviewStatus === 'rejected')
        const allApproved =
          allDocs.length > 0 && allDocs.every((d) => d.reviewStatus === 'approved')
        if (anyRejected) {
          return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 leading-relaxed">
                {lang === 'vi'
                  ? 'Luật sư đã từ chối một số tài liệu — vui lòng tải lại bản đúng.'
                  : 'Anwält:in hat einzelne Dokumente abgelehnt — bitte oben in der Liste neu hochladen.'}
              </p>
            </div>
          )
        }
        if (allApproved) {
          return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 leading-relaxed">
                {lang === 'vi'
                  ? 'Luật sư đã xác nhận tất cả tài liệu. Đơn đang được chuẩn bị.'
                  : 'Anwält:in hat alle Unterlagen geprüft + bestätigt. Antrag wird vorbereitet.'}
              </p>
            </div>
          )
        }
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              {lang === 'vi'
                ? 'Bạn đã nộp tất cả tài liệu. Luật sư sẽ kiểm tra và xác nhận từng cái.'
                : 'Du hast alle Unterlagen eingereicht. Anwält:in prüft sie jetzt — du wirst informiert sobald alle bestätigt sind.'}
            </p>
          </div>
        )
      })()}

      {/* Eingereichte Dokumente collapsible */}
      {receivedDocs.length > 0 && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowReceived(s => !s)}
            className="w-full px-4 py-4 flex items-center justify-between gap-3 active:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
              <FileText className="w-4 h-4 text-[var(--color-gold)]" />
              {showReceived ? t.checklistHideReceived : t.checklistShowReceived}
              <span className="text-[var(--color-ink-muted)] font-normal">({receivedDocs.length})</span>
            </span>
            {showReceived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showReceived && (
            <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {receivedDocs.map(doc => {
                const isImage = doc.mimeType?.startsWith('image/')
                const isPdf = doc.mimeType === 'application/pdf'
                const uploadDate = new Date(doc.uploadedAt).toLocaleDateString(
                  lang === 'vi' ? 'vi-VN' : 'de-DE',
                )
                const docUrl = backendToken && doc.serverDocumentId
                  ? getMandantDocumentUrl(backendToken, doc.serverDocumentId)
                  : null
                const thumbSrc = doc.dataUrl ?? (isImage && docUrl ? docUrl : null)
                const isDeleting = deletingDocId === doc.id
                const isConfirming = deleteConfirmId === doc.id
                const justDeleted = deletedSuccessId === doc.id

                // Bezeichnung: Vollmacht > Checklist-Item-Label > "Sonstige Datei"
                const checklistItem = doc.checklistItemId ? itemById.get(doc.checklistItemId) : undefined
                const docCategoryLabel: string = doc.kind === 'vollmacht'
                  ? (lang === 'vi' ? 'Giấy ủy quyền đã ký' : 'Unterzeichnete Vollmacht')
                  : checklistItem
                    ? (lang === 'vi' && checklistItem.labelVi ? checklistItem.labelVi : checklistItem.label)
                    : (lang === 'vi' ? 'Tài liệu khác' : 'Sonstige Datei')
                // TODO: VI-review — "Giấy ủy quyền đã ký" / "Tài liệu khác" native speaker prüfen

                return (
                  <li key={doc.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {/* Vorschau */}
                      {isImage && thumbSrc ? (
                        <button
                          onClick={() => setLightboxSrc(docUrl ?? thumbSrc)}
                          className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[var(--color-border)] active:opacity-70"
                          aria-label={t.docViewLabel}
                        >
                          <img
                            src={thumbSrc}
                            alt={doc.originalName}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : isPdf && docUrl ? (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 w-12 h-12 rounded-lg border border-[var(--color-border)] bg-slate-50 flex items-center justify-center active:opacity-70"
                          aria-label={t.docViewLabel}
                        >
                          <FileText className="w-5 h-5 text-[var(--color-gold)]" />
                        </a>
                      ) : (
                        <div className="shrink-0 w-12 h-12 rounded-lg border border-[var(--color-border)] bg-slate-50 flex items-center justify-center">
                          <Image className="w-5 h-5 text-[var(--color-ink-muted)]" />
                        </div>
                      )}

                      {/* Bezeichnung + Dateiname + Datum */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)] leading-snug truncate">
                          {docCategoryLabel}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)] truncate mt-0.5">{doc.originalName}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                          {t.docUploadedAt.replace('{datum}', uploadDate)}
                        </p>
                      </div>

                      {/* Aktionen */}
                      <div className="shrink-0 flex items-center gap-1">
                        {(docUrl) && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-slate-50 active:bg-slate-100"
                            aria-label={t.docViewLabel}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {doc.kind !== 'vollmacht' && (
                          <button
                            onClick={() =>
                              isConfirming
                                ? handleDeleteDoc(doc.id)
                                : setDeleteConfirmId(doc.id)
                            }
                            disabled={isDeleting}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-40"
                            aria-label={isConfirming ? t.docDeleteConfirm : t.docDeleteLabel}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bestätigungs-Dialog */}
                    {isConfirming && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-sm text-red-800 flex-1 leading-snug">{t.docDeleteConfirm}</p>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs text-red-600 px-2 py-1 rounded hover:bg-red-100"
                        >
                          {lang === 'vi' ? 'Hủy' : 'Abbrechen'}
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={isDeleting}
                          className="text-xs font-medium text-white bg-red-600 px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {isDeleting
                            ? lang === 'vi' ? 'Đang xóa…' : 'Löschen …'
                            : t.docDeleteLabel}
                        </button>
                      </div>
                    )}

                    {/* Erfolg */}
                    {justDeleted && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        {t.docDeleteSuccess}
                      </div>
                    )}

                    {/* Review-Status: rejected → roter Banner mit Kanzlei-Hinweis */}
                    {doc.reviewStatus === 'rejected' && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          {t.docRejectedBanner}
                          {doc.reviewComment && (
                            <span className="ml-1 font-medium">„{doc.reviewComment}"</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Review-Status: approved → kleines grünes Häkchen */}
                    {doc.reviewStatus === 'approved' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.docApprovedBadge}</span>
                      </div>
                    )}

                    {/* Review-Status: pending (oder kein Status) → neutrales Icon */}
                    {(!doc.reviewStatus || doc.reviewStatus === 'pending') && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.docPendingBadge}</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl font-light hover:bg-white/30"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChecklistCard -- eine Card pro Pflicht-Dokument
// ---------------------------------------------------------------------------

interface CardProps {
  item: ChecklistItem
  lang: MandantLang
  t: ReturnType<typeof getMandantStrings>
  complete: boolean
  uploaded: number
  itemDocs: CaseDocument[]
  uploading: boolean
  recentlyUploaded: boolean
  error: boolean
  errorMessage?: string | null
  onFile: (file: File, slotId?: string) => void
}

function ChecklistCard({
  item,
  lang,
  t,
  complete,
  uploaded,
  itemDocs,
  uploading,
  recentlyUploaded,
  error,
  errorMessage,
  onFile,
}: CardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const label = lang === 'vi' && item.labelVi ? item.labelVi : item.label
  const required = item.requiredPhotoCount ?? 1
  const isMultiPhoto = required > 1

  // Nur Foto wenn acceptedFormats gesetzt ist und 'pdf' fehlt
  const imageOnly =
    Array.isArray(item.acceptedFormats) &&
    item.acceptedFormats.length > 0 &&
    !item.acceptedFormats.includes('pdf')
  const fileAccept = imageOnly ? 'image/*' : 'image/*,application/pdf'
  const formatsHint = imageOnly
    ? (lang === 'vi' ? 'Chỉ ảnh (JPG/PNG)' : 'Nur Foto (JPG/PNG) — kein PDF')
    : t.checklistAcceptedFormats
  // TODO: VI-review — "Chỉ ảnh (JPG/PNG)" native speaker prüfen

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, slotId?: string) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onFile(file, slotId)
  }

  // Abgeschlossen -- gruen, bleibt sichtbar
  if (complete) {
    // Status-Differenzierung pro Item (alle Docs in itemDocs anschauen):
    //   approved → grün "Bestätigt"
    //   pending  → gelb "Eingereicht — wartet auf Prüfung"
    //   rejected → rot "Abgelehnt"
    // Wenn alle Docs approved sind: voll grün. Wenn mind. 1 pending: gelb.
    const allApproved = itemDocs.every((d) => d.reviewStatus === 'approved')
    const anyRejected = itemDocs.some((d) => d.reviewStatus === 'rejected')
    const statusKey: 'approved' | 'pending' | 'rejected' = anyRejected
      ? 'rejected'
      : allApproved
        ? 'approved'
        : 'pending'

    const palette =
      statusKey === 'approved'
        ? { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-200 text-green-900', iconCls: 'text-green-700' }
        : statusKey === 'pending'
          ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-200 text-amber-900', iconCls: 'text-amber-700' }
          : { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-200 text-red-900', iconCls: 'text-red-700' }

    const badgeLabel =
      statusKey === 'approved'
        ? lang === 'vi'
          ? 'Đã xác nhận'
          : 'Bestätigt'
        : statusKey === 'pending'
          ? lang === 'vi'
            ? 'Đang chờ duyệt'
            : 'Wartet auf Prüfung'
          : lang === 'vi'
            ? 'Bị từ chối'
            : 'Abgelehnt'

    const subline =
      statusKey === 'pending'
        ? lang === 'vi'
          ? 'Đã nộp — luật sư sẽ kiểm tra.'
          : 'Eingereicht — Anwält:in prüft demnächst.'
        : statusKey === 'approved'
          ? lang === 'vi'
            ? 'Luật sư đã xác nhận.'
            : 'Von Anwält:in geprüft + bestätigt.'
          : lang === 'vi'
            ? 'Bị từ chối — vui lòng tải lại.'
            : 'Abgelehnt — bitte neu hochladen.'

    return (
      <div className={`${palette.bg} ${palette.border} border rounded-xl p-4 space-y-2`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`w-5 h-5 ${palette.iconCls} shrink-0`} />
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${palette.text} leading-snug`}>{label}</h3>
            <p className={`text-xs ${palette.text} opacity-80 mt-0.5`}>{subline}</p>
            {isMultiPhoto && (
              <p className={`text-xs ${palette.iconCls} mt-0.5`}>{t.photoProgress(uploaded, required)}</p>
            )}
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full ${palette.badge} px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold`}>
            {badgeLabel}
          </span>
        </div>
        {isMultiPhoto && itemDocs.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-8">
            {itemDocs.map(doc => (
              <PhotoThumb key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Unvollstaendig / fehlend
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700">
            <FileText className="w-4 h-4" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-base font-medium text-[var(--color-ink)] leading-snug">{label}</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold">
              {t.checklistRequiredBadge}
            </span>
          </div>
          {isMultiPhoto && (
            <p className="mt-1 text-sm text-amber-700 font-medium">
              {t.photoProgress(uploaded, required)}
            </p>
          )}
          {item.description && lang === 'de' && (
            <p className="mt-1.5 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {item.description}
            </p>
          )}
          {item.typicalIssues && item.typicalIssues.length > 0 && lang === 'de' && (
            <ul className="mt-2 space-y-0.5">
              {item.typicalIssues.slice(0, 2).map((issue, idx) => (
                <li key={idx} className="text-xs text-[var(--color-ink-muted)] leading-relaxed flex gap-1.5">
                  <span aria-hidden>-</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Vorschau bereits hochgeladener Seiten (Multi-Photo im Gange) */}
      {isMultiPhoto && itemDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {itemDocs.map(doc => (
            <PhotoThumb key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {/* Named Slots wenn photoSlots definiert */}
      {item.photoSlots && item.photoSlots.length > 0 && (
        <ul className="space-y-1.5">
          {item.photoSlots.map(slot => {
            const slotFilled = itemDocs.some(d => d.photoSlotId === slot.id)
            const slotLabel = lang === 'vi' && slot.labelVi ? slot.labelVi : slot.label
            return (
              <li key={slot.id} className="flex items-center gap-2 text-sm">
                {slotFilled ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0" />
                )}
                <span className={slotFilled ? 'text-green-800' : 'text-[var(--color-ink)]'}>
                  {slotLabel}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {slotFilled ? t.photoSlotFilled : t.photoSlotMissing}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Upload-Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleChange(e)}
        />
        <input
          ref={fileRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={e => handleChange(e)}
        />
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-ink)] active:bg-slate-50 disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {lang === 'vi' ? 'Chup anh' : 'Foto'}
          {/* TODO: VI-review native speaker */}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-[var(--color-gold)] text-white text-sm font-medium active:opacity-80 disabled:opacity-50"
        >
          {uploading
            ? t.checklistUploadingButton
            : isMultiPhoto && uploaded > 0
              ? t.photoAddMore
              : t.checklistUploadButton}
        </button>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] text-center">{formatsHint}</p>

      {recentlyUploaded && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {t.checklistUploadSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage ?? t.checklistUploadError}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PhotoThumb -- Vorschau eines bereits hochgeladenen Fotos
// ---------------------------------------------------------------------------

function PhotoThumb({ doc }: { doc: CaseDocument }) {
  if (doc.dataUrl && doc.mimeType.startsWith('image/')) {
    return (
      <img
        src={doc.dataUrl}
        alt={doc.originalName}
        className="w-14 h-14 rounded-lg object-cover border border-[var(--color-border)]"
      />
    )
  }
  return (
    <div className="w-14 h-14 rounded-lg border border-[var(--color-border)] bg-slate-50 flex items-center justify-center">
      <Image className="w-5 h-5 text-[var(--color-ink-muted)]" />
    </div>
  )
}
