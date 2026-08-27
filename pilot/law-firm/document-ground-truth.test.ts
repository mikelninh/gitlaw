import { describe, expect, it } from 'vitest'
import type { MandantCase, MandatsartChecklist } from '../../viewer/src/pro/types'
import {
  MIGRATION_CHECKLIST_TEMPLATE_VERSION,
  canLawyerReleaseMatter,
  clientNextAction,
  deriveGroundTruthItem,
  documentsNeedingReview,
  documentsToRequest,
  groundTruthCounts,
  isChecklistApprovalCurrent,
  isReadyForLawyer,
  officeNextAction,
} from '../../viewer/src/pro/document-ground-truth'

const checklist: MandatsartChecklist = {
  id: 'migration-test',
  title: 'Migration Test',
  category: 'migration',
  description: 'Synthetic migration checklist for workflow contract tests.',
  requiredDocuments: [
    { id: 'passport', label: 'Reisepass', level: 'required' },
    { id: 'permit', label: 'Aufenthaltstitel', level: 'required' },
    { id: 'income', label: 'Einkommensnachweis', level: 'required' },
  ],
}

function baseCase(): MandantCase {
  return {
    id: 'case-1',
    mandantName: 'Demo',
    aktenzeichen: 'DEMO-1',
    description: 'Migration',
    createdAt: '2026-08-27T08:00:00Z',
    updatedAt: '2026-08-27T08:00:00Z',
    researchIds: [],
    letterIds: [],
    status: 'aktiv',
    documents: [],
    checklistStates: {},
    mandatsartId: checklist.id,
    checklistApproval: {
      checklistId: checklist.id,
      templateVersion: MIGRATION_CHECKLIST_TEMPLATE_VERSION,
      approvedAt: '2026-08-27T08:00:00Z',
      approvedBy: 'Lawyer',
      approvedByRole: 'anwalt',
    },
  }
}

function doc(id: string, itemId: string, reviewStatus: 'pending' | 'approved' | 'rejected', uploadedBy: 'mandant' | 'staff' = 'mandant') {
  return {
    id,
    originalName: `${id}.pdf`,
    internalName: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 100,
    uploadedAt: '2026-08-27T08:00:00Z',
    uploadedBy,
    checklistItemId: itemId,
    reviewStatus,
  }
}

describe('migration document ground truth', () => {
  it('requires lawyer-approved current checklist before client upload workflow', () => {
    const c = baseCase()
    delete c.checklistApproval
    expect(isChecklistApprovalCurrent(c, checklist)).toBe(false)
    expect(clientNextAction(c, checklist).state).toBe('WAIT')
    expect(officeNextAction(c, checklist)).toBe('CHECKLIST_FREIGEBEN')
  })

  it('invalidates approval when template version changes', () => {
    const c = baseCase()
    expect(isChecklistApprovalCurrent(c, checklist)).toBe(true)
    expect(isChecklistApprovalCurrent(c, checklist, '2026-09-01.1')).toBe(false)
  })

  it('never treats staff uploads as automatically approved', () => {
    const c = baseCase()
    c.documents = [doc('d1', 'passport', 'pending', 'staff')]
    expect(deriveGroundTruthItem(c, 'passport').state).toBe('needs_review')
    expect(documentsNeedingReview(c, checklist)).toContain('passport')
    expect(isReadyForLawyer(c, checklist)).toBe(false)
  })

  it('keeps all input channels subordinate to the same canonical item', () => {
    const c = baseCase()
    c.documents = [
      { ...doc('email-1', 'passport', 'pending', 'staff'), sourceChannel: 'email' },
      { ...doc('portal-2', 'passport', 'approved', 'mandant'), sourceChannel: 'mandant_portal' },
    ]
    const item = deriveGroundTruthItem(c, 'passport')
    expect(item.documents).toHaveLength(2)
    expect(item.state).toBe('approved')
    expect(item.source).toBe('mandant_portal')
  })

  it('does not re-request an item that is already received and waiting for review', () => {
    const c = baseCase()
    c.documents = [doc('d1', 'passport', 'pending')]
    expect(documentsToRequest(c, checklist)).not.toContain('passport')
    expect(documentsNeedingReview(c, checklist)).toContain('passport')
  })

  it('re-requests rejected documents and preserves review comment', () => {
    const c = baseCase()
    c.documents = [{ ...doc('d1', 'passport', 'rejected'), reviewComment: 'Bitte alle Seiten lesbar hochladen.' }]
    expect(deriveGroundTruthItem(c, 'passport').state).toBe('rejected')
    expect(deriveGroundTruthItem(c, 'passport').reviewComment).toContain('lesbar')
    expect(documentsToRequest(c, checklist)).toContain('passport')
    expect(clientNextAction(c, checklist).state).toBe('REUPLOAD')
  })

  it('tracks requested but not yet received documents separately from missing', () => {
    const c = baseCase()
    c.documentRequests = [{ checklistItemId: 'passport', requestedAt: '2026-08-27T08:05:00Z', requestedBy: 'Staff', channel: 'email' }]
    expect(deriveGroundTruthItem(c, 'passport').state).toBe('requested')
    expect(groundTruthCounts(c, checklist).requested).toBe(1)
  })

  it('allows explicit not-required decisions without fabricating a document', () => {
    const c = baseCase()
    c.notRequiredDocuments = [{ checklistItemId: 'income', decidedAt: '2026-08-27T08:10:00Z', decidedBy: 'Lawyer', reason: 'Für diesen konkreten Fall nicht erforderlich.' }]
    expect(deriveGroundTruthItem(c, 'income').state).toBe('not_required')
  })

  it('only becomes ready for lawyer after every required item is approved or not required', () => {
    const c = baseCase()
    c.documents = [doc('p', 'passport', 'approved'), doc('a', 'permit', 'approved')]
    c.notRequiredDocuments = [{ checklistItemId: 'income', decidedAt: '2026-08-27T08:10:00Z', decidedBy: 'Lawyer', reason: 'Nicht erforderlich.' }]
    expect(isReadyForLawyer(c, checklist)).toBe(true)
    expect(officeNextAction(c, checklist)).toBe('BEREIT_FUER_ANWALT')
  })

  it('never lets staff perform final matter release', () => {
    const c = baseCase()
    c.documents = [doc('p', 'passport', 'approved'), doc('a', 'permit', 'approved'), doc('i', 'income', 'approved')]
    expect(canLawyerReleaseMatter(c, checklist, 'assistenz')).toBe(false)
    expect(canLawyerReleaseMatter(c, checklist, 'anwalt')).toBe(true)
    expect(canLawyerReleaseMatter(c, checklist, 'owner')).toBe(true)
  })

  it('gives each role one unambiguous next action', () => {
    const c = baseCase()
    expect(clientNextAction(c, checklist).state).toBe('UPLOAD')
    expect(officeNextAction(c, checklist)).toBe('UNTERLAGEN_NACHFORDERN')
    c.documents = [doc('p', 'passport', 'pending')]
    expect(officeNextAction(c, checklist)).toBe('DOKUMENTE_PRUEFEN')
  })
})
