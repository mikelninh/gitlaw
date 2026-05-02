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
    // Best-effort dual write. Local state remains primary until full server persistence lands.
  })
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
