/**
 * ProChecklistPanel — Checkliste der Pflicht-Dokumente im Akten-Detail.
 *
 * Rendert pro requiredDocument eine ProChecklistCard. Primär Desktop-UX
 * für Bao/Refa beim Mandant-Termin am Schalter.
 */

import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { getChecklistById } from './mandatsart-checklists'
import ProChecklistCard from './ProChecklistCard'
import { computeItemStatus } from './checklist-status'
import type { CaseDocument, MandantCase } from './types'

interface Props {
  case: MandantCase
  onUploaded: (newDoc: CaseDocument) => void
  onReviewed?: () => void
  onSelectDocument?: (docId: string) => void
}

export default function ProChecklistPanel({ case: c, onUploaded, onReviewed, onSelectDocument }: Props) {
  if (!c.mandatsartId) return null

  const checklist = getChecklistById(c.mandatsartId)
  if (!checklist) return null

  const required = checklist.requiredDocuments.filter(i => i.level === 'required')
  if (required.length === 0) return null

  const statuses = required.map(item => computeItemStatus(c, item))
  const completedCount = statuses.filter(s => s === 'approved').length
  const pendingCount = statuses.filter(s => s === 'pending').length
  const allDone = completedCount === required.length

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)] ${allDone ? 'border-green-200' : ''}`}>
        <div>
          <h2 className="font-semibold">Checkliste</h2>
          <p className={`text-sm mt-0.5 ${allDone ? 'text-green-700' : 'text-[var(--color-ink-muted)]'}`}>
            {completedCount} von {required.length} Dokumenten vorhanden
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {pendingCount} wartet auf Bestätigung
              </span>
            )}
          </p>
        </div>
        {allDone && (
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        )}
      </div>

      {/* Fortschrittsbalken */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            allDone
              ? 'bg-green-500'
              : completedCount / required.length > 0.5
                ? 'bg-amber-400'
                : 'bg-red-400'
          }`}
          style={{ width: `${Math.round((completedCount / required.length) * 100)}%` }}
        />
      </div>

      {/* Cards pro Pflicht-Item */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {required.map(item => (
          <ProChecklistCard
            key={item.id}
            case={c}
            item={item}
            onUploaded={onUploaded}
            onReviewed={onReviewed}
            onSelectDocument={onSelectDocument}
          />
        ))}
      </div>
    </section>
  )
}
