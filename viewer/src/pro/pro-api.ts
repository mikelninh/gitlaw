import { getStoredSessionToken } from './store'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

export interface SessionResponse {
  token?: string
  access: {
    tenantId: string
    userId: string
    role: 'owner' | 'anwalt' | 'assistenz' | 'read_only'
    sessionExpiresAt?: string
  }
}

function sessionHeaders(extra?: HeadersInit): HeadersInit {
  const token = getStoredSessionToken()
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ---------------------------------------------------------------------------
// Magic-Link Auth
// ---------------------------------------------------------------------------

export async function requestMagicLink(email: string): Promise<void> {
  await fetch(`${API_URL}/api/pro/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  // Antwort wird ignoriert — Server antwortet immer { ok: true } (kein Enumeration-Leak)
}

export async function verifyMagicLink(token: string): Promise<SessionResponse> {
  const resp = await fetch(`${API_URL}/api/pro/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: string }
    throw new Error(body?.error || `Verifizierung fehlgeschlagen (HTTP ${resp.status})`)
  }
  return (await resp.json()) as SessionResponse
}

// ---------------------------------------------------------------------------
// Legacy invite-token (Beta)
// ---------------------------------------------------------------------------

export async function exchangeInviteForSession(invite: string): Promise<SessionResponse> {
  const resp = await fetch(`${API_URL}/api/pro/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite }),
  })
  if (!resp.ok) throw new Error(`Session exchange failed (HTTP ${resp.status})`)
  return (await resp.json()) as SessionResponse
}

export async function resumeSession(): Promise<SessionResponse> {
  const resp = await fetch(`${API_URL}/api/pro/session`, {
    method: 'GET',
    headers: sessionHeaders(),
  })
  if (!resp.ok) throw new Error(`Session resume failed (HTTP ${resp.status})`)
  return (await resp.json()) as SessionResponse
}

export async function fetchWithProSession(input: string, init?: RequestInit): Promise<Response> {
  const headers = sessionHeaders(init?.headers)
  return fetch(`${API_URL}${input}`, { ...init, headers })
}

export async function uploadDocumentToVault(file: File, caseId?: string, checklistItemId?: string): Promise<{
  ok: true
  documentId: string
  storageMode: 'server_vault'
  storageProvider: string
  checksumSha256: string
}> {
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

  const resp = await fetchWithProSession('/api/pro/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      base64,
      ...(checklistItemId ? { checklistItemId } : {}),
    }),
  })
  if (!resp.ok) {
    const detail = await resp.json().catch(() => ({}))
    throw new Error(detail?.error || `Upload failed (HTTP ${resp.status})`)
  }
  return (await resp.json()) as {
    ok: true
    documentId: string
    storageMode: 'server_vault'
    storageProvider: string
    checksumSha256: string
  }
}

export async function getServerDocumentMeta(documentId: string): Promise<{
  ok: true
  documentId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  checksumSha256?: string | null
  storageProvider?: string | null
  uploadedAt?: string | null
  uploadedBy?: string | null
}> {
  const resp = await fetchWithProSession(`/api/pro/upload?id=${encodeURIComponent(documentId)}&meta=1`, {
    method: 'GET',
  })
  if (!resp.ok) throw new Error(`Meta lookup failed (HTTP ${resp.status})`)
  return (await resp.json()) as {
    ok: true
    documentId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    checksumSha256?: string | null
    storageProvider?: string | null
    uploadedAt?: string | null
    uploadedBy?: string | null
  }
}

export async function fetchServerDocumentBlob(documentId: string): Promise<Blob> {
  const resp = await fetchWithProSession(`/api/pro/upload?id=${encodeURIComponent(documentId)}`, {
    method: 'GET',
  })
  if (!resp.ok) throw new Error(`Download failed (HTTP ${resp.status})`)
  return resp.blob()
}

export async function downloadServerDocument(documentId: string): Promise<void> {
  const blob = await fetchServerDocumentBlob(documentId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = documentId
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Oeffnet ein Dokument aus dem Server-Vault im Browser.
 * PDF → neuer Tab, Bild → gibt Object-URL zurueck (fuer Lightbox).
 * Aufrufer ist verantwortlich fuer revokeObjectURL bei Bildern.
 */
export async function viewServerDocument(
  documentId: string,
  mimeType: string,
): Promise<{ mode: 'tab' } | { mode: 'image'; objectUrl: string }> {
  const blob = await fetchServerDocumentBlob(documentId)
  const url = URL.createObjectURL(blob)
  if (mimeType === 'application/pdf') {
    window.open(url, '_blank')
    // Kurz warten, dann freigeben — der Tab hat das PDF bereits geladen
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return { mode: 'tab' }
  }
  return { mode: 'image', objectUrl: url }
}

export interface DeleteDocumentResult {
  ok: boolean
  alreadyGone: boolean
  source?: string
  error?: string
}

export async function deleteServerDocument(documentId: string): Promise<DeleteDocumentResult> {
  const resp = await fetchWithProSession(`/api/pro/document?id=${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  })
  if (resp.status === 404) {
    // Serverseitig bereits weg — kein Fehler, lokale Bereinigung ist korrekt
    const body = await resp.json().catch(() => ({})) as { alreadyGone?: boolean; error?: string }
    return { ok: true, alreadyGone: true, error: body?.error }
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: string }
    throw new Error(body?.error || `Loeschen fehlgeschlagen (HTTP ${resp.status})`)
  }
  const body = await resp.json().catch(() => ({})) as { ok?: boolean; source?: string }
  return { ok: true, alreadyGone: false, source: body?.source }
}

export interface IntakeClassification {
  doc_type:
    | 'Brief'
    | 'Email'
    | 'Bescheid'
    | 'Mahnung'
    | 'Klage'
    | 'Vertrag'
    | 'Rechnung'
    | 'Foto'
    | 'Screenshot'
    | 'Sonstiges'
  document_date: string | null
  sender: string | null
  recipient: string | null
  parties: string[]
  aktenzeichen: string | null
  summary_de: string
  suggested_filename: string
  confidence: number
  needs_review: boolean
}

export interface IntakeClassifyResult {
  ok: true
  serverDocumentId: string
  fileName: string | null
  mimeType: string
  ocr_text: string
  classification: IntakeClassification
}

export async function classifyIntakeDocument(serverDocumentId: string): Promise<IntakeClassifyResult> {
  const resp = await fetchWithProSession('/api/pro/intake/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverDocumentId }),
  })
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(payload?.error || `Classification failed (HTTP ${resp.status})`)
  return payload as IntakeClassifyResult
}

export async function runRemoteDocumentProcessing(input: {
  caseId: string
  attachmentInternalName: string
  mode: 'ocr' | 'translate'
  sourceLanguage?: string
  targetLanguage?: 'de'
  serverDocumentId?: string
  sourceText?: string
}): Promise<{ ok: boolean; status: string; provider?: string; ocrText?: string; translatedTextDe?: string; message?: string }> {
  const resp = await fetchWithProSession('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(payload?.error || payload?.message || `Processing failed (HTTP ${resp.status})`)
  return payload as { ok: boolean; status: string; provider?: string; ocrText?: string; translatedTextDe?: string; message?: string }
}


// ---------------------------------------------------------------------------
// Visa-Kompass-Briefings (server-side intakes via /api/pro/intake/server-list)
// ---------------------------------------------------------------------------

export interface VisaKompassBriefing {
  id: string
  tenantId: string
  receivedAt: string
  source: 'visa-kompass'
  reviewed: boolean
  client: {
    name: string
    email?: string
    phone?: string
    language: 'de' | 'en' | 'vi'
  }
  caseHint?: { visaSlug?: string; topic?: string }
  intake: {
    quizContext?: {
      topVisaSlug?: string
      topVisaName?: string
      matchScore?: number
      answers?: Record<string, unknown>
    }
    triage?: {
      complexity?: string
      urgencyDays?: number
      suggestedFocusArea?: string
      suggestedPriceRange?: string
    }
    germanSummary?: string
    germanTranslation?: string
    replyDraft?: string
    docChecklist?: { label: string; detail?: string; vnSpecificNote?: string }[]
    vnSpecificNotes?: string[]
    originalMessage?: string
    vcJwt?: string
  }
}

export async function listVisaKompassBriefings(): Promise<VisaKompassBriefing[]> {
  const resp = await fetchWithProSession('/api/pro/intake/server-list', { method: 'GET' })
  if (!resp.ok) {
    if (resp.status === 503) return []
    throw new Error(`Briefings load failed (HTTP ${resp.status})`)
  }
  const data = (await resp.json()) as { ok: boolean; items: VisaKompassBriefing[] }
  return data.items ?? []
}

export async function markVisaKompassBriefingReviewed(id: string): Promise<void> {
  await fetchWithProSession('/api/pro/intake/server-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark-reviewed', id }),
  })
}

export async function deleteVisaKompassBriefing(id: string): Promise<void> {
  await fetchWithProSession('/api/pro/intake/server-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  })
}
