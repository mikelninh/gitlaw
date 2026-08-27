/**
 * computeItemStatus — Review-Status eines Checklist-Items.
 *
 * Wichtige Ground-Truth-Regel:
 * Ein Upload ist nur ein Eingang, niemals automatisch eine fachliche Freigabe.
 * Das gilt gleich für Mandantenportal, E-Mail, WhatsApp, Brief-Scan und
 * Kanzlei-Upload. Erst ein explizites Review setzt `reviewStatus=approved`.
 */

import type { MandantCase, ChecklistItem } from './types'
import { isItemComplete } from '../mandant/mandant-store'

export type ItemStatus = 'fehlt' | 'pending' | 'rejected' | 'approved'

export function computeItemStatus(c: MandantCase, item: ChecklistItem): ItemStatus {
  const docs = (c.documents ?? []).filter(
    d => d.checklistItemId === item.id && !d.deletedAt,
  )

  if (docs.length === 0) return 'fehlt'

  const sorted = docs.slice().sort((a, b) => {
    const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
    const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
    return tb - ta
  })
  const newest = sorted[0]
  const newestStatus = newest.reviewStatus ?? 'pending'

  // A rejected newest version means the current document must be replaced.
  if (newestStatus === 'rejected') return 'rejected'

  // Any unreviewed active document keeps the item in review. Staff uploads are
  // deliberately included; provenance never bypasses human review.
  if (docs.some(d => (d.reviewStatus ?? 'pending') === 'pending')) return 'pending'

  // Only explicitly approved documents can satisfy completeness/count rules.
  const allApproved = docs.every(d => d.reviewStatus === 'approved')
  if (allApproved && isItemComplete(c, item)) return 'approved'

  // Not enough usable/approved pages yet.
  return 'fehlt'
}
