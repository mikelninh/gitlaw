/**
 * Status-Verlauf fuer den Mandanten.
 *
 * Zeigt den aktuellen Status als Timeline.
 * Backend-Modus: laedt Status vom Server via useMandantCase.
 * Demo-Modus: localStorage.
 */

import { useState } from 'react'
import { Activity, Bell, AlertTriangle } from 'lucide-react'
import { useMandantCase } from './useMandantCase'
import { CASE_STATUSES } from '../pro/case-status'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'

interface Props {
  mandantId: string
  backendToken: string | null
  lang: MandantLang
}

const COLOR_RING: Record<string, string> = {
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  orange: 'bg-orange-400',
  green: 'bg-green-500',
  gray: 'bg-slate-300',
}

export default function MandantStatus({ mandantId, backendToken, lang: langProp }: Props) {
  const { data: caseData, loading, error, reload } = useMandantCase(mandantId, backendToken)
  const lang = langProp
  const t = getMandantStrings(lang)

  const [notifDismissed, setNotifDismissed] = useState(false)

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-ink-muted)] text-sm">
        {lang === 'vi' ? 'Dang tai...' : 'Lade Status...'}
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
      <div className="py-12 text-center text-[var(--color-ink-muted)] text-sm">
        {t.akteEmpty}
      </div>
    )
  }

  const currentStatusId = caseData.caseStatus ?? 'unterlagen_fehlen'
  const hasNewStatus = !notifDismissed && currentStatusId !== 'unterlagen_fehlen'

  const currentStatus = CASE_STATUSES.find(s => s.id === currentStatusId)
  const currentIdx = CASE_STATUSES.findIndex(s => s.id === currentStatusId)

  return (
    <div className="space-y-6">
      {/* Notification-Banner */}
      {hasNewStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {lang === 'vi' ? 'Co cap nhat moi ve ho so cua ban.' : 'Status Ihrer Akte wurde aktualisiert.'}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {lang === 'vi'
                  ? `Tinh trang hien tai: ${currentStatus?.labelVi ?? currentStatus?.label ?? t.unknownStatus}`
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

      {/* Aktueller Status gross */}
      {currentStatus && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[var(--color-gold)]" />
            <h1 className="text-sm font-semibold">{t.statusTitle}</h1>
          </div>
          <p className="text-xl font-semibold mt-3">
            {lang === 'vi' && currentStatus.labelVi ? currentStatus.labelVi : currentStatus.label}
          </p>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {currentStatus.internalDescription}
          </p>
        </div>
      )}

      {/* Timeline */}
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
                ? COLOR_RING[s.color] ?? 'bg-slate-400'
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
                  <span className={`mt-1 w-3.5 h-3.5 rounded-full shrink-0 ${dotColor} ${isCurrent ? 'ring-2 ring-offset-1 ring-current' : ''}`} />
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
    </div>
  )
}
