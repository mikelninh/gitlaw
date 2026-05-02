import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_ORIGINS = new Set([
  'https://gitlaw-xi.vercel.app',
  'https://viewer-tawny.vercel.app',
  'https://mikelninh.github.io',
  'https://mikelninh.github.io/gitlaw',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function normalizeOrigin(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin
}

export function applySecurityHeaders(res: VercelResponse): void {
  // Avoid caching potentially sensitive query payloads and sync snapshots.
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string): boolean {
  const origin = req.headers.origin

  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (!origin) return true
  const normalized = normalizeOrigin(origin)
  if (ALLOWED_ORIGINS.has(normalized)) {
    res.setHeader('Access-Control-Allow-Origin', normalized)
    return true
  }
  return false
}
