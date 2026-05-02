/**
 * Daten-Synchronisation.
 *
 * Zwei Ebenen:
 *
 * 1. **Manuell — JSON Export/Import** (heute, ohne Backend):
 *    Anwält:in exportiert komplette Pro-State als JSON-Datei → schickt
 *    Kollegin → importiert. Funktioniert sofort, kein Server, aber nicht
 *    automatisch.
 *
 * 2. **Cloud-Sync via Vercel KV** (vorbereitet, aktiviert wenn KV provisioniert):
 *    Jede Kanzlei hat einen `kanzleiKey` (UUID). Bei Save wird zusätzlich
 *    ein POST an `/api/sync/{kanzleiKey}` gesendet (Snapshot der Pro-State).
 *    Beim Laden GET. Last-write-wins per Entity über `updatedAt`.
 *    Für die finale Aktivierung muss `vercel kv create` ausgeführt und
 *    `KV_REST_API_URL` + `KV_REST_API_TOKEN` in den Vercel-Vars gesetzt
 *    werden — dann funktioniert es transparent.
 */

import type {
  AuditEntry,
  CustomTemplate,
  GeneratedLetter,
  IntakeEntry,
  KanzleiSettings,
  MandantCase,
  ParagraphNote,
  ResearchQuery,
} from './types'
import { fetchWithProSession } from './pro-api'

export interface ProStateSnapshot {
  version: '1'
  exportedAt: string
  kanzleiKey?: string
  settings: KanzleiSettings | null
  cases: MandantCase[]
  research: ResearchQuery[]
  letters: GeneratedLetter[]
  audit: AuditEntry[]
  intakes: IntakeEntry[]
  customTemplates: CustomTemplate[]
  paragraphNotes: ParagraphNote[]
}

const KEYS = {
  settings: 'gitlaw.pro.settings.v1',
  cases: 'gitlaw.pro.cases.v1',
  research: 'gitlaw.pro.research.v1',
  letters: 'gitlaw.pro.letters.v1',
  audit: 'gitlaw.pro.audit.v1',
  intakes: 'gitlaw.pro.intakes.v1',
  customTemplates: 'gitlaw.pro.customTemplates.v1',
  paragraphNotes: 'gitlaw.pro.paragraphNotes.v1',
  kanzleiKey: 'gitlaw.pro.kanzleiKey.v1',
  cloudSync: 'gitlaw.pro.cloudSync.v1',
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

// --- Kanzlei-Key (zur Identifikation der Kanzlei beim Cloud-Sync) ---

export function getKanzleiKey(): string {
  let key = localStorage.getItem(KEYS.kanzleiKey)
  if (!key) {
    key = 'kanzlei_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem(KEYS.kanzleiKey, key)
  }
  return key
}

export function setKanzleiKey(key: string): void {
  localStorage.setItem(KEYS.kanzleiKey, key.trim())
}

export function isCloudSyncEnabled(): boolean {
  return localStorage.getItem(KEYS.cloudSync) === '1'
}

export function setCloudSyncEnabled(on: boolean): void {
  localStorage.setItem(KEYS.cloudSync, on ? '1' : '0')
}

// --- Snapshot bauen / einspielen ---

export function buildSnapshot(): ProStateSnapshot {
  return {
    version: '1',
    exportedAt: new Date().toISOString(),
    kanzleiKey: localStorage.getItem(KEYS.kanzleiKey) || undefined,
    settings: readJSON<KanzleiSettings | null>(KEYS.settings, null),
    cases: readJSON(KEYS.cases, []),
    research: readJSON(KEYS.research, []),
    letters: readJSON(KEYS.letters, []),
    audit: readJSON(KEYS.audit, []),
    intakes: readJSON(KEYS.intakes, []),
    customTemplates: readJSON(KEYS.customTemplates, []),
    paragraphNotes: readJSON(KEYS.paragraphNotes, []),
  }
}

/**
 * Importiert ein Snapshot. `mode = 'merge'` führt last-write-wins per
 * Entity über `updatedAt` zusammen; `mode = 'replace'` überschreibt
 * vollständig. Default: merge.
 */
export function importSnapshot(snap: ProStateSnapshot, mode: 'merge' | 'replace' = 'merge'): {
  cases: number; research: number; letters: number; intakes: number; templates: number; notes: number
} {
  if (snap.version !== '1') throw new Error('Inkompatibles Snapshot-Format: Version ' + snap.version)

  if (mode === 'replace') {
    if (snap.settings) writeJSON(KEYS.settings, snap.settings)
    writeJSON(KEYS.cases, snap.cases)
    writeJSON(KEYS.research, snap.research)
    writeJSON(KEYS.letters, snap.letters)
    writeJSON(KEYS.audit, snap.audit)
    writeJSON(KEYS.intakes, snap.intakes)
    writeJSON(KEYS.customTemplates, snap.customTemplates)
    writeJSON(KEYS.paragraphNotes, snap.paragraphNotes)
    return {
      cases: snap.cases.length,
      research: snap.research.length,
      letters: snap.letters.length,
      intakes: snap.intakes.length,
      templates: snap.customTemplates.length,
      notes: snap.paragraphNotes.length,
    }
  }

  // Merge mode
  const counts = { cases: 0, research: 0, letters: 0, intakes: 0, templates: 0, notes: 0 }

  // Settings: import only if local is empty
  if (snap.settings) {
    const local = readJSON<KanzleiSettings | null>(KEYS.settings, null)
    if (!local || (!local.name && !local.anwaltName)) writeJSON(KEYS.settings, snap.settings)
  }

  // Cases — merge by id, keep newer updatedAt
  counts.cases = mergeArrayById<MandantCase>(KEYS.cases, snap.cases, c => c.updatedAt)
  counts.research = mergeArrayById<ResearchQuery>(KEYS.research, snap.research, r => r.createdAt)
  counts.letters = mergeArrayById<GeneratedLetter>(KEYS.letters, snap.letters, l => l.createdAt)

  // Audit — append-only, dedupe by id
  const audit = readJSON<AuditEntry[]>(KEYS.audit, [])
  const auditIds = new Set(audit.map(e => e.id))
  for (const e of snap.audit) {
    if (!auditIds.has(e.id)) audit.push(e)
  }
  writeJSON(KEYS.audit, audit.slice(-1000))

  // Intakes — merge by id
  counts.intakes = mergeArrayById<IntakeEntry>(KEYS.intakes, snap.intakes, i => i.submittedAt)

  // Custom Templates — merge by id, keep newer updatedAt
  counts.templates = mergeArrayById<CustomTemplate>(KEYS.customTemplates, snap.customTemplates, t => t.updatedAt)

  // Paragraph Notes — merge by key, keep newer updatedAt
  const notes = readJSON<ParagraphNote[]>(KEYS.paragraphNotes, [])
  const notesByKey = new Map(notes.map(n => [n.key, n]))
  for (const n of snap.paragraphNotes) {
    const existing = notesByKey.get(n.key)
    if (!existing || existing.updatedAt < n.updatedAt) {
      notesByKey.set(n.key, n)
      counts.notes++
    }
  }
  writeJSON(KEYS.paragraphNotes, Array.from(notesByKey.values()))

  return counts
}

function mergeArrayById<T extends { id: string }>(
  key: string,
  incoming: T[],
  timestampOf: (x: T) => string,
): number {
  const local = readJSON<T[]>(key, [])
  const byId = new Map(local.map(x => [x.id, x]))
  let changed = 0
  for (const x of incoming) {
    const existing = byId.get(x.id)
    if (!existing) {
      byId.set(x.id, x)
      changed++
    } else if (timestampOf(existing) < timestampOf(x)) {
      byId.set(x.id, x)
      changed++
    }
  }
  writeJSON(key, Array.from(byId.values()))
  return changed
}

// --- Manuell: Datei-Download / -Upload ---

export function downloadSnapshotFile(): void {
  const snap = buildSnapshot()
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gitlawpro-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importSnapshotFile(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<ReturnType<typeof importSnapshot>> {
  const text = await file.text()
  const snap = JSON.parse(text) as ProStateSnapshot
  return importSnapshot(snap, mode)
}

// --- Cloud-Sync (Upstash Redis via Vercel) ---

// --- Sync-Status für UI ---

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'success' | 'error' | 'disabled'

interface SyncState {
  status: SyncStatus
  lastSync: string | null  // ISO timestamp
  lastError: string | null
}

let syncState: SyncState = { status: 'idle', lastSync: null, lastError: null }
const syncListeners = new Set<(s: SyncState) => void>()

export function getSyncState(): SyncState {
  return { ...syncState }
}

export function subscribeSyncState(fn: (s: SyncState) => void): () => void {
  syncListeners.add(fn)
  return () => syncListeners.delete(fn)
}

function setSyncState(patch: Partial<SyncState>): void {
  syncState = { ...syncState, ...patch }
  syncListeners.forEach(fn => fn(syncState))
}

// --- Debounced Auto-Push ---

let pushTimer: ReturnType<typeof setTimeout> | null = null
const PUSH_DEBOUNCE_MS = 1500

/**
 * Wird aus store.ts nach jedem Write aufgerufen. Sammelt Schreibvorgänge
 * über 1.5 s und pusht dann einmal in die Cloud — vermeidet Flutting bei
 * mehreren schnellen Saves (z. B. Demo-Daten laden mit 9 Cases).
 */
export function schedulePush(): void {
  if (!isCloudSyncEnabled()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushToCloud().catch(() => { /* status already set in pushToCloud */ })
  }, PUSH_DEBOUNCE_MS)
}

export async function pushToCloud(): Promise<void> {
  if (!isCloudSyncEnabled()) {
    setSyncState({ status: 'disabled' })
    return
  }
  setSyncState({ status: 'pushing', lastError: null })
  const key = getKanzleiKey()
  const snap = buildSnapshot()
  try {
    const resp = await fetchWithProSession('/api/pro/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...snap, kanzleiKey: key }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    setSyncState({ status: 'success', lastSync: new Date().toISOString(), lastError: null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unbekannt'
    setSyncState({ status: 'error', lastError: msg })
    throw err
  }
}

export async function pullFromCloud(): Promise<{ ok: boolean; counts?: ReturnType<typeof importSnapshot>; error?: string }> {
  if (!isCloudSyncEnabled()) {
    setSyncState({ status: 'disabled' })
    return { ok: false, error: 'Cloud-Sync ist nicht aktiv' }
  }
  setSyncState({ status: 'pulling', lastError: null })
  getKanzleiKey()
  try {
    const resp = await fetchWithProSession('/api/pro/sync')
    if (resp.status === 404) {
      setSyncState({ status: 'success', lastSync: new Date().toISOString() })
      return { ok: true, counts: undefined }
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const snap = (await resp.json()) as ProStateSnapshot
    const counts = importSnapshot(snap, 'merge')
    setSyncState({ status: 'success', lastSync: new Date().toISOString() })
    return { ok: true, counts }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unbekannt'
    setSyncState({ status: 'error', lastError: msg })
    return { ok: false, error: msg }
  }
}
