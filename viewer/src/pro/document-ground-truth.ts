import type { CaseDocument, MandantCase, MandatsartChecklist } from './types'

/**
 * Canonical document state for immigration matters.
 * Channels are inputs. The case ledger is the source of truth.
 */
export type DocumentSourceChannel =
  | 'mandant_portal'
  | 'email'
  | 'whatsapp'
  | 'brief_scan'
  | 'office_scan'
  | 'office_upload'
  | 'other'

export type GroundTruthDocumentState =
  | 'missing'
  | 'requested'
  | 'received'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'not_required'

export interface DocumentRequestState {
  checklistItemId: string
  requestedAt: string
  requestedBy: string
  channel?: 'portal' | 'email' | 'whatsapp' | 'phone' | 'letter' | 'other'
  note?: string
}

export interface NotRequiredState {
  checklistItemId: string
  decidedAt: string
  decidedBy: string
  reason: string
}

export interface ChecklistApproval {
  checklistId: string
  templateVersion: string
  checklistHash?: string
  approvedAt: string
  approvedBy: string
  approvedByRole: 'anwalt' | 'owner'
}

export interface MatterRelease {
  releasedAt: string
  releasedBy: string
  releasedByRole: 'anwalt' | 'owner'
  checklistId: string
  templateVersion: string
  note?: string
}

export interface GroundTruthMatterExtensions {
  documentRequests?: DocumentRequestState[]
  notRequiredDocuments?: NotRequiredState[]
  checklistApproval?: ChecklistApproval
  matterRelease?: MatterRelease
}

export interface GroundTruthItem {
  checklistItemId: string
  state: GroundTruthDocumentState
  documents: CaseDocument[]
  latestDocument?: CaseDocument
  requested?: DocumentRequestState
  notRequired?: NotRequiredState
  source?: DocumentSourceChannel
  reviewComment?: string
}

export const MIGRATION_CHECKLIST_TEMPLATE_VERSION = '2026-08-27.1'

function asExtended(c: MandantCase): MandantCase & GroundTruthMatterExtensions {
  return c as MandantCase & GroundTruthMatterExtensions
}

function activeDocsForItem(c: MandantCase, itemId: string): CaseDocument[] {
  return (c.documents ?? [])
    .filter((d) => !d.deletedAt && d.checklistItemId === itemId)
    .sort((a, b) => String(a.uploadedAt ?? '').localeCompare(String(b.uploadedAt ?? '')))
}

export function sourceChannelOf(doc?: CaseDocument): DocumentSourceChannel | undefined {
  if (!doc) return undefined
  const raw = (doc as CaseDocument & { sourceChannel?: string }).sourceChannel
  if (raw && ['mandant_portal', 'email', 'whatsapp', 'brief_scan', 'office_scan', 'office_upload', 'other'].includes(raw)) {
    return raw as DocumentSourceChannel
  }
  if (doc.uploadedBy === 'mandant') return 'mandant_portal'
  if (doc.uploadedBy === 'staff' || doc.uploadedBy === 'anwalt') return 'office_upload'
  return 'other'
}

export function isChecklistApprovalCurrent(
  c: MandantCase,
  checklist: MandatsartChecklist | null | undefined,
  templateVersion = MIGRATION_CHECKLIST_TEMPLATE_VERSION,
): boolean {
  if (!checklist) return false
  const approval = asExtended(c).checklistApproval
  return Boolean(
    approval &&
    (approval.approvedByRole === 'anwalt' || approval.approvedByRole === 'owner') &&
    approval.checklistId === checklist.id &&
    approval.templateVersion === templateVersion,
  )
}

export function deriveGroundTruthItem(c: MandantCase, itemId: string): GroundTruthItem {
  const ext = asExtended(c)
  const notRequired = (ext.notRequiredDocuments ?? []).find((x) => x.checklistItemId === itemId)
  const docs = activeDocsForItem(c, itemId)
  const latest = docs.at(-1)
  const requested = [...(ext.documentRequests ?? [])]
    .filter((x) => x.checklistItemId === itemId)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
    .at(-1)

  if (notRequired) return { checklistItemId: itemId, state: 'not_required', documents: docs, latestDocument: latest, requested, notRequired }
  if (latest?.reviewStatus === 'approved') return { checklistItemId: itemId, state: 'approved', documents: docs, latestDocument: latest, requested, source: sourceChannelOf(latest), reviewComment: latest.reviewComment }
  if (latest?.reviewStatus === 'rejected') return { checklistItemId: itemId, state: 'rejected', documents: docs, latestDocument: latest, requested, source: sourceChannelOf(latest), reviewComment: latest.reviewComment }
  if (latest?.reviewStatus === 'pending') return { checklistItemId: itemId, state: 'needs_review', documents: docs, latestDocument: latest, requested, source: sourceChannelOf(latest) }
  if (latest) return { checklistItemId: itemId, state: 'received', documents: docs, latestDocument: latest, requested, source: sourceChannelOf(latest) }
  if (requested) return { checklistItemId: itemId, state: 'requested', documents: [], requested }
  return { checklistItemId: itemId, state: 'missing', documents: [] }
}

export function requiredGroundTruth(c: MandantCase, checklist: MandatsartChecklist | null | undefined): GroundTruthItem[] {
  if (!checklist) return []
  return checklist.requiredDocuments
    .filter((item) => item.level === 'required')
    .map((item) => deriveGroundTruthItem(c, item.id))
}

export function groundTruthCounts(c: MandantCase, checklist: MandatsartChecklist | null | undefined) {
  const rows = requiredGroundTruth(c, checklist)
  const count = (states: GroundTruthDocumentState[]) => rows.filter((r) => states.includes(r.state)).length
  return {
    totalRequired: rows.length,
    missing: count(['missing', 'rejected']),
    requested: count(['requested']),
    inReview: count(['received', 'needs_review']),
    approved: count(['approved', 'not_required']),
  }
}

export function documentsToRequest(c: MandantCase, checklist: MandatsartChecklist | null | undefined): string[] {
  return requiredGroundTruth(c, checklist)
    .filter((row) => row.state === 'missing' || row.state === 'rejected')
    .map((row) => row.checklistItemId)
}

export function documentsNeedingReview(c: MandantCase, checklist: MandatsartChecklist | null | undefined): string[] {
  return requiredGroundTruth(c, checklist)
    .filter((row) => row.state === 'received' || row.state === 'needs_review')
    .map((row) => row.checklistItemId)
}

export function isReadyForLawyer(
  c: MandantCase,
  checklist: MandatsartChecklist | null | undefined,
  templateVersion = MIGRATION_CHECKLIST_TEMPLATE_VERSION,
): boolean {
  if (!isChecklistApprovalCurrent(c, checklist, templateVersion)) return false
  const rows = requiredGroundTruth(c, checklist)
  return rows.length > 0 && rows.every((r) => r.state === 'approved' || r.state === 'not_required')
}

export function canLawyerReleaseMatter(
  c: MandantCase,
  checklist: MandatsartChecklist | null | undefined,
  actorRole: string,
  templateVersion = MIGRATION_CHECKLIST_TEMPLATE_VERSION,
): boolean {
  if (actorRole !== 'anwalt' && actorRole !== 'owner') return false
  return isReadyForLawyer(c, checklist, templateVersion)
}

export function clientNextAction(c: MandantCase, checklist: MandatsartChecklist | null | undefined):
  | { state: 'WAIT'; message: string }
  | { state: 'UPLOAD'; itemIds: string[]; message: string }
  | { state: 'REUPLOAD'; itemIds: string[]; message: string }
  | { state: 'IN_REVIEW'; message: string }
  | { state: 'COMPLETE'; message: string } {
  if (!isChecklistApprovalCurrent(c, checklist)) {
    return { state: 'WAIT', message: 'Ihre Unterlagenliste wird von der Kanzlei vorbereitet und freigegeben.' }
  }
  const rows = requiredGroundTruth(c, checklist)
  const rejected = rows.filter((r) => r.state === 'rejected').map((r) => r.checklistItemId)
  if (rejected.length) return { state: 'REUPLOAD', itemIds: rejected, message: 'Bitte laden Sie die markierten Unterlagen erneut hoch.' }
  const missing = rows.filter((r) => r.state === 'missing' || r.state === 'requested').map((r) => r.checklistItemId)
  if (missing.length) return { state: 'UPLOAD', itemIds: missing, message: 'Bitte laden Sie die noch fehlenden Unterlagen hoch.' }
  if (rows.some((r) => r.state === 'received' || r.state === 'needs_review')) {
    return { state: 'IN_REVIEW', message: 'Alles von Ihnen ist eingegangen. Die Kanzlei prüft Ihre Unterlagen.' }
  }
  return { state: 'COMPLETE', message: 'Ihre benötigten Unterlagen sind bestätigt. Die Akte liegt bei der Kanzlei.' }
}

export function officeNextAction(c: MandantCase, checklist: MandatsartChecklist | null | undefined):
  | 'CHECKLIST_FREIGEBEN'
  | 'DOKUMENTE_PRUEFEN'
  | 'UNTERLAGEN_NACHFORDERN'
  | 'BEREIT_FUER_ANWALT'
  | 'ANWALT_FREIGEGEBEN' {
  if (!isChecklistApprovalCurrent(c, checklist)) return 'CHECKLIST_FREIGEBEN'
  if (documentsNeedingReview(c, checklist).length) return 'DOKUMENTE_PRUEFEN'
  if (documentsToRequest(c, checklist).length) return 'UNTERLAGEN_NACHFORDERN'
  if ((asExtended(c).matterRelease?.releasedByRole === 'anwalt' || asExtended(c).matterRelease?.releasedByRole === 'owner') && isReadyForLawyer(c, checklist)) {
    return 'ANWALT_FREIGEGEBEN'
  }
  return 'BEREIT_FUER_ANWALT'
}
