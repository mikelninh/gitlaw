/**
 * TodayWidget — vier Sektionen mit sofortigem Handlungsbedarf.
 *
 * 0. Eilanträge gegen Abschiebung (rot, immer zuerst)
 * 1. Fristen in den nächsten 14 Tagen
 * 2. Behörde wartet auf uns
 * 3. Pflicht-Unterlagen fehlen
 *
 * Voice: respektvoll-warm, kein Marketing-Deutsch.
 */

import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listCases } from './store'
import { getChecklistById } from './mandatsart-checklists'
import type { MandantCase } from './types'

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function countMissingRequired(c: MandantCase): number {
  if (!c.mandatsartId) return 0
  const checklist = getChecklistById(c.mandatsartId)
  if (!checklist) return 0
  const states = c.checklistStates ?? {}
  return checklist.requiredDocuments.filter(
    item => item.level === 'required' && states[item.id] !== 'received'
  ).length
}

interface SectionProps {
  title: string
  count: number
  children: React.ReactNode
  tone?: 'red' | 'amber' | 'default'
}

function Section({ title, count, children, tone = 'default' }: SectionProps) {
  const headerColors = {
    red: 'text-red-800',
    amber: 'text-amber-800',
    default: 'text-[var(--color-ink)]',
  }
  const badgeColors = {
    red: 'bg-red-100 text-red-800 border-red-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    default: 'bg-slate-100 text-slate-700 border-slate-300',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className={`text-sm font-semibold ${headerColors[tone]}`}>{title}</h3>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeColors[tone]}`}>
          {count}
        </span>
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

interface RowProps {
  caseId: string
  aktenzeichen: string
  mandantName: string
  hint: string
  hintTone?: 'red' | 'amber' | 'default'
  onClick: () => void
}

function Row({ aktenzeichen, mandantName, hint, hintTone = 'default', onClick }: RowProps) {
  const hintColors = {
    red: 'text-red-700',
    amber: 'text-amber-700',
    default: 'text-[var(--color-ink-muted)]',
  }

  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 hover:border-[var(--color-gold)] transition-colors"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-xs text-[var(--color-gold)]">{aktenzeichen}</span>
          <span className="text-sm font-medium text-[var(--color-ink)] truncate">{mandantName}</span>
        </div>
        <p className={`text-xs mt-0.5 ${hintColors[hintTone]}`}>{hint}</p>
      </button>
    </li>
  )
}

export default function TodayWidget() {
  const navigate = useNavigate()
  const cases = listCases()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)

  // Sektion 0: Eilanträge gegen Abschiebung
  const eilantragCases = cases.filter(
    c =>
      c.mandatsartId === 'eilantrag-abschiebung' &&
      c.caseStatus !== 'verfahren_abgeschlossen'
  )

  // Sektion 1: Fristen ≤ 14 Tage
  const fristCases = cases
    .filter(c => {
      if (!c.fristDatum) return false
      const frist = new Date(c.fristDatum)
      frist.setHours(0, 0, 0, 0)
      return frist <= in14Days
    })
    .map(c => ({ c, days: daysUntil(c.fristDatum!) }))
    .sort((a, b) => a.days - b.days)

  // Sektion 2: Behörde wartet auf uns
  const behoerdeCases = cases.filter(
    c =>
      c.caseStatus === 'behoerde_nachforderung' ||
      c.caseStatus === 'unterlagen_fehlen'
  )

  // Sektion 3: Pflicht-Unterlagen fehlen (nur wenn Mandatsart gesetzt)
  const missingDocCases = cases
    .filter(c => c.mandatsartId)
    .map(c => ({ c, missing: countMissingRequired(c) }))
    .filter(({ missing }) => missing > 0)

  const allEmpty =
    eilantragCases.length === 0 &&
    fristCases.length === 0 &&
    behoerdeCases.length === 0 &&
    missingDocCases.length === 0

  if (allEmpty) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-sm text-green-800">
        Alles im Griff — heute kein dringender Handlungsbedarf.
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-5">
      <h2 className="font-semibold">Heute zu erledigen</h2>

      {eilantragCases.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-700 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-800">Eilantrag — sofort Aufmerksamkeit</p>
              <p className="text-xs text-red-700 mt-0.5">
                7-Tage-Frist. Diese Akten haben Priorität vor allem anderen.
              </p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {eilantragCases.map(c => {
              const fristHint = c.fristDatum
                ? (() => {
                    const days = daysUntil(c.fristDatum!)
                    if (days < 0) return `Frist seit ${-days} Tag${-days === 1 ? '' : 'en'} abgelaufen`
                    if (days === 0) return 'Frist läuft heute ab'
                    return `Frist in ${days} Tag${days === 1 ? '' : 'en'}`
                  })()
                : 'Frist nicht gesetzt'
              return (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/pro/akten/${c.id}`)}
                    className="w-full text-left rounded-lg border border-red-200 bg-white px-3 py-2.5 hover:border-red-400 transition-colors"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-xs text-red-700">{c.aktenzeichen}</span>
                      <span className="text-sm font-medium text-[var(--color-ink)] truncate">{c.mandantName}</span>
                    </div>
                    <p className="text-xs mt-0.5 text-red-700">{fristHint}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {fristCases.length > 0 && (
        <Section
          title="Frist in den nächsten 14 Tagen"
          count={fristCases.length}
          tone={fristCases.some(({ days }) => days <= 0) ? 'red' : 'amber'}
        >
          {fristCases.map(({ c, days }) => {
            const hint =
              days < 0
                ? `Frist seit ${-days} Tag${-days === 1 ? '' : 'en'} abgelaufen`
                : days === 0
                  ? 'Frist läuft heute ab'
                  : `Frist in ${days} Tag${days === 1 ? '' : 'en'}`
            const tone: 'red' | 'amber' | 'default' =
              days <= 0 ? 'red' : days <= 3 ? 'amber' : 'default'
            return (
              <Row
                key={c.id}
                caseId={c.id}
                aktenzeichen={c.aktenzeichen}
                mandantName={c.mandantName}
                hint={hint}
                hintTone={tone}
                onClick={() => navigate(`/pro/akten/${c.id}`)}
              />
            )
          })}
        </Section>
      )}

      {behoerdeCases.length > 0 && (
        <Section title="Behörde wartet auf uns" count={behoerdeCases.length} tone="amber">
          {behoerdeCases.map(c => {
            const hint =
              c.caseStatus === 'behoerde_nachforderung'
                ? 'Behörde hat Nachforderung gestellt'
                : 'Unterlagen fehlen noch'
            return (
              <Row
                key={c.id}
                caseId={c.id}
                aktenzeichen={c.aktenzeichen}
                mandantName={c.mandantName}
                hint={hint}
                hintTone="amber"
                onClick={() => navigate(`/pro/akten/${c.id}`)}
              />
            )
          })}
        </Section>
      )}

      {missingDocCases.length > 0 && (
        <Section title="Pflicht-Unterlagen fehlen" count={missingDocCases.length}>
          {missingDocCases.map(({ c, missing }) => (
            <Row
              key={c.id}
              caseId={c.id}
              aktenzeichen={c.aktenzeichen}
              mandantName={c.mandantName}
              hint={`${missing} Pflicht-Unterlag${missing === 1 ? 'e fehlt' : 'en fehlen'}`}
              onClick={() => navigate(`/pro/akten/${c.id}`)}
            />
          ))}
        </Section>
      )}
    </div>
  )
}
