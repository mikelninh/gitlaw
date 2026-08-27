import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FilePlus2, MessageCircleQuestion, UploadCloud } from 'lucide-react'
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
  const rows = activeDocs(docs, itemId)
  const latest = rows.at(-1)
  if (!latest) return 'missing'
  if (latest.reviewStatus === 'approved') return 'approved'
  if (latest.reviewStatus === 'rejected') return 'rejected'
  return 'review'
}

export default function MandantCheckliste({ mandantId, backendToken, lang }: Props) {
  const { data: c, loading, error, reload } = useMandantCase(mandantId, backendToken)
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addText, setAddText] = useState('')

  useEffect(() => {
    if (!c) return
    if (!backendToken) {
      setRequests(listChecklistChangeRequests(c.id))
      return
    }
    fetchChecklistChangeRequests(backendToken)
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [c?.id, backendToken])

  const checklist = c?.mandatsartId ? getChecklistById(c.mandatsartId) : null
  const items = useMemo(() => checklist?.requiredDocuments ?? [], [checklist])
  const required = items.filter(i => i.level === 'required')
  const docs = c?.documents ?? []

  async function sendChange(action: ChecklistChangeAction, checklistItemId?: string, message?: string) {
    if (!c) return
    try {
      const row = backendToken
        ? await submitChecklistChangeRequest(backendToken, { action, checklistItemId, message })
        : saveChecklistChangeRequest({ caseId: c.id, action, checklistItemId, message })
      setRequests(prev => [...prev, row])
      setNotice(lang === 'vi'
        ? 'Đã gửi cho văn phòng luật sư. Danh sách chỉ thay đổi sau khi được kiểm tra.'
        : 'An die Kanzlei gesendet. Die Liste ändert sich erst nach Prüfung.')
      setTimeout(() => setNotice(null), 5000)
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
      setNotice(lang === 'vi' ? 'Đã nhận tài liệu. Văn phòng luật sư sẽ kiểm tra.' : 'Unterlage eingegangen. Die Kanzlei prüft sie jetzt.')
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
  if (!checklist) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{lang === 'vi' ? 'Văn phòng luật sư đang chuẩn bị danh sách tài liệu cho bạn.' : 'Die Kanzlei bereitet Ihre Unterlagenliste gerade vor.'}</div>

  const states = new Map(required.map(item => [item.id, itemState(docs, item.id, requests)]))
  const approved = required.filter(i => states.get(i.id) === 'approved').length
  const inReview = required.filter(i => states.get(i.id) === 'review' || states.get(i.id) === 'change_pending').length
  const open = required.length - approved - inReview
  const next = required.find(i => states.get(i.id) === 'rejected') ?? required.find(i => states.get(i.id) === 'missing')

  const stateLabel: Record<ItemState, { de: string; vi: string; cls: string }> = {
    missing: { de: 'FEHLT', vi: 'CÒN THIẾU', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    review: { de: 'WIRD GEPRÜFT', vi: 'ĐANG KIỂM TRA', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    approved: { de: 'BESTÄTIGT', vi: 'ĐÃ XÁC NHẬN', cls: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { de: 'BITTE ERNEUT', vi: 'VUI LÒNG NỘP LẠI', cls: 'bg-red-100 text-red-800 border-red-200' },
    change_pending: { de: 'ÄNDERUNG WIRD GEPRÜFT', vi: 'ĐANG KIỂM TRA THAY ĐỔI', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6">
        <div className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Hồ sơ của bạn' : 'Ihre Akte'}</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">{c.mandantName}</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Số hồ sơ' : 'Aktenzeichen'}: <span className="font-mono">{c.aktenzeichen}</span></p>
          </div>
          <div className="text-xs text-[var(--color-ink-muted)]">{checklist.titleVi && lang === 'vi' ? checklist.titleVi : checklist.title}</div>
        </div>
      </section>

      <section className={`rounded-2xl border p-5 ${next ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Việc tiếp theo' : 'Ihr nächster Schritt'}</div>
        {next ? (
          <>
            <h2 className="mt-1 text-xl font-semibold">{states.get(next.id) === 'rejected' ? (lang === 'vi' ? 'Vui lòng tải lại:' : 'Bitte erneut hochladen:') : (lang === 'vi' ? 'Vui lòng tải lên:' : 'Bitte hochladen:')} {lang === 'vi' && next.labelVi ? next.labelVi : next.label}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Ảnh chụp rõ hoặc PDF là đủ. Sau đó văn phòng luật sư sẽ kiểm tra.' : 'Ein gut lesbares Foto oder PDF reicht. Danach prüft die Kanzlei.'}</p>
            <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-ink)] px-4 text-sm font-semibold text-white">
              <UploadCloud className="h-4 w-4" />
              {busyItem === next.id ? (lang === 'vi' ? 'Đang tải…' : 'Wird hochgeladen…') : (lang === 'vi' ? 'Tải lên ngay' : 'Jetzt hochladen')}
              <input className="hidden" type="file" accept="image/*,application/pdf" disabled={busyItem === next.id} onChange={e => { const f=e.target.files?.[0]; if(f) void upload(next,f); e.currentTarget.value='' }} />
            </label>
          </>
        ) : (
          <>
            <h2 className="mt-1 text-xl font-semibold">{lang === 'vi' ? 'Hiện tại bạn không cần làm gì ✓' : 'Sie müssen gerade nichts tun ✓'}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Tất cả tài liệu cần thiết đã được nộp hoặc đang được kiểm tra.' : 'Alle benötigten Unterlagen sind eingegangen oder werden gerade geprüft.'}</p>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-3"><b className="block text-xl">{approved}</b><span className="text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'đã xác nhận' : 'bestätigt'}</span></div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-3"><b className="block text-xl">{inReview}</b><span className="text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'đang kiểm tra' : 'in Prüfung'}</span></div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-3"><b className="block text-xl">{open}</b><span className="text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'còn mở' : 'noch offen'}</span></div>
      </section>

      {notice && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}</div>}

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{lang === 'vi' ? 'Danh sách tài liệu' : 'Ihre Unterlagenliste'}</h2>
            <p className="text-xs text-[var(--color-ink-muted)]">{lang === 'vi' ? 'Bạn có thể tải lên hoặc báo cho chúng tôi nếu mục nào không phù hợp.' : 'Sie können direkt hochladen oder sagen, wenn etwas nicht zu Ihrem Fall passt.'}</p>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {required.map(item => {
            const state = states.get(item.id) ?? 'missing'
            const meta = stateLabel[state]
            const latest = activeDocs(docs, item.id).at(-1)
            return (
              <div key={item.id} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{lang === 'vi' && item.labelVi ? item.labelVi : item.label}</h3>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${meta.cls}`}>{lang === 'vi' ? meta.vi : meta.de}</span>
                    </div>
                    {lang === 'vi' && item.labelVi && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">DE: {item.label}</p>}
                    {lang === 'de' && item.labelVi && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">VI: {item.labelVi}</p>}
                    {state === 'rejected' && latest?.reviewComment && <p className="mt-2 text-xs text-red-700">{latest.reviewComment}</p>}
                    {state === 'change_pending' && <p className="mt-2 text-xs text-violet-700">{lang === 'vi' ? 'Văn phòng luật sư đang kiểm tra yêu cầu thay đổi của bạn.' : 'Die Kanzlei prüft Ihren Änderungswunsch.'}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(state === 'missing' || state === 'rejected') && (
                      <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-semibold hover:bg-slate-50">
                        <UploadCloud className="h-3.5 w-3.5" /> {lang === 'vi' ? 'Tải lên' : 'Upload'}
                        <input className="hidden" type="file" accept="image/*,application/pdf" disabled={busyItem === item.id} onChange={e => { const f=e.target.files?.[0]; if(f) void upload(item,f); e.currentTarget.value='' }} />
                      </label>
                    )}
                    {state !== 'approved' && state !== 'change_pending' && (
                      <button onClick={() => void sendChange('not_applicable', item.id, lang === 'vi' ? 'Mục này có thể không áp dụng cho trường hợp của tôi.' : 'Dieser Punkt passt möglicherweise nicht zu meinem Fall.')} className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold hover:bg-slate-50">
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

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <button onClick={() => setShowAdd(v => !v)} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex items-center gap-2 font-semibold"><FilePlus2 className="h-4 w-4" />{lang === 'vi' ? 'Điều chỉnh danh sách' : 'Liste anpassen'}</span>
          <span className="text-xs text-[var(--color-ink-muted)]">{showAdd ? '−' : '+'}</span>
        </button>
        {showAdd && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-ink-soft)]">{lang === 'vi' ? 'Thiếu một tài liệu trong danh sách hoặc bạn muốn giải thích điều gì? Hãy viết ngắn gọn. Văn phòng luật sư sẽ kiểm tra trước khi thay đổi danh sách chính thức.' : 'Fehlt etwas in der Liste oder möchten Sie etwas erklären? Schreiben Sie es kurz. Die Kanzlei prüft es, bevor die offizielle Liste geändert wird.'}</p>
            <textarea value={addText} onChange={e => setAddText(e.target.value)} maxLength={1200} rows={3} className="w-full rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm outline-none focus:border-[var(--color-gold)]" placeholder={lang === 'vi' ? 'Ví dụ: Tôi đã ly hôn / tôi có thêm giấy tờ này…' : 'Zum Beispiel: Ich bin geschieden / ich habe zusätzlich dieses Dokument…'} />
            <div className="flex flex-wrap gap-2">
              <button disabled={!addText.trim()} onClick={() => { void sendChange('add_document', undefined, addText.trim()); setAddText(''); setShowAdd(false) }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 text-xs font-semibold text-white disabled:opacity-40"><FilePlus2 className="h-3.5 w-3.5" />{lang === 'vi' ? 'Gửi bổ sung' : 'Ergänzung senden'}</button>
              <button disabled={!addText.trim()} onClick={() => { void sendChange('question', undefined, addText.trim()); setAddText(''); setShowAdd(false) }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold disabled:opacity-40"><MessageCircleQuestion className="h-3.5 w-3.5" />{lang === 'vi' ? 'Gửi câu hỏi' : 'Frage senden'}</button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-slate-50 p-3 text-xs text-[var(--color-ink-muted)]">
        <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{lang === 'vi' ? 'Quan trọng: yêu cầu thay đổi không tự động xóa tài liệu bắt buộc. Văn phòng luật sư kiểm tra và xác nhận thay đổi.' : 'Wichtig: Änderungswünsche entfernen keine Pflichtunterlage automatisch. Die Kanzlei prüft und bestätigt Änderungen.'}</div>
      </section>
    </div>
  )
}
