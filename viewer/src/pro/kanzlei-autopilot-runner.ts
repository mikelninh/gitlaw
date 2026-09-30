import { addCaseTask, listCases, queueDocumentJob } from './store'
import { getChecklistById } from './mandatsart-checklists'

export interface SafeAutopilotRunReport {
  scannedCases: number
  ocrJobsQueued: number
  missingDocumentTasksCreated: number
  deadlineReviewTasksCreated: number
  externalMessagesSent: 0
  legalDecisionsMade: 0
}

function daysUntil(date: string, now: Date): number | null {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000)
}

function taskExists(titles: string[], title: string): boolean {
  return titles.some(existing => existing === title)
}

/**
 * Runs only low-consequence internal preparation that is already allowed by
 * the existing Pro role guards. It intentionally has no email, beA, deadline
 * confirmation, matter-acceptance or payment provider.
 */
export function runSafeKanzleiAutopilot(now = new Date()): SafeAutopilotRunReport {
  const cases = listCases().filter(c => c.status === 'aktiv')
  let ocrJobsQueued = 0
  let missingDocumentTasksCreated = 0
  let deadlineReviewTasksCreated = 0

  for (const c of cases) {
    const openTitles = (c.tasks || []).filter(t => !t.done).map(t => t.title)

    for (const doc of c.documents || []) {
      if (doc.deletedAt || doc.ocrText) continue
      const existing = (c.documentJobs || []).some(job =>
        job.type === 'ocr' &&
        (job.documentId === doc.id || job.attachmentInternalName === doc.internalName),
      )
      if (existing) continue
      const queued = queueDocumentJob(c.id, {
        documentId: doc.id,
        attachmentInternalName: doc.internalName,
        type: 'ocr',
        sourceLanguage: doc.languageHint,
        note: 'Kanzlei Autopilot: sichere interne OCR-Vorbereitung; Ergebnis bleibt reviewpflichtig.',
      })
      if (queued) ocrJobsQueued++
    }

    if (c.mandatsartId) {
      const checklist = getChecklistById(c.mandatsartId)
      if (checklist) {
        for (const item of checklist.requiredDocuments.filter(d => d.level === 'required')) {
          const state = c.checklistStates?.[item.id] || 'pending'
          if (state === 'received') continue
          const title = `${state === 'problem' ? 'Neu-Anforderung' : 'Nachforderung'} vorbereiten: ${item.label}`
          if (taskExists(openTitles, title)) continue
          const task = addCaseTask(c.id, { title, assignee: 'Assistenz' })
          if (task) {
            openTitles.push(title)
            missingDocumentTasksCreated++
          }
        }
      }
    }

    if (c.fristDatum) {
      const days = daysUntil(c.fristDatum, now)
      if (days !== null && days <= 14) {
        const title = `Frist anwaltlich kontrollieren: ${c.fristBezeichnung || c.fristDatum}`
        if (!taskExists(openTitles, title)) {
          const task = addCaseTask(c.id, { title, assignee: 'Anwalt' })
          if (task) {
            openTitles.push(title)
            deadlineReviewTasksCreated++
          }
        }
      }
    }
  }

  return {
    scannedCases: cases.length,
    ocrJobsQueued,
    missingDocumentTasksCreated,
    deadlineReviewTasksCreated,
    externalMessagesSent: 0,
    legalDecisionsMade: 0,
  }
}
