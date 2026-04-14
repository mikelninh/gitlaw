/**
 * localStorage layer for GitLaw Pro.
 *
 * Why localStorage and not Supabase yet:
 *  - Beta phase. We have zero paying customers. Adding Supabase means signing
 *    AVVs with Supabase (US/Frankfurt option), building login flows, paying
 *    for hosting — all before we know if Anwält:innen even want this.
 *  - localStorage means each browser is its own silo. For Beta this is fine:
 *    Anwält:in tests on her own laptop, gives feedback, we add real sync next.
 *  - Migration to a server later is straightforward: each entity has an `id`
 *    and ISO timestamps. We can dump → POST.
 */

import type {
  AuditEntry,
  GeneratedLetter,
  KanzleiSettings,
  MandantCase,
  ResearchQuery,
} from './types'

const KEY_SETTINGS = 'gitlaw.pro.settings.v1'
const KEY_CASES = 'gitlaw.pro.cases.v1'
const KEY_RESEARCH = 'gitlaw.pro.research.v1'
const KEY_LETTERS = 'gitlaw.pro.letters.v1'
const KEY_AUDIT = 'gitlaw.pro.audit.v1'
const KEY_INVITE = 'gitlaw.pro.invite.v1'

const DEFAULT_SETTINGS: KanzleiSettings = {
  name: '',
  address: '',
  contact: '',
  anwaltName: '',
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}

// --- Settings ---

export function getSettings(): KanzleiSettings {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEY_SETTINGS, {}) }
}

export function saveSettings(s: KanzleiSettings): void {
  writeJSON(KEY_SETTINGS, s)
  log('settings.update', `name=${s.name || '∅'} anwalt=${s.anwaltName || '∅'}`)
}

// --- Invite token (Beta gate) ---

const VALID_INVITES = new Set([
  // Beta tokens — these correspond to specific Anwält:innen we hand-invite.
  // Rotate / extend this list as we onboard testers.
  'BETA-MUSTER-1',
  'BETA-MUSTER-2',
  'BETA-MUSTER-3',
  'BETA-MUSTER-4',
  'BETA-MUSTER-5',
  'DEMO',
])

export function isInviteValid(token: string): boolean {
  return VALID_INVITES.has(token.trim().toUpperCase())
}

export function getStoredInvite(): string | null {
  return localStorage.getItem(KEY_INVITE)
}

export function setStoredInvite(token: string): void {
  localStorage.setItem(KEY_INVITE, token.trim().toUpperCase())
}

export function clearStoredInvite(): void {
  localStorage.removeItem(KEY_INVITE)
}

// --- Cases ---

export function listCases(): MandantCase[] {
  return readJSON<MandantCase[]>(KEY_CASES, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function getCase(id: string): MandantCase | undefined {
  return listCases().find(c => c.id === id)
}

export function createCase(input: {
  mandantName: string
  aktenzeichen: string
  description: string
}): MandantCase {
  const now = new Date().toISOString()
  const c: MandantCase = {
    id: uid(),
    mandantName: input.mandantName,
    aktenzeichen: input.aktenzeichen,
    description: input.description,
    createdAt: now,
    updatedAt: now,
    researchIds: [],
    letterIds: [],
    status: 'aktiv',
  }
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  all.push(c)
  writeJSON(KEY_CASES, all)
  log('case.create', `${c.aktenzeichen} — ${c.mandantName}`, c.id)
  return c
}

export function updateCase(id: string, patch: Partial<MandantCase>): void {
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() }
  writeJSON(KEY_CASES, all)
}

export function archiveCase(id: string): void {
  updateCase(id, { status: 'archiviert' })
  log('case.archive', `id=${id}`, id)
}

// --- Research ---

export function listResearch(caseId?: string): ResearchQuery[] {
  const all = readJSON<ResearchQuery[]>(KEY_RESEARCH, [])
  return (caseId ? all.filter(r => r.caseId === caseId) : all).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function saveResearch(r: Omit<ResearchQuery, 'id' | 'createdAt'>): ResearchQuery {
  const item: ResearchQuery = {
    ...r,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
  const all = readJSON<ResearchQuery[]>(KEY_RESEARCH, [])
  all.push(item)
  writeJSON(KEY_RESEARCH, all)
  if (item.caseId) {
    const c = getCase(item.caseId)
    if (c) updateCase(c.id, { researchIds: [...c.researchIds, item.id] })
  }
  log(
    'research.query',
    `q="${item.question.slice(0, 80)}" cites=${item.citations.length}`,
    item.caseId,
  )
  return item
}

export function markResearchReviewed(id: string): void {
  const all = readJSON<ResearchQuery[]>(KEY_RESEARCH, [])
  const idx = all.findIndex(r => r.id === id)
  if (idx < 0) return
  all[idx].reviewed = true
  writeJSON(KEY_RESEARCH, all)
}

// --- Letters ---

export function listLetters(caseId?: string): GeneratedLetter[] {
  const all = readJSON<GeneratedLetter[]>(KEY_LETTERS, [])
  return (caseId ? all.filter(l => l.caseId === caseId) : all).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function saveLetter(l: Omit<GeneratedLetter, 'id' | 'createdAt'>): GeneratedLetter {
  const item: GeneratedLetter = {
    ...l,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
  const all = readJSON<GeneratedLetter[]>(KEY_LETTERS, [])
  all.push(item)
  writeJSON(KEY_LETTERS, all)
  if (item.caseId) {
    const c = getCase(item.caseId)
    if (c) updateCase(c.id, { letterIds: [...c.letterIds, item.id] })
  }
  log('letter.generate', `template=${item.templateId}`, item.caseId)
  return item
}

// --- Audit log ---

export function listAudit(caseId?: string): AuditEntry[] {
  const all = readJSON<AuditEntry[]>(KEY_AUDIT, [])
  return (caseId ? all.filter(e => e.caseId === caseId) : all).sort((a, b) =>
    b.at.localeCompare(a.at),
  )
}

export function log(
  action: AuditEntry['action'],
  detail: string,
  caseId?: string,
): void {
  const settings = getSettings()
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    actor: settings.anwaltName || 'unbenannt',
    action,
    detail,
    caseId,
  }
  const all = readJSON<AuditEntry[]>(KEY_AUDIT, [])
  all.push(entry)
  // Cap at 1000 entries to avoid localStorage bloat. Real implementation
  // ships logs to a server.
  writeJSON(KEY_AUDIT, all.slice(-1000))
}

// --- Reset (Datenschutz / Notausgang) ---

export function eraseAllProData(): void {
  ;[KEY_SETTINGS, KEY_CASES, KEY_RESEARCH, KEY_LETTERS, KEY_AUDIT, KEY_INVITE].forEach(
    k => localStorage.removeItem(k),
  )
}
