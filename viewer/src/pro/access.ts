import { getAccessContext } from './store'

export type ProRole = 'owner' | 'anwalt' | 'assistenz' | 'read_only'
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

const RANK: Record<ProRole, number> = {
  read_only: 1,
  assistenz: 2,
  anwalt: 3,
  owner: 4,
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

export function roleLabel(role: ProRole = currentRole()): string {
  switch (role) {
    case 'owner':
      return 'Inhaber:in'
    case 'anwalt':
      return 'Anwält:in'
    case 'assistenz':
      return 'Assistenz'
    default:
      return 'Nur Lesen'
  }
}

export function canAccessRoute(route: string): boolean {
  if (route.startsWith('/pro/einstellungen')) return hasRole('owner')
  if (route.startsWith('/pro/import')) return hasRole('assistenz')
  if (route.startsWith('/pro/recherche')) return hasRole('assistenz')
  if (route.startsWith('/pro/schreiben')) return hasRole('assistenz')
  if (route.startsWith('/pro/akten')) return hasRole('assistenz')
  if (route.startsWith('/pro/eingaenge')) return hasRole('assistenz')
  if (route.startsWith('/pro/audit')) return hasRole('anwalt')
  return hasRole('read_only')
}
