import { getStoredSessionToken } from './store'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

interface SessionResponse {
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

export async function uploadDocumentToVault(file: File, caseId?: string): Promise<{
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

export async function downloadServerDocument(documentId: string): Promise<void> {
  const resp = await fetchWithProSession(`/api/pro/upload?id=${encodeURIComponent(documentId)}`, {
    method: 'GET',
  })
  if (!resp.ok) throw new Error(`Download failed (HTTP ${resp.status})`)
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = documentId
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
