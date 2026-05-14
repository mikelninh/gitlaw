/**
 * MissingDocsReminder — Erinnerungstext für fehlende Unterlagen, DE + VI.
 *
 * Refa öffnet eine Akte, klickt "Erinnerung erstellen", sieht zwei editierbare
 * Textspalten (DE | VI). Jede Spalte hat einen Copy-Button und einen
 * "Als gesendet markieren"-Button, der einen Audit-Log-Eintrag schreibt.
 *
 * Modul A / Sprint 1 — Bao-Pilot. Voice: warm, höflich-direkt, kein Marketing-Deutsch.
 */

import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { MandantCase } from './types'
import { formatFehlendeUnterlagen } from './case-status'
import { getSettings, log } from './store'
import { getChecklistById } from './mandatsart-checklists'

interface Props {
  case: MandantCase
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Template-Rendering
// ---------------------------------------------------------------------------

function buildReminderDe(
  c: MandantCase,
  kanzleiName: string,
  anwaltName: string,
): string {
  const fristZeile = c.fristDatum
    ? `Bitte senden Sie diese bis spätestens ${new Date(c.fristDatum).toLocaleDateString('de-DE')} an uns.`
    : 'Bitte senden Sie diese zeitnah an uns.'

  const fehlendeUnterlagen = formatFehlendeUnterlagen(c, 'de')
  const liste = fehlendeUnterlagen.trim()
    ? fehlendeUnterlagen
    : '(keine Pflicht-Unterlagen offen)'

  return [
    `Sehr geehrte/r Frau/Herr ${c.mandantName},`,
    '',
    `in Ihrer Akte ${c.aktenzeichen} fehlen uns noch folgende Unterlagen, damit wir Ihren Antrag bearbeiten können:`,
    '',
    liste,
    '',
    fristZeile,
    '',
    'Vielen Dank für Ihre Mitarbeit.',
    '',
    `Mit freundlichen Grüßen`,
    anwaltName ? `${anwaltName}` : '',
    kanzleiName ? `${kanzleiName}` : '',
  ].filter(line => line !== undefined).join('\n').trimEnd()
}

function buildReminderVi(
  c: MandantCase,
  kanzleiName: string,
  anwaltName: string,
): string {
  // TODO: native review — bitte von einer vietnamesisch-muttersprachlichen Person prüfen lassen.
  const fristZeile = c.fristDatum
    ? `Vui lòng gửi các giấy tờ trên cho chúng tôi trước ngày ${new Date(c.fristDatum).toLocaleDateString('de-DE')}.`
    : 'Vui lòng gửi các giấy tờ trên cho chúng tôi trong thời gian sớm nhất.'

  const fehlendeUnterlagen = formatFehlendeUnterlagen(c, 'vi')
  const liste = fehlendeUnterlagen.trim()
    ? fehlendeUnterlagen
    : '(không có tài liệu bắt buộc còn thiếu)'

  return [
    // TODO: native review — anrede und schlusskformel auf Korrektheit prüfen.
    `Kính gửi Quý khách ${c.mandantName},`,
    '',
    `Trong hồ sơ ${c.aktenzeichen} của quý khách, chúng tôi vẫn còn thiếu các giấy tờ sau để có thể xử lý hồ sơ cho quý khách:`,
    '',
    liste,
    '',
    fristZeile,
    '',
    // TODO: native review — "Xin chân thành cảm ơn" ggf. durch regionalere Formulierung ersetzen.
    'Xin chân thành cảm ơn sự hợp tác của quý khách.',
    '',
    'Trân trọng,',
    anwaltName ? `${anwaltName}` : '',
    kanzleiName ? `${kanzleiName}` : '',
  ].filter(line => line !== undefined).join('\n').trimEnd()
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export default function MissingDocsReminder({ case: c, onClose }: Props) {
  const settings = getSettings()
  const checklist = c.mandatsartId ? getChecklistById(c.mandatsartId) : undefined

  const hasMissingDocs = checklist
    ? checklist.requiredDocuments.some(
        item => item.level === 'required' && (c.checklistStates ?? {})[item.id] !== 'received'
      )
    : false

  const initialDe = buildReminderDe(c, settings.name, settings.anwaltName)
  const initialVi = buildReminderVi(c, settings.name, settings.anwaltName)

  const [textDe, setTextDe] = useState(initialDe)
  const [textVi, setTextVi] = useState(initialVi)
  const [copiedDe, setCopiedDe] = useState(false)
  const [copiedVi, setCopiedVi] = useState(false)
  const [sentDe, setSentDe] = useState(false)
  const [sentVi, setSentVi] = useState(false)

  // Audit-Log: Erinnerung generiert (einmalig beim Öffnen)
  useEffect(() => {
    log(
      'reminder.generate',
      `${c.aktenzeichen} — ${c.mandantName} — ${hasMissingDocs ? 'Pflicht-Unterlagen fehlen' : 'keine offenen Unterlagen'}`,
      c.id,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function copy(text: string, lang: 'de' | 'vi') {
    navigator.clipboard.writeText(text).then(() => {
      if (lang === 'de') {
        setCopiedDe(true)
        setTimeout(() => setCopiedDe(false), 2000)
      } else {
        setCopiedVi(true)
        setTimeout(() => setCopiedVi(false), 2000)
      }
    })
  }

  function markSent(lang: 'de' | 'vi') {
    log(
      'reminder.sent',
      `${c.aktenzeichen} — ${c.mandantName} — Sprache: ${lang === 'de' ? 'Deutsch' : 'Tiếng Việt'}`,
      c.id,
    )
    if (lang === 'de') {
      setSentDe(true)
    } else {
      setSentVi(true)
    }
  }

  const missingCount = hasMissingDocs
    ? (c.checklistStates
        ? checklist!.requiredDocuments.filter(
            item => item.level === 'required' && (c.checklistStates ?? {})[item.id] !== 'received'
          ).length
        : checklist!.requiredDocuments.filter(item => item.level === 'required').length)
    : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-4xl sm:rounded-2xl border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold">Erinnerung: fehlende Unterlagen</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="font-mono text-xs text-[var(--color-gold)]">{c.aktenzeichen}</span>
              <span className="text-xs text-[var(--color-ink-muted)]">{c.mandantName}</span>
              {missingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800">
                  {missingCount} Unterlagen fehlen
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors shrink-0"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {!c.mandatsartId && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Dieser Akte ist keine Mandatsart zugeordnet. Bitte zuerst eine Mandatsart auswählen,
              damit die Checkliste ausgewertet werden kann.
            </div>
          )}

          {c.mandatsartId && !hasMissingDocs && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              Alle Pflicht-Unterlagen wurden bereits als erhalten markiert. Kein Reminder nötig.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DE-Spalte */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide">
                  Deutsch
                </span>
                {sentDe && (
                  <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                    Als gesendet markiert
                  </span>
                )}
              </div>
              <textarea
                className="w-full text-sm font-mono leading-relaxed border border-[var(--color-border)] rounded-lg p-3 resize-none bg-[var(--color-bg-alt)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                rows={14}
                value={textDe}
                onChange={e => setTextDe(e.target.value)}
                spellCheck
                lang="de"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copy(textDe, 'de')}
                  className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
                >
                  {copiedDe ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedDe ? 'Kopiert' : 'Kopieren'}
                </button>
                <button
                  onClick={() => markSent('de')}
                  disabled={sentDe}
                  className="inline-flex items-center gap-1.5 text-xs border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sentDe ? <Check className="w-3.5 h-3.5 text-green-600" /> : null}
                  {sentDe ? 'Gesendet' : 'Als gesendet markieren'}
                </button>
              </div>
            </div>

            {/* VI-Spalte */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide">
                  Tiếng Việt
                  <span className="ml-1.5 text-[10px] font-normal normal-case text-amber-600">
                    (Entwurf — native review ausstehend)
                  </span>
                </span>
                {sentVi && (
                  <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                    Als gesendet markiert
                  </span>
                )}
              </div>
              <textarea
                className="w-full text-sm font-mono leading-relaxed border border-[var(--color-border)] rounded-lg p-3 resize-none bg-[var(--color-bg-alt)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                rows={14}
                value={textVi}
                onChange={e => setTextVi(e.target.value)}
                spellCheck={false}
                lang="vi"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copy(textVi, 'vi')}
                  className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
                >
                  {copiedVi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedVi ? 'Kopiert' : 'Kopieren'}
                </button>
                <button
                  onClick={() => markSent('vi')}
                  disabled={sentVi}
                  className="inline-flex items-center gap-1.5 text-xs border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sentVi ? <Check className="w-3.5 h-3.5 text-green-600" /> : null}
                  {sentVi ? 'Gesendet' : 'Als gesendet markieren'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] shrink-0 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Text ist editierbar. "Als gesendet markieren" schreibt einen Audit-Log-Eintrag — kein echter Versand.
          </p>
          <button
            onClick={onClose}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
