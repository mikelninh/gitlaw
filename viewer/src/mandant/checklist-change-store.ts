export type ChecklistChangeAction = 'not_applicable' | 'add_document' | 'question'

export interface ChecklistChangeRequest {
  id: string
  caseId: string
  checklistItemId?: string
  action: ChecklistChangeAction
  message?: string
  createdAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

const KEY = 'gitlaw.mandant.checklist-change.v1'

function readAll(): ChecklistChangeRequest[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as ChecklistChangeRequest[] : []
  } catch {
    return []
  }
}

function writeAll(rows: ChecklistChangeRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function listChecklistChangeRequests(caseId: string): ChecklistChangeRequest[] {
  return readAll().filter(r => r.caseId === caseId)
}

export function saveChecklistChangeRequest(input: Omit<ChecklistChangeRequest, 'id' | 'createdAt' | 'status'>): ChecklistChangeRequest {
  const row: ChecklistChangeRequest = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  }
  const rows = readAll()
  rows.push(row)
  writeAll(rows.slice(-100))
  return row
}
