/**
 * computeItemStatus — bestimmt den Review-Status eines Checklist-Items
 * aus der Perspektive des Anwalts/Refa.
 *
 * Regeln (Priorität absteigend):
 * 1. 'approved'  — isItemComplete(c, item) UND jüngster nicht-gelöschter Doc = 'approved'
 * 2. 'rejected'  — jüngster nicht-gelöschter Doc hat reviewStatus='rejected'
 * 3. 'pending'   — mind. 1 nicht-gelöschter Doc mit reviewStatus='pending' (von Mandant)
 * 4. 'fehlt'     — kein nicht-gelöschter Doc vorhanden
 *
 * Anwalt-eigene Uploads (uploadedBy !== 'mandant') gelten als implizit 'approved'.
 */

import type { MandantCase, ChecklistItem } from './types'
import { isItemComplete } from '../mandant/mandant-store'

export type ItemStatus = 'fehlt' | 'pending' | 'rejected' | 'approved'

export function computeItemStatus(c: MandantCase, item: ChecklistItem): ItemStatus {
  const docs = (c.documents ?? []).filter(
    d => d.checklistItemId === item.id && !d.deletedAt,
  )

  if (docs.length === 0) return 'fehlt'

  // Jüngsten Doc bestimmen
  const sorted = docs.slice().sort((a, b) => {
    const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
    const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
    return tb - ta
  })
  const newest = sorted[0]

  // Effektiver reviewStatus: Anwalt-Uploads gelten immer als approved
  function effectiveStatus(d: (typeof docs)[0]): 'approved' | 'pending' | 'rejected' {
    if (d.uploadedBy !== 'mandant') return 'approved'
    return d.reviewStatus ?? 'pending'
  }

  const newestStatus = effectiveStatus(newest)

  if (newestStatus === 'rejected') return 'rejected'

  // Gibt es irgendeinen pending Mandant-Upload?
  const hasPending = docs.some(d => d.uploadedBy === 'mandant' && (d.reviewStatus ?? 'pending') === 'pending')
  if (hasPending) return 'pending'

  // Alle Docs approved — prüfe ob Item vollständig
  if (isItemComplete(c, item)) return 'approved'

  // Noch nicht genug approved Docs (z.B. 3 von 5 Seiten)
  return 'fehlt'
}
