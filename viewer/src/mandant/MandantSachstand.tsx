/**
 * Sachstand-Ansicht fuer das Mandanten-Portal.
 *
 * Kombiniert den frueheren Status-Tab (Notification-Banner, Timeline)
 * und den Sachstand-Tab (Klartext-Erklaerung, naechster Schritt).
 *
 * Backend-Modus: laedt Status vom Server via useMandantCase.
 * Demo-Modus: localStorage.
 */

import { useState } from 'react'
import { MessageSquare, Phone, Activity, Bell, AlertTriangle, ArrowRight } from 'lucide-react'
import { useMandantCase } from './useMandantCase'
import { CASE_STATUSES } from '../pro/case-status'
import { getSettings } from '../pro/store'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'

interface Props {
  mandantId: string
  backendToken: string | null
  lang: MandantLang
}

const COLOR_BG: Record<string, string> = {
  amber: 'bg-amber-50 border-amber-200',
  blue: 'bg-blue-50 border-blue-200',
  orange: 'bg-orange-50 border-orange-200',
  green: 'bg-green-50 border-green-200',
  gray: 'bg-slate-50 border-slate-200',
}

const COLOR_TITLE: Record<string, string> = {
  amber: 'text-amber-900',
  blue: 'text-blue-900',
  orange: 'text-orange-900',
  green: 'text-green-900',
  gray: 'text-slate-700',
}

const COLOR_DOT: Record<string, string> = {
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  orange: 'bg-orange-400',
  green: 'bg-green-500',
  gray: 'bg-slate-300',
}

// ---------------------------------------------------------------------------
// Naechster-Schritt-Hinweis pro Status (Mandant-facing, DE + VI)
// ---------------------------------------------------------------------------

interface NextStepHint {
  de: string
  vi: string
  // When set: show a CTA link label that points the Mandant to the Akte tab
  ctaDe?: string
  ctaVi?: string
  showAkteLink?: boolean
}

const NEXT_STEP: Record<string, NextStepHint> = {
  unterlagen_fehlen: {
    de: 'Bitte laden Sie die fehlenden Unterlagen hoch.',
    // TODO: VI-review native speaker
    vi: 'Vui lòng tải lên các tài liệu còn thiếu.',
    ctaDe: 'Zur Akte — Dokumente hochladen',
    // TODO: VI-review native speaker
    ctaVi: 'Đến hồ sơ — tải lên tài liệu',
    showAkteLink: true,
  },
  unterlagen_in_pruefung: {
    de: 'Wir prüfen Ihre Unterlagen — keine Aktion nötig.',
    // TODO: VI-review native speaker
    vi: 'Chúng tôi đang kiểm tra tài liệu — bạn không cần làm gì thêm.',
  },
  antrag_in_vorbereitung: {
    de: 'Wir bereiten Ihren Antrag vor — keine Aktion nötig.',
    // TODO: VI-review native speaker
    vi: 'Chúng tôi đang chuẩn bị đơn — bạn không cần làm gì thêm.',
  },
  antrag_eingereicht: {
    de: 'Ihr Antrag wurde eingereicht — wir warten gemeinsam auf die Behörde.',
    // TODO: VI-review native speaker
    vi: 'Đơn đã được nộp — chúng ta cùng chờ phản hồi từ cơ quan.',
  },
  behoerdliche_rueckmeldung_ausstehend: {
    de: 'Wir beobachten den Vorgang und melden uns, sobald Neuigkeiten vorliegen.',
    // TODO: VI-review native speaker
    vi: 'Chúng tôi theo dõi hồ sơ và sẽ liên hệ ngay khi có thông tin mới.',
  },
  behoerde_nachforderung: {
    de: 'Die Behörde hat weitere Unterlagen angefordert — wir informieren Sie, was benötigt wird.',
    // TODO: VI-review native speaker
    vi: 'Cơ quan yêu cầu thêm tài liệu — chúng tôi sẽ cho bạn biết cần cung cấp gì.',
  },
  termin_steht_aus: {
    de: 'Ein Termin oder eine Entscheidung steht aus — wir halten Sie auf dem Laufenden.',
    // TODO: VI-review native speaker
    vi: 'Đang chờ lịch hẹn hoặc quyết định — chúng tôi sẽ cập nhật ngay khi có.',
  },
  verfahren_abgeschlossen: {
    de: 'Ihr Verfahren ist abgeschlossen. Bei weiteren Fragen wenden Sie sich bitte an unsere Kanzlei.',
    // TODO: VI-review native speaker
    vi: 'Hồ sơ của bạn đã hoàn tất. Nếu có câu hỏi, vui lòng liên hệ văn phòng chúng tôi.',
  },
}

export default function MandantSachstand({ mandantId, backendToken, lang: langProp }: Props) {
  const { data: caseData, loading, error, reload } = useMandantCase(mandantId, backendToken)
  const lang = langProp
  const t = getMandantStrings(lang)

  const [notifDismissed, setNotifDismissed] = useState(false)

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-ink-muted)] text-sm">
        {lang === 'vi' ? 'Đang tải ...' : 'Lade Sachstand...'}
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
          {lang === 'vi' ? 'Thử lại' : 'Erneut versuchen'}
        </button>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="py-12 text-center text-[var(--color-ink-muted)] text-sm">
        {t.sachstandNoCase}
      </div>
    )
  }

  const currentStatusId = caseData.caseStatus ?? 'unterlagen_fehlen'
  const currentStatus = CASE_STATUSES.find(s => s.id === currentStatusId)
  const currentIdx = CASE_STATUSES.findIndex(s => s.id === currentStatusId)

  const hasNewStatus = !notifDismissed && currentStatusId !== 'unterlagen_fehlen'

  const mandantText =
    lang === 'vi' && currentStatus?.mandantTextVi
      ? currentStatus.mandantTextVi
      : currentStatus?.mandantTextDe ?? ''

  const statusLabel =
    lang === 'vi' && currentStatus?.labelVi
      ? currentStatus.labelVi
      : currentStatus?.label ?? t.unknownStatus

  const colorBg = COLOR_BG[currentStatus?.color ?? 'gray'] ?? COLOR_BG.gray
  const colorTitle = COLOR_TITLE[currentStatus?.color ?? 'gray'] ?? COLOR_TITLE.gray

  const lastUpdated = caseData.updatedAt
    ? new Date(caseData.updatedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE')
    : null

  // Kanzlei-Kontakt nur im Demo-Modus aus lokalem Store laden
  const settings = backendToken ? null : getSettings()
  const contactLine = settings?.contact ?? null

  // Naechster-Schritt-Hinweis fuer diesen Status
  const nextStep = NEXT_STEP[currentStatusId]

  return (
    <div className="space-y-5">
      {/* Notification-Banner (aus ex-MandantStatus) */}
      {hasNewStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {lang === 'vi'
                  ? 'Có cập nhật mới về hồ sơ của bạn.'
                  : 'Status Ihrer Akte wurde aktualisiert.'}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {lang === 'vi'
                  ? `Tình trạng hiện tại: ${currentStatus?.labelVi ?? currentStatus?.label ?? t.unknownStatus}`
                  : `Aktueller Status: ${currentStatus?.label ?? t.unknownStatus}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifDismissed(true)}
            className="text-blue-600 hover:text-blue-800 text-xs shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {/* Aktueller Status-Titel */}
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">
          {t.sachstandTitle}
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">
          {t.sachstandSubtitle}
        </p>
      </div>

      {/* Status-Karte mit Klartext-Erklaerung */}
      {currentStatus && (
        <div className={`rounded-xl border p-5 ${colorBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 opacity-60" style={{ color: 'inherit' }} />
            <p className={`text-xs font-semibold uppercase tracking-wider ${colorTitle} opacity-70`}>
              {statusLabel}
            </p>
          </div>
          <p className={`text-base leading-relaxed ${colorTitle}`}>
            {mandantText}
          </p>
          {lastUpdated && (
            <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
              {t.sachstandLastUpdated}: {lastUpdated}
            </p>
          )}
        </div>
      )}

      {/* Naechster-Schritt-Hinweis */}
      {nextStep && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] mb-1.5">
            {lang === 'vi' ? 'Bước tiếp theo' : 'Ihr nächster Schritt'}
          </p>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {lang === 'vi' ? nextStep.vi : nextStep.de}
          </p>
          {nextStep.showAkteLink && (
            <a
              href="#/mandant/akte"
              className="inline-flex items-center gap-1 mt-2 text-sm text-[var(--color-gold)] hover:underline"
            >
              {lang === 'vi' ? nextStep.ctaVi : nextStep.ctaDe}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Status-Verlauf-Timeline (aus ex-MandantStatus) */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">{t.statusTitle}</h2>
        {CASE_STATUSES.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">{t.statusHistoryEmpty}</p>
        ) : (
          <ol className="relative space-y-0">
            {CASE_STATUSES.map((s, idx) => {
              const isPast = idx < currentIdx
              const isCurrent = idx === currentIdx
              const isFuture = idx > currentIdx

              const dotColor = isCurrent
                ? COLOR_DOT[s.color] ?? 'bg-slate-400'
                : isPast
                  ? 'bg-green-400'
                  : 'bg-slate-200'

              const labelText = lang === 'vi' && s.labelVi ? s.labelVi : s.label
              const textColor = isFuture
                ? 'text-[var(--color-ink-muted)]'
                : 'text-[var(--color-ink)]'

              return (
                <li key={s.id} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                  {/* Verbindungslinie */}
                  {idx < CASE_STATUSES.length - 1 && (
                    <span
                      className={`absolute left-[7px] top-4 w-0.5 h-full ${isPast ? 'bg-green-300' : 'bg-slate-200'}`}
                    />
                  )}
                  {/* Dot */}
                  <span
                    className={`mt-1 w-3.5 h-3.5 rounded-full shrink-0 ${dotColor} ${
                      isCurrent ? 'ring-2 ring-offset-1 ring-current' : ''
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${textColor}`}>
                      {labelText}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-gold)]">
                          {t.statusNotificationBadge}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Kontakt-Hinweis */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 flex items-start gap-3">
        <MessageSquare className="w-4 h-4 text-[var(--color-ink-muted)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--color-ink-soft)]">
          <p>{t.sachstandContactHint}</p>
          {contactLine && (
            <div className="mt-2 flex items-center gap-1.5 text-[var(--color-ink)]">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{contactLine}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
