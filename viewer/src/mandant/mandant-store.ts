/**
 * Read-only Sicht auf die /pro-Akten für Mandant:innen.
 *
 * Liest aus demselben localStorage-Key wie /pro (gitlaw.pro.cases.v1).
 * Der Mandant sieht nur die eigene Akte (gefiltert nach mandantId).
 * Schreiboperationen beschränken sich auf Document-Upload — ohne guardAction,
 * da Mandanten keine ProRole haben.
 *
 * Phase 2: ersetze durch echten API-Call gegen /api/mandant/:mandantId
 */

import type { CaseDocument, MandantCase } from '../pro/types'

const KEY_CASES = 'gitlaw.pro.cases.v1'

function readCases(): MandantCase[] {
  try {
    const raw = localStorage.getItem(KEY_CASES)
    if (!raw) return []
    return JSON.parse(raw) as MandantCase[]
  } catch {
    return []
  }
}

function writeCases(cases: MandantCase[]): void {
  localStorage.setItem(KEY_CASES, JSON.stringify(cases))
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Gibt die Akte zurück, die dem Mandanten gehört.
 *
 * Matching-Logik:
 *  1. Akte hat explizites mandantId-Feld das matcht.
 *  2. Fallback für Demo: mandantId 'mandant-demo' matcht alle Akten ohne mandantId-Feld
 *     (damit der Demo-Token sofort etwas sieht, solange kein Daten-Preset mit mandantId existiert).
 *
 * Phase 2: Backend liefert genau eine Akte per mandantId — Fallback entfällt.
 */
export function getMandantCase(mandantId: string): MandantCase | null {
  const all = readCases()

  const explicit = all.find(c => (c as MandantCase & { mandantId?: string }).mandantId === mandantId)
  if (explicit) return explicit

  if (mandantId === 'mandant-demo') {
    const first = all.find(c => !(c as MandantCase & { mandantId?: string }).mandantId)
    return first ?? null
  }

  return null
}

/**
 * Fügt ein Dokument zur Akte hinzu — ohne ProRole-Guard.
 * Mandant:innen dürfen eigene Dokumente hochladen; die Anwält:in sieht sie dann in /pro.
 */
export function mandantAddDocument(
  caseId: string,
  input: {
    originalName: string
    internalName: string
    mimeType: string
    sizeBytes: number
    dataUrl?: string
  },
): CaseDocument | null {
  const all = readCases()
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return null

  const doc: CaseDocument = {
    id: uid(),
    originalName: input.originalName,
    internalName: input.internalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'mandant',
    dataUrl: input.dataUrl,
    storageMode: 'local_inline',
  }

  all[idx] = {
    ...all[idx],
    documents: [...(all[idx].documents ?? []), doc],
    updatedAt: new Date().toISOString(),
  }

  writeCases(all)
  return doc
}

/**
 * Zaehlt wie viele Documents bereits fuer ein bestimmtes Checklist-Item hochgeladen sind.
 * Quelle: c.documents (nicht checklistStates) — Frontend kennt die requiredPhotoCount.
 */
export function countUploadedForItem(c: MandantCase, itemId: string): number {
  // Rejected oder gelöschte Docs zählen nicht als „erfüllt" — Mandant muss neu hochladen.
  // Vollmacht-Doc IST das anwaltsvollmacht-Item (signiert via SignaturePad) — KEIN Ausschluss hier.
  return (c.documents ?? []).filter(d => {
    if (d.checklistItemId !== itemId) return false
    const reviewStatus = (d as { reviewStatus?: string }).reviewStatus
    if (reviewStatus === 'rejected') return false
    if ((d as { deletedAt?: string }).deletedAt) return false
    return true
  }).length
}

/**
 * Prueft ob ein Checklist-Item vollstaendig ist:
 * uploadCount >= requiredPhotoCount (default 1).
 * Ignoriert checklistStates bewusst — Frontend berechnet den Status selbst.
 */
export function isItemComplete(
  c: MandantCase,
  item: import('../pro/types').ChecklistItem,
): boolean {
  const required = item.requiredPhotoCount ?? 1
  return countUploadedForItem(c, item.id) >= required
}

export function getMissingRequiredDocuments(c: MandantCase, checklist: import('../pro/types').MandatsartChecklist | null): string[] {
  if (!checklist) return []
  return checklist.requiredDocuments
    .filter(item => item.level === 'required' && !isItemComplete(c, item))
    .map(item => item.label)
}

export function getMissingChecklistItems(
  c: MandantCase,
  checklist: import('../pro/types').MandatsartChecklist | null,
): import('../pro/types').ChecklistItem[] {
  if (!checklist) return []
  return checklist.requiredDocuments.filter(
    item => item.level === 'required' && !isItemComplete(c, item),
  )
}

/**
 * Gibt alle required Items zurueck — auch bereits abgeschlossene.
 * Benoetigt fuer die UI damit abgeschlossene Cards (gruen) sichtbar bleiben.
 */
export function getAllRequiredChecklistItems(
  _c: MandantCase,
  checklist: import('../pro/types').MandatsartChecklist | null,
): import('../pro/types').ChecklistItem[] {
  if (!checklist) return []
  return checklist.requiredDocuments.filter(item => item.level === 'required')
}

/**
 * Upload eines Dokuments mit Zuordnung zu einem Checklist-Item.
 * Haengt das Dokument an die Akte. Setzt checklistStates NICHT mehr auf
 * 'received' — der Status wird vom Frontend per isItemComplete() berechnet,
 * weil nur das Frontend requiredPhotoCount kennt.
 * Ohne ProRole-Guard — Mandanten duerfen eigene Dokumente hochladen.
 */
export function mandantUploadForChecklistItem(
  caseId: string,
  itemId: string,
  input: {
    originalName: string
    internalName: string
    mimeType: string
    sizeBytes: number
    dataUrl?: string
    photoSlotId?: string
  },
): CaseDocument | null {
  const all = readCases()
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return null

  const doc: CaseDocument = {
    id: uid(),
    originalName: input.originalName,
    internalName: input.internalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'mandant',
    dataUrl: input.dataUrl,
    storageMode: 'local_inline',
    checklistItemId: itemId,
    photoSlotId: input.photoSlotId,
  }

  all[idx] = {
    ...all[idx],
    documents: [...(all[idx].documents ?? []), doc],
    updatedAt: new Date().toISOString(),
  }

  writeCases(all)
  return doc
}
