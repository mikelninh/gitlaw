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
  ApprovedAnswerMemory,
  AuditEntry,
  CaseDocument,
  CaseTask,
  CustomTemplate,
  DocumentJob,
  GeneratedLetter,
  IntakeEntry,
  KanzleiSettings,
  MandantCase,
  ParagraphNote,
  ResearchQuery,
} from './types'
import { schedulePush } from './sync'
import type { ProAction, ProRole } from './access'

const KEY_SETTINGS = 'gitlaw.pro.settings.v1'
const KEY_CASES = 'gitlaw.pro.cases.v1'
const KEY_RESEARCH = 'gitlaw.pro.research.v1'
const KEY_LETTERS = 'gitlaw.pro.letters.v1'
const KEY_AUDIT = 'gitlaw.pro.audit.v1'
const KEY_INVITE = 'gitlaw.pro.invite.v1'
const KEY_INTAKES = 'gitlaw.pro.intakes.v1'
const KEY_CUSTOM_TEMPLATES = 'gitlaw.pro.customTemplates.v1'
const KEY_TEMPLATE_USAGE = 'gitlaw.pro.templateUsage.v1'
const KEY_PARAGRAPH_NOTES = 'gitlaw.pro.paragraphNotes.v1'
const KEY_ACCESS_CTX = 'gitlaw.pro.access.v1'
const KEY_SESSION_TOKEN = 'gitlaw.pro.session.v1'
const KEY_LAST_ACTIVE = 'gitlaw.pro.lastActive.v1'
const KEY_ONBOARDING_DISMISSED = 'gitlaw.pro.onboardingDismissed.v1'
const KEY_APPROVED_MEMORY = 'gitlaw.pro.approvedMemory.v1'
const KEY_ANALYTICS = 'gitlaw.pro.analytics.v1'

const DEFAULT_SETTINGS: KanzleiSettings = {
  name: '',
  address: '',
  contact: '',
  anwaltName: '',
}

export interface AccessContext {
  tenantId: string
  userId: string
  role: 'owner' | 'anwalt' | 'assistenz' | 'read_only'
  email?: string
  sessionExpiresAt?: string
}

export interface ProAnalyticsSnapshot {
  updatedAt: string
  totalEvents: number
  counts: Record<string, number>
  latestByStep: Partial<Record<'intake' | 'case' | 'document' | 'research' | 'draft' | 'review', string>>
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
  // Auto-Sync: debounced push in die Cloud (no-op falls Cloud-Sync aus)
  schedulePush()
}

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}

function hashString(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const ROLE_RANK: Record<ProRole, number> = {
  read_only: 1,
  assistenz: 2,
  anwalt: 3,
  owner: 4,
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

function hasRequiredRole(minRole: ProRole): boolean {
  const role = getAccessContext()?.role || 'read_only'
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

function guardAction(action: ProAction): boolean {
  return hasRequiredRole(ACTION_MIN_ROLE[action])
}

function inferAnalyticsStep(action: AuditEntry['action']): keyof ProAnalyticsSnapshot['latestByStep'] | null {
  if (action === 'intake.received') return 'intake'
  if (action === 'case.create') return 'case'
  if (action === 'case.document.upload' || action === 'doc.ocr.queue' || action === 'doc.translate.queue') return 'document'
  if (action === 'research.query') return 'research'
  if (action === 'letter.generate') return 'draft'
  if (action === 'doc.review.done') return 'review'
  return null
}

function recordAnalytics(action: AuditEntry['action']): void {
  const current = readJSON<ProAnalyticsSnapshot>(KEY_ANALYTICS, {
    updatedAt: new Date().toISOString(),
    totalEvents: 0,
    counts: {},
    latestByStep: {},
  })
  const step = inferAnalyticsStep(action)
  const next: ProAnalyticsSnapshot = {
    ...current,
    updatedAt: new Date().toISOString(),
    totalEvents: current.totalEvents + 1,
    counts: {
      ...current.counts,
      [action]: (current.counts[action] || 0) + 1,
    },
    latestByStep: {
      ...current.latestByStep,
      ...(step ? { [step]: new Date().toISOString() } : {}),
    },
  }
  localStorage.setItem(KEY_ANALYTICS, JSON.stringify(next))
}

export function getAnalyticsSnapshot(): ProAnalyticsSnapshot {
  return readJSON<ProAnalyticsSnapshot>(KEY_ANALYTICS, {
    updatedAt: '',
    totalEvents: 0,
    counts: {},
    latestByStep: {},
  })
}

// --- Settings ---

export function getSettings(): KanzleiSettings {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEY_SETTINGS, {}) }
}

export function saveSettings(s: KanzleiSettings): void {
  if (!guardAction('settings.update')) return
  writeJSON(KEY_SETTINGS, s)
  log('settings.update', `name=${s.name || '∅'} anwalt=${s.anwaltName || '∅'}`)
}

// --- Invite token (Beta gate) ---

const VALID_INVITES = new Set([
  // Generic muster tokens — usable for ad-hoc tests / public demos
  'BETA-MUSTER-1',
  'BETA-MUSTER-2',
  'BETA-MUSTER-3',
  'BETA-MUSTER-4',
  'BETA-MUSTER-5',
  'DEMO',
  // Named tokens for the four real Beta-Testkanzleien (April-Mai 2026).
  // Jede Token-URL kann zusätzlich einen ?preset= Param tragen, der die
  // passende Demo-Akten-Sammlung beim ersten Login auto-lädt
  // (siehe ProAuth.tsx + demo-data.ts presets).
  'BETA-RUBIN',     // Patrick Rubin (Mietrecht/WEG, Berlin)     → preset=rubin
  'BETA-WERNER',    // Werner Gniosdorz (Notar a.D., Berlin)     → preset=gniosdorz
  'BETA-JASMIN',    // Jasmin Gniosdorz (Erbrecht/Familie)       → preset=gniosdorz
  'BETA-NGUYEN',    // Thai Bao Nguyen (Strafrecht/Mietrecht/Migration, vietnamesisch) → preset=nguyen
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
  localStorage.removeItem(KEY_SESSION_TOKEN)
  localStorage.removeItem(KEY_ACCESS_CTX)
  localStorage.removeItem(KEY_LAST_ACTIVE)
}

export function getAccessContext(): AccessContext | null {
  return readJSON<AccessContext | null>(KEY_ACCESS_CTX, null)
}

export function setAccessContext(ctx: AccessContext): void {
  localStorage.setItem(KEY_ACCESS_CTX, JSON.stringify(ctx))
  touchSessionActivity()
}

export function getStoredSessionToken(): string | null {
  return localStorage.getItem(KEY_SESSION_TOKEN)
}

export function setStoredSessionToken(token: string): void {
  localStorage.setItem(KEY_SESSION_TOKEN, token)
}

export function touchSessionActivity(): void {
  localStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()))
}

export function isSessionExpired(timeoutMinutes = 120): boolean {
  const ctx = getAccessContext()
  if (ctx?.sessionExpiresAt) {
    const expiresAt = Date.parse(ctx.sessionExpiresAt)
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return true
  }
  const raw = localStorage.getItem(KEY_LAST_ACTIVE)
  if (!raw) return true
  const last = Number(raw)
  if (!Number.isFinite(last)) return true
  return Date.now() - last > timeoutMinutes * 60 * 1000
}

export function isOnboardingDismissed(): boolean {
  return localStorage.getItem(KEY_ONBOARDING_DISMISSED) === '1'
}

export function setOnboardingDismissed(value: boolean): void {
  if (value) localStorage.setItem(KEY_ONBOARDING_DISMISSED, '1')
  else localStorage.removeItem(KEY_ONBOARDING_DISMISSED)
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
  if (!guardAction('case.create')) throw new Error('Nicht berechtigt: case.create')
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
    tasks: [],
    documents: [],
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
  if (!guardAction('case.archive')) return
  updateCase(id, { status: 'archiviert' })
  log('case.archive', `id=${id}`, id)
}

export function addCaseTask(caseId: string, input: { title: string; assignee?: string }): CaseTask | null {
  if (!guardAction('case.task')) return null
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return null
  const task: CaseTask = {
    id: uid(),
    title: input.title,
    assignee: input.assignee,
    done: false,
    createdAt: new Date().toISOString(),
  }
  all[idx] = {
    ...all[idx],
    tasks: [...(all[idx].tasks || []), task],
    updatedAt: new Date().toISOString(),
  }
  writeJSON(KEY_CASES, all)
  log('case.task.add', `${task.title}${task.assignee ? ` -> ${task.assignee}` : ''}`, caseId)
  return task
}

export function addCaseDocument(caseId: string, input: {
  originalName: string
  internalName: string
  mimeType: string
  sizeBytes: number
  uploadedBy?: string
  category?: CaseDocument['category']
  languageHint?: CaseDocument['languageHint']
  dataUrl?: string
  storageMode?: CaseDocument['storageMode']
  serverDocumentId?: string
  storageProvider?: string
  checksumSha256?: string
  textContent?: string
}): CaseDocument | null {
  if (!guardAction('case.document.upload')) return null
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return null
  const doc: CaseDocument = {
    id: uid(),
    originalName: input.originalName,
    internalName: input.internalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    category: input.category,
    languageHint: input.languageHint,
    dataUrl: input.dataUrl,
    storageMode: input.storageMode,
    serverDocumentId: input.serverDocumentId,
    storageProvider: input.storageProvider,
    checksumSha256: input.checksumSha256,
    textContent: input.textContent,
  }
  all[idx] = {
    ...all[idx],
    documents: [...(all[idx].documents || []), doc],
    updatedAt: new Date().toISOString(),
  }
  writeJSON(KEY_CASES, all)
  log('case.document.upload', `${doc.internalName} (${Math.round(doc.sizeBytes / 1024)} KB)`, caseId)
  return doc
}

function updateDocumentInCase(
  caseId: string,
  documentId: string,
  patch: Partial<CaseDocument>,
): CaseDocument | null {
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const caseIdx = all.findIndex(c => c.id === caseId)
  if (caseIdx < 0) return null
  let updated: CaseDocument | null = null
  const documents = (all[caseIdx].documents || []).map(d => {
    if (d.id !== documentId) return d
    updated = { ...d, ...patch }
    return updated
  })
  all[caseIdx] = { ...all[caseIdx], documents, updatedAt: new Date().toISOString() }
  writeJSON(KEY_CASES, all)
  return updated
}

export function toggleCaseTask(caseId: string, taskId: string): void {
  if (!guardAction('case.task')) return
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return
  const tasks = (all[idx].tasks || []).map(t => {
    if (t.id !== taskId) return t
    const done = !t.done
    return { ...t, done, completedAt: done ? new Date().toISOString() : undefined }
  })
  all[idx] = { ...all[idx], tasks, updatedAt: new Date().toISOString() }
  writeJSON(KEY_CASES, all)
  const task = tasks.find(t => t.id === taskId)
  if (task?.done) log('case.task.done', task.title, caseId)
}

export function queueDocumentJob(caseId: string, input: {
  documentId?: string
  attachmentInternalName: string
  type: 'ocr' | 'translate'
  sourceLanguage?: DocumentJob['sourceLanguage']
  targetLanguage?: 'de'
  note?: string
}): DocumentJob | null {
  if (!guardAction('doc.job.queue')) return null
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const idx = all.findIndex(c => c.id === caseId)
  if (idx < 0) return null
  const settings = getSettings()
  const job: DocumentJob = {
    id: uid(),
    documentId: input.documentId,
    attachmentInternalName: input.attachmentInternalName,
    type: input.type,
    status: 'queued',
    requestedAt: new Date().toISOString(),
    requestedBy: settings.anwaltName || undefined,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    note: input.note,
  }
  all[idx] = {
    ...all[idx],
    documentJobs: [...(all[idx].documentJobs || []), job],
    updatedAt: new Date().toISOString(),
  }
  writeJSON(KEY_CASES, all)
  log(
    input.type === 'ocr' ? 'doc.ocr.queue' : 'doc.translate.queue',
    `${job.attachmentInternalName}${job.sourceLanguage ? ` [${job.sourceLanguage}]` : ''}`,
    caseId,
  )
  return job
}

export function runDocumentJob(caseId: string, jobId: string): DocumentJob | null {
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const caseIdx = all.findIndex(c => c.id === caseId)
  if (caseIdx < 0) return null
  const c = all[caseIdx]
  let targetJob: DocumentJob | null = null
  const jobs = (c.documentJobs || []).map(job => {
    if (job.id !== jobId) return job
    targetJob = { ...job, status: 'processing' }
    return targetJob
  })
  if (!targetJob) return null
  const currentJob: DocumentJob = targetJob

  const docs = c.documents || []
  const doc = docs.find(d => d.id === currentJob.documentId || d.internalName === currentJob.attachmentInternalName)
  const nextJobs = jobs.map(job => {
    if (job.id !== jobId) return job
    return { ...job, status: 'done' as const }
  })
  let nextDocs = docs
  if (doc && currentJob.type === 'ocr') {
    const ocrText = doc.textContent?.trim()
      ? doc.textContent
      : `OCR Beta-Ergebnis fuer ${doc.originalName}.\n\n` +
        `Noch kein echter OCR-Provider verbunden. Dieses Dokument ist fuer den spaeteren Produktions-Flow markiert.`
    nextDocs = docs.map(d => d.id === doc.id ? { ...d, ocrText } : d)
  }
  if (doc && currentJob.type === 'translate') {
    const source = doc.ocrText || doc.textContent || `Inhalt von ${doc.originalName}`
    const translatedTextDe =
      `Maschinelle DE-Arbeitsfassung (Beta)\n\nQuelle: ${doc.languageHint || 'unknown'}\n\n${source}`
    nextDocs = nextDocs.map(d => d.id === doc.id ? { ...d, translatedTextDe } : d)
  }
  all[caseIdx] = {
    ...c,
    documentJobs: nextJobs,
    documents: nextDocs,
    updatedAt: new Date().toISOString(),
  }
  writeJSON(KEY_CASES, all)
  return nextJobs.find(j => j.id === jobId) || null
}

export function applyDocumentJobResult(caseId: string, jobId: string, result: {
  status?: DocumentJob['status']
  ocrText?: string
  translatedTextDe?: string
}): DocumentJob | null {
  const all = readJSON<MandantCase[]>(KEY_CASES, [])
  const caseIdx = all.findIndex(c => c.id === caseId)
  if (caseIdx < 0) return null
  const currentCase = all[caseIdx]
  const job = (currentCase.documentJobs || []).find(j => j.id === jobId)
  if (!job) return null
  const nextJobs = (currentCase.documentJobs || []).map(j =>
    j.id === jobId ? { ...j, status: result.status || 'done' } : j,
  )
  const nextDocs = (currentCase.documents || []).map(d => {
    if (d.id !== job.documentId && d.internalName !== job.attachmentInternalName) return d
    return {
      ...d,
      ...(result.ocrText ? { ocrText: result.ocrText } : {}),
      ...(result.translatedTextDe ? { translatedTextDe: result.translatedTextDe } : {}),
    }
  })
  all[caseIdx] = {
    ...currentCase,
    documentJobs: nextJobs,
    documents: nextDocs,
    updatedAt: new Date().toISOString(),
  }
  writeJSON(KEY_CASES, all)
  return nextJobs.find(j => j.id === jobId) || null
}

export function markDocumentTranslationReviewed(caseId: string, documentId: string): void {
  if (!guardAction('doc.translation.review')) return
  const updated = updateDocumentInCase(caseId, documentId, { translationReviewed: true })
  if (updated) log('doc.review.done', updated.internalName, caseId)
}

// --- Research ---

export function listResearch(caseId?: string): ResearchQuery[] {
  const all = readJSON<ResearchQuery[]>(KEY_RESEARCH, [])
  return (caseId ? all.filter(r => r.caseId === caseId) : all).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function saveResearch(r: Omit<ResearchQuery, 'id' | 'createdAt'>): ResearchQuery {
  if (!guardAction('research.query')) throw new Error('Nicht berechtigt: research.query')
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

export function markResearchReviewed(id: string, approvedAnswer?: string): void {
  if (!guardAction('research.review')) return
  const all = readJSON<ResearchQuery[]>(KEY_RESEARCH, [])
  const idx = all.findIndex(r => r.id === id)
  if (idx < 0) return
  all[idx].reviewed = true
  if (approvedAnswer?.trim()) {
    all[idx].approvedAnswer = approvedAnswer.trim()
  }
  writeJSON(KEY_RESEARCH, all)
}

export function saveApprovedAnswerMemory(input: {
  caseId?: string
  question: string
  approvedAnswer: string
  sourceResearchId?: string
  practiceHint?: string
}): ApprovedAnswerMemory {
  if (!guardAction('research.review')) throw new Error('Nicht berechtigt: research.review')
  const access = getAccessContext()
  const item: ApprovedAnswerMemory = {
    id: uid(),
    tenantId: access?.tenantId,
    caseId: input.caseId,
    question: input.question,
    approvedAnswer: input.approvedAnswer,
    practiceHint: input.practiceHint,
    sourceResearchId: input.sourceResearchId,
    createdAt: new Date().toISOString(),
  }
  const all = readJSON<ApprovedAnswerMemory[]>(KEY_APPROVED_MEMORY, [])
  all.push(item)
  writeJSON(KEY_APPROVED_MEMORY, all.slice(-200))
  return item
}

export function listApprovedAnswerMemory(): ApprovedAnswerMemory[] {
  const access = getAccessContext()
  const tenantId = access?.tenantId
  const all = readJSON<ApprovedAnswerMemory[]>(KEY_APPROVED_MEMORY, [])
  return all
    .filter(m => !tenantId || m.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function scoreMemory(question: string, memory: ApprovedAnswerMemory): number {
  const qWords = new Set(question.toLowerCase().split(/[^a-zA-Z0-9äöüÄÖÜß]+/).filter(w => w.length >= 4))
  const mWords = new Set(`${memory.question} ${memory.approvedAnswer}`.toLowerCase().split(/[^a-zA-Z0-9äöüÄÖÜß]+/).filter(w => w.length >= 4))
  let score = 0
  qWords.forEach(w => { if (mWords.has(w)) score += 1 })
  return score
}

export function getApprovedMemoryExamples(question: string, limit = 3): ApprovedAnswerMemory[] {
  return listApprovedAnswerMemory()
    .map(m => ({ m, score: scoreMemory(question, m) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.m.createdAt.localeCompare(a.m.createdAt))
    .slice(0, limit)
    .map(x => x.m)
}

// --- Letters ---

export function listLetters(caseId?: string): GeneratedLetter[] {
  const all = readJSON<GeneratedLetter[]>(KEY_LETTERS, [])
  return (caseId ? all.filter(l => l.caseId === caseId) : all).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function saveLetter(l: Omit<GeneratedLetter, 'id' | 'createdAt'>): GeneratedLetter {
  if (!guardAction('letter.generate')) throw new Error('Nicht berechtigt: letter.generate')
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
  recordTemplateUsage(item.templateId)
  log('letter.generate', `template=${item.templateId}`, item.caseId)
  return item
}

export interface TemplateUsageEntry {
  templateId: string
  count: number
  lastUsedAt: string
  favorite?: boolean
}

export function listTemplateUsage(): TemplateUsageEntry[] {
  return readJSON<TemplateUsageEntry[]>(KEY_TEMPLATE_USAGE, []).sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
    if (b.count !== a.count) return b.count - a.count
    return b.lastUsedAt.localeCompare(a.lastUsedAt)
  })
}

export function getTemplateUsage(templateId: string): TemplateUsageEntry | undefined {
  return listTemplateUsage().find(t => t.templateId === templateId)
}

export function recordTemplateUsage(templateId: string): TemplateUsageEntry {
  const all = readJSON<TemplateUsageEntry[]>(KEY_TEMPLATE_USAGE, [])
  const now = new Date().toISOString()
  const idx = all.findIndex(t => t.templateId === templateId)
  let item: TemplateUsageEntry
  if (idx >= 0) {
    item = {
      ...all[idx],
      count: all[idx].count + 1,
      lastUsedAt: now,
    }
    all[idx] = item
  } else {
    item = { templateId, count: 1, lastUsedAt: now }
    all.push(item)
  }
  writeJSON(KEY_TEMPLATE_USAGE, all)
  return item
}

export function toggleTemplateFavorite(templateId: string): TemplateUsageEntry {
  if (!guardAction('template.edit')) throw new Error('Nicht berechtigt: template.edit')
  const all = readJSON<TemplateUsageEntry[]>(KEY_TEMPLATE_USAGE, [])
  const idx = all.findIndex(t => t.templateId === templateId)
  const now = new Date().toISOString()
  let item: TemplateUsageEntry
  if (idx >= 0) {
    item = {
      ...all[idx],
      favorite: !all[idx].favorite,
      lastUsedAt: now,
    }
    all[idx] = item
  } else {
    item = { templateId, count: 0, lastUsedAt: now, favorite: true }
    all.push(item)
  }
  writeJSON(KEY_TEMPLATE_USAGE, all)
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
  const access = getAccessContext()
  const all = readJSON<AuditEntry[]>(KEY_AUDIT, [])
  const prevHash = all.length > 0 ? all[all.length - 1].hash : 'root'
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    actor: settings.anwaltName || 'unbenannt',
    tenantId: access?.tenantId,
    actorRole: access?.role,
    action,
    detail,
    caseId,
    prevHash,
  }
  entry.hash = hashString([
    entry.id, entry.at, entry.actor, entry.action, entry.detail,
    entry.caseId || '', entry.tenantId || '', entry.actorRole || '', prevHash,
  ].join('|'))
  all.push(entry)
  // Cap at 1000 entries to avoid localStorage bloat. Real implementation
  // ships logs to a server.
  writeJSON(KEY_AUDIT, all.slice(-1000))
  recordAnalytics(action)
}

export function verifyAuditChain(entries: AuditEntry[]): { ok: boolean; brokenAt?: string } {
  let prev = 'root'
  for (const e of [...entries].sort((a, b) => a.at.localeCompare(b.at))) {
    const expected = hashString([
      e.id, e.at, e.actor, e.action, e.detail,
      e.caseId || '', e.tenantId || '', e.actorRole || '', prev,
    ].join('|'))
    if (e.prevHash !== prev || e.hash !== expected) {
      return { ok: false, brokenAt: e.id }
    }
    prev = e.hash || ''
  }
  return { ok: true }
}

// --- Intakes (Mandant:innen-Fragebogen-Eingänge) ---

export function listIntakes(opts?: { caseId?: string; reviewed?: boolean }): IntakeEntry[] {
  let all = readJSON<IntakeEntry[]>(KEY_INTAKES, [])
  if (opts?.caseId !== undefined) all = all.filter(i => i.caseId === opts.caseId)
  if (opts?.reviewed !== undefined) all = all.filter(i => i.reviewed === opts.reviewed)
  return all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function saveIntake(input: Omit<IntakeEntry, 'id' | 'submittedAt' | 'reviewed'>): IntakeEntry {
  const item: IntakeEntry = {
    ...input,
    id: uid(),
    submittedAt: new Date().toISOString(),
    reviewed: false,
  }
  const all = readJSON<IntakeEntry[]>(KEY_INTAKES, [])
  all.push(item)
  writeJSON(KEY_INTAKES, all)
  log(
    'intake.received',
    `${item.name}${item.email ? ` (${item.email})` : ''} — ${item.anliegen.slice(0, 80)}`,
    item.caseId,
  )
  return item
}

export function markIntakeReviewed(id: string): void {
  if (!guardAction('intake.review')) return
  const all = readJSON<IntakeEntry[]>(KEY_INTAKES, [])
  const idx = all.findIndex(i => i.id === id)
  if (idx < 0) return
  all[idx].reviewed = true
  writeJSON(KEY_INTAKES, all)
}

// --- Custom Musterbriefe ---

function extractPlaceholders(body: string): string[] {
  const set = new Set<string>()
  for (const m of body.matchAll(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi)) {
    set.add(m[1])
  }
  return Array.from(set)
}

export function listCustomTemplates(): CustomTemplate[] {
  return readJSON<CustomTemplate[]>(KEY_CUSTOM_TEMPLATES, []).sort((a, b) =>
    a.title.localeCompare(b.title, 'de'),
  )
}

export function getCustomTemplate(id: string): CustomTemplate | undefined {
  return listCustomTemplates().find(t => t.id === id)
}

export function saveCustomTemplate(input: {
  id?: string
  title: string
  description?: string
  body: string
}): CustomTemplate {
  if (!guardAction('template.edit')) throw new Error('Nicht berechtigt: template.edit')
  const all = readJSON<CustomTemplate[]>(KEY_CUSTOM_TEMPLATES, [])
  const now = new Date().toISOString()
  const placeholders = extractPlaceholders(input.body)
  if (input.id) {
    const idx = all.findIndex(t => t.id === input.id)
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        title: input.title,
        description: input.description,
        body: input.body,
        placeholders,
        updatedAt: now,
      }
      writeJSON(KEY_CUSTOM_TEMPLATES, all)
      return all[idx]
    }
  }
  const item: CustomTemplate = {
    id: uid(),
    title: input.title,
    description: input.description,
    body: input.body,
    placeholders,
    createdAt: now,
    updatedAt: now,
  }
  all.push(item)
  writeJSON(KEY_CUSTOM_TEMPLATES, all)
  return item
}

export function deleteCustomTemplate(id: string): void {
  if (!guardAction('template.edit')) return
  const all = readJSON<CustomTemplate[]>(KEY_CUSTOM_TEMPLATES, []).filter(t => t.id !== id)
  writeJSON(KEY_CUSTOM_TEMPLATES, all)
}

// --- Paragraph Notes ---

function noteKey(lawId: string, section: string): string {
  return `${lawId}:${section}`
}

export function getParagraphNote(lawId: string, section: string): ParagraphNote | undefined {
  const all = readJSON<ParagraphNote[]>(KEY_PARAGRAPH_NOTES, [])
  return all.find(n => n.key === noteKey(lawId, section))
}

export function saveParagraphNote(lawId: string, section: string, body: string): void {
  if (!guardAction('paragraph.note')) return
  const all = readJSON<ParagraphNote[]>(KEY_PARAGRAPH_NOTES, [])
  const key = noteKey(lawId, section)
  const now = new Date().toISOString()
  const idx = all.findIndex(n => n.key === key)
  if (body.trim() === '') {
    if (idx >= 0) {
      all.splice(idx, 1)
      writeJSON(KEY_PARAGRAPH_NOTES, all)
    }
    return
  }
  if (idx >= 0) {
    all[idx] = { ...all[idx], body, updatedAt: now }
  } else {
    all.push({ key, lawId, section, body, updatedAt: now })
  }
  writeJSON(KEY_PARAGRAPH_NOTES, all)
}

export function listParagraphNotes(): ParagraphNote[] {
  return readJSON<ParagraphNote[]>(KEY_PARAGRAPH_NOTES, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

// --- Reset (Datenschutz / Notausgang) ---

export function eraseAllProData(): void {
  ;[
    KEY_SETTINGS, KEY_CASES, KEY_RESEARCH, KEY_LETTERS,
    KEY_AUDIT, KEY_INVITE, KEY_INTAKES,
    KEY_CUSTOM_TEMPLATES, KEY_PARAGRAPH_NOTES,
    KEY_ACCESS_CTX, KEY_LAST_ACTIVE, KEY_ONBOARDING_DISMISSED,
    KEY_APPROVED_MEMORY, KEY_ANALYTICS,
  ].forEach(k => localStorage.removeItem(k))
}
