/**
 * Backend-API-Helfer für den Mandanten-Portal-Backend-Modus.
 *
 * Wird nur aufgerufen wenn URL ?token=... enthält (kein Demo-Token).
 * Demo-Modus läuft weiter über mandant-store.ts (localStorage).
 */

import type { MandantCase } from '../pro/types'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

export interface BackendCaseResponse {
  ok: true
  case: Pick<
    MandantCase,
    | 'id'
    | 'aktenzeichen'
    | 'mandantName'
    | 'description'
    | 'caseStatus'
    | 'mandatsartId'
    | 'fristDatum'
    | 'fristBezeichnung'
    | 'updatedAt'
    | 'createdAt'
    | 'checklistStates'
    | 'documents'
  >
  lang: 'de' | 'vi'
}

export type ChecklistChangeAction = 'not_applicable' | 'add_document' | 'question'

export interface BackendChecklistChangeRequest {
  id: string
  caseId: string
  checklistItemId?: string
  action: ChecklistChangeAction
  message?: string
  createdAt: string
  status: 'pending'
  source: 'mandant_portal'
}

async function jsonError(resp: Response, fallback: string): Promise<never> {
  const body = await resp.json().catch(() => ({})) as { error?: string }
  throw new Error(body?.error ?? `${fallback} (HTTP ${resp.status})`)
}

export async function fetchMandantCase(token: string): Promise<BackendCaseResponse> {
  const resp = await fetch(
    `${API_URL}/api/mandant/case?token=${encodeURIComponent(token)}`,
    { headers: { 'Content-Type': 'application/json' } },
  )
  if (!resp.ok) return jsonError(resp, 'Akte konnte nicht geladen werden')
  return (await resp.json()) as BackendCaseResponse
}

export async function deleteMandantDocument(
  token: string,
  documentId: string,
): Promise<{ ok: true; deleted: true }> {
  const resp = await fetch(`${API_URL}/api/mandant/document-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, documentId }),
  })
  if (!resp.ok) return jsonError(resp, 'Löschen fehlgeschlagen')
  return (await resp.json()) as { ok: true; deleted: true }
}

export function getMandantDocumentUrl(token: string, serverDocumentId: string): string {
  return `${API_URL}/api/mandant/document?token=${encodeURIComponent(token)}&id=${encodeURIComponent(serverDocumentId)}`
}

export async function uploadMandantDocument(
  token: string,
  file: File,
  checklistItemId?: string,
  photoSlotId?: string,
): Promise<{ ok: true; documentId: string; checksumSha256: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsDataURL(file)
  })

  const resp = await fetch(`${API_URL}/api/mandant/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      checklistItemId,
      photoSlotId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      base64,
    }),
  })

  if (!resp.ok) return jsonError(resp, 'Upload fehlgeschlagen')
  return (await resp.json()) as { ok: true; documentId: string; checksumSha256: string }
}

export async function fetchChecklistChangeRequests(token: string): Promise<BackendChecklistChangeRequest[]> {
  const resp = await fetch(`${API_URL}/api/mandant/checklist-change?token=${encodeURIComponent(token)}`)
  if (!resp.ok) return jsonError(resp, 'Änderungswünsche konnten nicht geladen werden')
  const body = await resp.json() as { ok: true; requests: BackendChecklistChangeRequest[] }
  return body.requests ?? []
}

export async function submitChecklistChangeRequest(
  token: string,
  input: { action: ChecklistChangeAction; checklistItemId?: string; message?: string },
): Promise<BackendChecklistChangeRequest> {
  const resp = await fetch(`${API_URL}/api/mandant/checklist-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...input }),
  })
  if (!resp.ok) return jsonError(resp, 'Änderungswunsch konnte nicht gesendet werden')
  const body = await resp.json() as { ok: true; request: BackendChecklistChangeRequest }
  return body.request
}
