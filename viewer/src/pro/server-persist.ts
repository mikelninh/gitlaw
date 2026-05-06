const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'
const KEY_SESSION_TOKEN = 'gitlaw.pro.session.v1'
const debouncers = new Map<string, number>()

type CoreCollection = 'cases' | 'research' | 'letters'

function getToken(): string | null {
  try {
    return localStorage.getItem(KEY_SESSION_TOKEN)
  } catch {
    return null
  }
}

function collectionHeaders(): HeadersInit | null {
  const token = getToken()
  if (!token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function putCollection(collection: CoreCollection, items: unknown[]): Promise<void> {
  const headers = collectionHeaders()
  if (!headers) return
  await fetch(`${API_URL}/api/pro/entities?collection=${encodeURIComponent(collection)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ items }),
  }).catch(() => {
    // Best-effort dual write. Server is now primary; localStorage is offline fallback.
  })
}

/**
 * Immediate server-side persist for a single item.
 * Returns true on success, false on failure (caller should handle fallback).
 */
export async function putItem<T extends { id: string }>(collection: CoreCollection, item: T): Promise<boolean> {
  const headers = collectionHeaders()
  if (!headers) return false
  try {
    const resp = await fetch(
      `${API_URL}/api/pro/entities?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(item.id)}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ item }),
      },
    )
    return resp.ok
  } catch {
    return false
  }
}

/**
 * Fetch a single item from server by id.
 */
export async function getItem<T>(collection: CoreCollection, id: string): Promise<T | null> {
  const headers = collectionHeaders()
  if (!headers) return null
  try {
    const resp = await fetch(
      `${API_URL}/api/pro/entities?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,
      { method: 'GET', headers },
    )
    if (!resp.ok) return null
    const payload = (await resp.json()) as { ok: boolean; item?: T }
    return payload.ok && payload.item ? (payload.item as T) : null
  } catch {
    return null
  }
}

export function scheduleCoreCollectionPersist(collection: CoreCollection, items: unknown[]): void {
  const current = debouncers.get(collection)
  if (current) window.clearTimeout(current)
  const handle = window.setTimeout(() => {
    debouncers.delete(collection)
    void putCollection(collection, items)
  }, 700)
  debouncers.set(collection, handle)
}
