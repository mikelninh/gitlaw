import { getAccessContext } from './store'

export type ProRole = 'owner' | 'anwalt' | 'paralegal' | 'assistenz' | 'assistant' | 'read_only'
export type ProAction =
  | 'settings.update'
  | 'case.create'
  | 'case.archive'
  | 'case.task'
  | 'case.document.upload'
  | 'doc.job.queue'
  | 'doc.translation.review'
  | 'research.query'
  | 'research.review'
  | 'letter.generate'
  | 'intake.review'
  | 'template.edit'
  | 'paragraph.note'
  | 'audit.read'

// --- Granular scopes for role-based access control (RBAC) ---
export type ProScope =
  | 'research.view'
  | 'research.create'
  | 'research.review'
  | 'case.view'
  | 'case.create'
  | 'case.edit'
  | 'case.archive'
  | 'letter.generate'
  | 'letter.edit'
  | 'letter.send'
  | 'document.upload'
  | 'document.ocr'
  | 'document.translate'
  | 'intake.review'
  | 'intake.classify'
  | 'settings.view'
  | 'settings.edit'
  | 'settings.billing'
  | 'audit.view'

const RANK: Record<ProRole, number> = {
  read_only: 1,
  assistant: 2,
  assistenz: 3,
  paralegal: 4,
  anwalt: 5,
  owner: 6,
}

export function currentRole(): ProRole {
  return getAccessContext()?.role || 'read_only'
}

export function hasRole(minRole: ProRole): boolean {
  return RANK[currentRole()] >= RANK[minRole]
}

const ACTION_MIN_ROLE: Record<ProAction, ProRole> = {
  'settings.update': 'owner',
  'case.create': 'assistenz',
  'case.archive': 'anwalt',
  'case.task': 'assistenz',
  'case.document.upload': 'assistenz',
  'doc.job.queue': 'assistenz',
  'doc.translation.review': 'anwalt',
  'research.query': 'assistenz',
  'research.review': 'anwalt',
  'letter.generate': 'assistenz',
  'intake.review': 'assistenz',
  'template.edit': 'anwalt',
  'paragraph.note': 'anwalt',
  'audit.read': 'anwalt',
}

export function canPerformAction(action: ProAction): boolean {
  return hasRole(ACTION_MIN_ROLE[action])
}

// Default scope grants by role. Owner gets everything.
const DEFAULT_SCOPES_BY_ROLE: Record<ProRole, ProScope[]> = {
  owner: [
    'research.view', 'research.create', 'research.review',
    'case.view', 'case.create', 'case.edit', 'case.archive',
    'letter.generate', 'letter.edit', 'letter.send',
    'document.upload', 'document.ocr', 'document.translate',
    'intake.review', 'intake.classify',
    'settings.view', 'settings.edit', 'settings.billing',
    'audit.view',
  ],
  anwalt: [
    'research.view', 'research.create', 'research.review',
    'case.view', 'case.create', 'case.edit', 'case.archive',
    'letter.generate', 'letter.edit', 'letter.send',
    'document.upload', 'document.ocr', 'document.translate',
    'intake.review', 'intake.classify',
    'audit.view',
  ],
  paralegal: [
    'research.view', 'research.create',
    'case.view', 'case.create', 'case.edit',
    'letter.generate',
    'document.upload', 'document.ocr', 'document.translate',
    'intake.review', 'intake.classify',
    'audit.view',
  ],
  assistenz: [
    'research.view', 'research.create',
    'case.view', 'case.create', 'case.edit',
    'letter.generate',
    'document.upload', 'document.ocr', 'document.translate',
    'intake.review', 'intake.classify',
  ],
  assistant: [
    'case.view',
    'intake.classify',
  ],
  read_only: [
    'research.view', 'case.view',
  ],
}

/**
 * Returns the scopes granted to the current user.
 * In the future this can be overridden by the owner per-user.
 */
export function getGrantedScopes(): Set<ProScope> {
  const role = currentRole()
  const customScopes = getAccessContext()?.scopes
  if (customScopes && Array.isArray(customScopes)) {
    // Custom scopes override defaults (owner-configurable per-user)
    return new Set(customScopes as ProScope[])
  }
  return new Set(DEFAULT_SCOPES_BY_ROLE[role])
}

export function hasScope(scope: ProScope): boolean {
  return getGrantedScopes().has(scope)
}

export function roleLabel(role: ProRole = currentRole()): string {
  switch (role) {
    case 'owner':
      return 'Inhaber:in'
    case 'anwalt':
      return 'Anwält:in'
    case 'paralegal':
      return 'Refa'
    case 'assistenz':
      return 'Assistenz'
    case 'assistant':
      return 'Hilfskraft'
    default:
      return 'Nur Lesen'
  }
}

export function canAccessRoute(route: string): boolean {
  if (route.startsWith('/pro/einstellungen')) return hasRole('anwalt')
  if (route.startsWith('/pro/import')) return hasRole('assistenz')
  if (route.startsWith('/pro/triage')) return hasRole('assistenz')
  if (route.startsWith('/pro/recherche')) return hasScope('research.view')
  if (route.startsWith('/pro/schreiben')) return hasScope('letter.generate')
  if (route.startsWith('/pro/akten')) return hasScope('case.view')
  if (route.startsWith('/pro/eingaenge')) return hasScope('intake.review')
  if (route.startsWith('/pro/audit')) return hasScope('audit.view')
  return hasRole('read_only')
}
