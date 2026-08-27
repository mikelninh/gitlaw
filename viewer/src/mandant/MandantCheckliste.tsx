import { useEffect, useState } from 'react'
import { FilePlus2, MessageCircleQuestion, UploadCloud } from 'lucide-react'
import { getChecklistById } from '../pro/mandatsart-checklists'
import type { CaseDocument, ChecklistItem } from '../pro/types'
import { useMandantCase } from './useMandantCase'
import { mandantUploadForChecklistItem } from './mandant-store'
import {
  fetchChecklistChangeRequests,
  submitChecklistChangeRequest,
  uploadMandantDocument,
  type BackendChecklistChangeRequest,
  type ChecklistChangeAction,
} from './mandant-api'
import {
  listChecklistChangeRequests,
  saveChecklistChangeRequest,
  type ChecklistChangeRequest,
} from './checklist-change-store'
import type { MandantLang } from './mandant-i18n'

interface Props {
  mandantId: string
  backendToken: string | null
  lang: MandantLang
}

type ClientRequest = ChecklistChangeRequest | BackendChecklistChangeRequest
type ItemState = 'missing' | 'review' | 'approved' | 'rejected' | 'change_pending'

function activeDocs(docs: CaseDocument[], itemId: string) {
  return docs
    .filter(d => d.checklistItemId === itemId && !d.deletedAt)
    .sort((a, b) => String(a.uploadedAt).localeCompare(String(b.uploadedAt)))
}

function itemState(docs: CaseDocument[], itemId: string, requests: ClientRequest[]): ItemState {
  if (requests.some(r => r.status === 'pending' && r.checklistItemId === itemId && r.action === 'not_applicable')) return 'change_pending'
  const latest = activeDocs(docs, itemId).at(-1)
  if (!latest) return 'missing'
  if (latest.reviewStatus === 'approved') return 'approved'
  if (latest.reviewStatus === 'rejected') return 'rejected'
  return 'review'
}

const labels: Record<ItemState, { de: string; vi: string; cls: string }> = {
  missing: { de: 'FEHLT', vi: 'CÒN THIẾU', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  review: { de: 'WIRD GEPRÜFT', vi: 'ĐANG KIỂM TRA', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { de: 'BESTÄTIGT', vi: 'ĐÃ XÁC NHẬN', cls: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { de: 'BITTE ERNEUT', vi: 'VUI LÒNG NỘP LẠI', cls: 'bg-red-100 text-red-800 border-red-200' },
  change_pending: { de: 'ÄNDERUNG WIRD GEPRÜFT', vi: 'ĐANG KIỂM TRA THAY ĐỔI', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
}

export default function MandantCheckliste({ mandantId, backendToken, lang }: Props) {
  const { data: c, loading, error, reload } = useMandantCase(mandantId, backendToken)
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustText, setAdjustText] = useState('')

  useEffect(() => {
    if (!c) return
    if (!backendToken) {
      setRequests(listChecklistChangeRequests(c.id))
      return
    }
    fetchChecklistChangeRequests(backendToken).then(setRequests).catch(() => setRequests([]))
  }, [c, backendToken])

  async function sendChange(action: ChecklistChangeAction, checklistItemId?: string, message?: string) {
    if (!c) return
    try {
      const row = backendToken
        ? await submitChecklistChangeRequest(backendToken, { action, checklistItemId, message })
        : saveChecklistChangeRequest({ caseId: c.id, action, checklistItemId, message })
      setRequests(prev => [...prev, row])
      setNotice(lang === 'vi'
        ? 'Đã gửi cho văn phòng luật sư. Danh sách chính thức chỉ thay đổi sau khi được kiểm tra.'
        : 'An die Kanzlei gesendet. Die offizielle Liste ändert sich erst nach Prüfung.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : (lang === 'vi' ? 'Không gửi được.' : 'Senden fehlgeschlagen.'))
    }
  }

  async function upload(item: ChecklistItem, file: File) {
    if (!c) return
    setBusyItem(item.id)
    setNotice(null)
    try {
      if (backendToken) {
        await uploadMandantDocument(backendToken, file, item.id)
      } else {
        mandantUploadForChecklistItem(c.id, item.id, {
          originalName: file.name,
          internalName: `mandant_${item.id}_${new Date().toISOString().slice(0, 10)}_${file.name}`,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        })
      }
      setNotice(lang === 'vi'
        ? 'Đã nhận tài liệu. Văn phòng luật sư sẽ kiểm tra.'
        : 'Unterlage eingegangen. Die Kanzlei prüft sie jetzt.')
      reload()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : (lang === 'vi' ? 'Tải lên không thành công.' : 'Upload fehlgeschlagen.'))
    } finally {
      setBusyItem(null)
    }
  }

  if (loading) return <div className="py-16 text-center text-sm text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Đang tải…' : 'Wird geladen…'}</div>
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
  if (!c) return <div className="py-12 text-center text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Không tìm thấy hồ sơ.' : 'Keine Akte gefunden.'}</div>

  const checklist = c.mandatsartId ? getChecklistById(c.mandatsartId) : null
  if (!checklist) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{lang === 'vi' ? 'Văn phòng luật sư đang chuẩn bị danh sách tài liệu cho bạn.' : 'Die Kanzlei bereitet Ihre Unterlagenliste gerade vor.'}</div>
  }

  const required = checklist.requiredDocuments.filter(item => item.level === 'required')
  const docs = c.documents ?? []
  const states = new Map(required.map(item => [item.id, itemState(docs, item.id, requests)]))
  const approved = required.filter(i => states.get(i.id) === 'approved').length
  const inReview = required.filter(i => ['review', 'change_pending'].includes(states.get(i.id) ?? '')).length
  const open = required.length - approved - inReview
  const next = required.find(i => states.get(i.id) === 'rejected') ?? required.find(i => states.get(i.id) === 'missing')

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Hồ sơ của bạn' : 'Ihre Akte'}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{c.mandantName}</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Số hồ sơ' : 'Aktenzeichen'}: <span className="font-mono">{c.aktenzeichen}</span></p>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">{lang === 'vi' && checklist.titleVi ? checklist.titleVi : checklist.title}</p>
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${next ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Việc tiếp theo' : 'Ihr nächster Schritt'}</p>
        {next ? (
          <>
            <h2 className="mt-1 text-xl font-semibold">
              {states.get(next.id) === 'rejected'
                ? (lang === 'vi' ? 'Vui lòng tải lại: ' : 'Bitte erneut hochladen: ')
                : (lang === 'vi' ? 'Vui lòng tải lên: ' : 'Bitte hochladen: ')}
              {lang === 'vi' && next.labelVi ? next.labelVi : next.label}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Ảnh chụp rõ hoặc PDF là đủ. Sau đó văn phòng luật sư sẽ kiểm tra.' : 'Ein gut lesbares Foto oder PDF reicht. Danach prüft die Kanzlei.'}</p>
            <UploadButton item={next} lang={lang} busy={busyItem === next.id} onUpload={upload} primary />
          </>
        ) : (
          <>
            <h2 className="mt-1 text-xl font-semibold">{lang === 'vi' ? 'Hiện tại bạn không cần làm gì ✓' : 'Sie müssen gerade nichts tun ✓'}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Tất cả tài liệu cần thiết đã được nộp hoặc đang được kiểm tra.' : 'Alle benötigten Unterlagen sind eingegangen oder werden geprüft.'}</p>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Metric value={approved} label={lang === 'vi' ? 'đã xác nhận' : 'bestätigt'} />
        <Metric value={inReview} label={lang === 'vi' ? 'đang kiểm tra' : 'in Prüfung'} />
        <Metric value={open} label={lang === 'vi' ? 'còn mở' : 'noch offen'} />
      </section>

      {notice && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}</div>}

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-semibold">{lang === 'vi' ? 'Danh sách tài liệu' : 'Ihre Unterlagenliste'}</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Tải tài liệu lên hoặc báo cho chúng tôi nếu mục nào không phù hợp.' : 'Direkt hochladen oder sagen, wenn etwas nicht zu Ihrem Fall passt.'}</p>
        <div className="mt-3 divide-y divide-[var(--color-border)]">
          {required.map(item => {
            const state = states.get(item.id) ?? 'missing'
            const meta = labels[state]
            const latest = activeDocs(docs, item.id).at(-1)
            return (
              <div key={item.id} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{lang === 'vi' && item.labelVi ? item.labelVi : item.label}</h3>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${meta.cls}`}>{lang === 'vi' ? meta.vi : meta.de}</span>
                    </div>
                    {item.labelVi && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? `DE: ${item.label}` : `VI: ${item.labelVi}`}</p>}
                    {state === 'rejected' && latest?.reviewComment && <p className="mt-2 text-xs text-red-700">{latest.reviewComment}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(state === 'missing' || state === 'rejected') && <UploadButton item={item} lang={lang} busy={busyItem === item.id} onUpload={upload} />}
                    {state !== 'approved' && state !== 'change_pending' && (
                      <button
                        onClick={() => void sendChange('not_applicable', item.id, lang === 'vi' ? 'Mục này có thể không áp dụng cho trường hợp của tôi.' : 'Dieser Punkt passt möglicherweise nicht zu meinem Fall.')}
                        className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold hover:bg-slate-50"
                      >
                        {lang === 'vi' ? 'Không áp dụng' : 'Passt nicht'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <button onClick={() => setShowAdjust(v => !v)} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex items-center gap-2 font-semibold"><FilePlus2 className="h-4 w-4" />{lang === 'vi' ? 'Điều chỉnh danh sách' : 'Liste anpassen'}</span>
          <span>{showAdjust ? '−' : '+'}</span>
        </button>
        {showAdjust && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Thiếu một mục hoặc bạn muốn giải thích điều gì? Viết ngắn gọn. Văn phòng luật sư sẽ kiểm tra trước khi thay đổi danh sách chính thức.' : 'Fehlt etwas oder möchten Sie etwas erklären? Kurz schreiben. Die Kanzlei prüft es, bevor die offizielle Liste geändert wird.'}</p>
            <textarea value={adjustText} onChange={e => setAdjustText(e.target.value)} maxLength={1200} rows={3} className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm" placeholder={lang === 'vi' ? 'Ví dụ: Tôi đã ly hôn / tôi có thêm tài liệu này…' : 'Zum Beispiel: Ich bin geschieden / ich habe zusätzlich dieses Dokument…'} />
            <div className="flex flex-wrap gap-2">
              <button disabled={!adjustText.trim()} onClick={() => { void sendChange('add_document', undefined, adjustText.trim()); setAdjustText(''); setShowAdjust(false) }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 text-xs font-semibold text-white disabled:opacity-40"><FilePlus2 className="h-3.5 w-3.5" />{lang === 'vi' ? 'Gửi bổ sung' : 'Ergänzung senden'}</button>
              <button disabled={!adjustText.trim()} onClick={() => { void sendChange('question', undefined, adjustText.trim()); setAdjustText(''); setShowAdjust(false) }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold disabled:opacity-40"><MessageCircleQuestion className="h-3.5 w-3.5" />{lang === 'vi' ? 'Gửi câu hỏi' : 'Frage senden'}</button>
            </div>
          </div>
        )}
      </section>

      <p className="px-1 text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Yêu cầu thay đổi không tự động xóa tài liệu bắt buộc. Văn phòng luật sư kiểm tra và xác nhận.' : 'Änderungswünsche entfernen keine Pflichtunterlage automatisch. Die Kanzlei prüft und bestätigt.'}</p>
    </div>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-white p-3"><b className="block text-xl">{value}</b><span className="text-xs text-[var(--color-ink-muted)]">{label}</span></div>
}

function UploadButton({ item, lang, busy, onUpload, primary = false }: { item: ChecklistItem; lang: MandantLang; busy: boolean; onUpload: (item: ChecklistItem, file: File) => Promise<void>; primary?: boolean }) {
  return (
    <label className={primary
      ? 'mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-ink)] px-4 text-sm font-semibold text-white'
      : 'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-semibold hover:bg-slate-50'}>
      <UploadCloud className="h-4 w-4" />
      {busy ? (lang === 'vi' ? 'Đang tải…' : 'Upload…') : (lang === 'vi' ? 'Tải lên' : 'Upload')}
      <input className="hidden" type="file" accept="image/*,application/pdf" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void onUpload(item, file); e.currentTarget.value = '' }} />
    </label>
  )
}
