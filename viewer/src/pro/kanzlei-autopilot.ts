import type { MandantCase, ResearchQuery } from './types'
import { getChecklistById } from './mandatsart-checklists'

export type AutopilotSeverity = 'critical' | 'review' | 'team' | 'automatic'

export interface AutopilotItem {
  id: string
  caseId: string
  caseLabel: string
  severity: AutopilotSeverity
  type:
    | 'deadline_review'
    | 'research_review'
    | 'document_review'
    | 'queue_ocr'
    | 'prepare_missing_document_request'
    | 'open_team_task'
  title: string
  detail: string
  dueDate?: string
}

export interface KanzleiAutopilotSnapshot {
  activeCases: number
  baoAttention: AutopilotItem[]
  teamQueue: AutopilotItem[]
  automaticQueue: AutopilotItem[]
  waitingCases: number
  unresolvedDocuments: number
  unreviewedResearch: number
  deadlinesWithin14Days: number
  generatedAt: string
}

function daysUntil(date: string, now: Date): number | null {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000)
}

function caseLabel(c: MandantCase): string {
  return `${c.aktenzeichen || 'ohne AZ'} · ${c.mandantName || 'Mandant:in'}`
}

export function buildKanzleiAutopilotSnapshot(
  cases: MandantCase[],
  research: ResearchQuery[],
  now = new Date(),
): KanzleiAutopilotSnapshot {
  const active = cases.filter(c => c.status === 'aktiv')
  const baoAttention: AutopilotItem[] = []
  const teamQueue: AutopilotItem[] = []
  const automaticQueue: AutopilotItem[] = []
  let unresolvedDocuments = 0
  let deadlinesWithin14Days = 0

  for (const c of active) {
    const label = caseLabel(c)

    if (c.fristDatum) {
      const days = daysUntil(c.fristDatum, now)
      if (days !== null && days <= 14) {
        deadlinesWithin14Days++
        baoAttention.push({
          id: `${c.id}:deadline:${c.fristDatum}`,
          caseId: c.id,
          caseLabel: label,
          severity: days <= 3 ? 'critical' : 'review',
          type: 'deadline_review',
          title: days < 0 ? 'Fristdatum überschritten — sofort prüfen' : `Frist in ${days} Tag${days === 1 ? '' : 'en'} prüfen`,
          detail: c.fristBezeichnung || 'Fristbezeichnung fehlt — Quelle und Bedeutung anwaltlich prüfen.',
          dueDate: c.fristDatum,
        })
      }
    }

    for (const doc of c.documents || []) {
      if (doc.deletedAt) continue
      if (doc.uploadedBy === 'mandant' && (doc.reviewStatus || 'pending') === 'pending') {
        unresolvedDocuments++
        teamQueue.push({
          id: `${c.id}:doc-review:${doc.id}`,
          caseId: c.id,
          caseLabel: label,
          severity: 'team',
          type: 'document_review',
          title: 'Dokument prüfen',
          detail: doc.internalName || doc.originalName,
        })
      }
      const hasOcrJob = (c.documentJobs || []).some(j => j.type === 'ocr' && (j.documentId === doc.id || j.attachmentInternalName === doc.internalName))
      if (!doc.ocrText && !hasOcrJob) {
        automaticQueue.push({
          id: `${c.id}:ocr:${doc.id}`,
          caseId: c.id,
          caseLabel: label,
          severity: 'automatic',
          type: 'queue_ocr',
          title: 'OCR vorbereiten',
          detail: doc.internalName || doc.originalName,
        })
      }
    }

    if (c.mandatsartId) {
      const checklist = getChecklistById(c.mandatsartId)
      if (checklist) {
        for (const item of checklist.requiredDocuments.filter(d => d.level === 'required')) {
          const state = c.checklistStates?.[item.id] || 'pending'
          if (state === 'received') continue
          automaticQueue.push({
            id: `${c.id}:missing:${item.id}`,
            caseId: c.id,
            caseLabel: label,
            severity: 'automatic',
            type: 'prepare_missing_document_request',
            title: state === 'problem' ? 'Neu-Anforderung vorbereiten' : 'Nachforderung vorbereiten',
            detail: item.label,
          })
        }
      }
    }

    for (const task of c.tasks || []) {
      if (task.done) continue
      teamQueue.push({
        id: `${c.id}:task:${task.id}`,
        caseId: c.id,
        caseLabel: label,
        severity: 'team',
        type: 'open_team_task',
        title: task.title,
        detail: task.assignee ? `Zuständig: ${task.assignee}` : 'Noch nicht zugewiesen',
      })
    }
  }

  const unreviewed = research.filter(r => r.caseId && active.some(c => c.id === r.caseId) && !r.reviewed)
  for (const r of unreviewed) {
    const c = active.find(x => x.id === r.caseId)
    if (!c) continue
    baoAttention.push({
      id: `${c.id}:research:${r.id}`,
      caseId: c.id,
      caseLabel: caseLabel(c),
      severity: 'review',
      type: 'research_review',
      title: 'Recherchepaket prüfen',
      detail: r.question,
    })
  }

  const sortAttention = (a: AutopilotItem, b: AutopilotItem) => {
    const rank = { critical: 0, review: 1, team: 2, automatic: 3 }
    return rank[a.severity] - rank[b.severity] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.caseLabel.localeCompare(b.caseLabel, 'de')
  }

  baoAttention.sort(sortAttention)
  teamQueue.sort(sortAttention)
  automaticQueue.sort((a, b) => a.caseLabel.localeCompare(b.caseLabel, 'de') || a.title.localeCompare(b.title, 'de'))

  const waitingCases = active.filter(c => {
    const hasBao = baoAttention.some(x => x.caseId === c.id)
    const hasTeam = teamQueue.some(x => x.caseId === c.id)
    const hasAuto = automaticQueue.some(x => x.caseId === c.id)
    return !hasBao && !hasTeam && !hasAuto
  }).length

  return {
    activeCases: active.length,
    baoAttention,
    teamQueue,
    automaticQueue,
    waitingCases,
    unresolvedDocuments,
    unreviewedResearch: unreviewed.length,
    deadlinesWithin14Days,
    generatedAt: now.toISOString(),
  }
}
