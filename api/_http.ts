import type { VercelRequest, VercelResponse } from '@vercel/node'

// Hardcoded Fallback-Origins — überschreibbar via GITLAW_CORS_ORIGINS (komma-separiert)
const DEFAULT_ORIGINS = [
  'https://gitlaw-xi.vercel.app',
  'https://gitlaw.app',
  'https://viewer-tawny.vercel.app',
  'https://mikelninh.github.io',
  'https://mikelninh.github.io/gitlaw',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5177',
]

function buildAllowedOrigins(): Set<string> {
  const env = process.env.GITLAW_CORS_ORIGINS
  if (env) {
    return new Set(env.split(',').map((o) => o.trim()).filter(Boolean))
  }
  return new Set(DEFAULT_ORIGINS)
}

const ALLOWED_ORIGINS = buildAllowedOrigins()

// Vercel Preview-Deployments haben dynamische Subdomains — Wildcard-Match
function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin
  if (ALLOWED_ORIGINS.has(normalized)) return true
  // *.vercel.app — deckt alle Preview-URLs ab
  try {
    const url = new URL(normalized)
    if (url.hostname.endsWith('.vercel.app') && url.protocol === 'https:') return true
  } catch {
    // ungültige URL → ablehnen
  }
  return false
}

export function applySecurityHeaders(res: VercelResponse): void {
  // Kein Caching sensibler Payloads
  res.setHeader('Cache-Control', 'no-store')
  // Defense in Depth: diese Headers setzt vercel.json zentral, hier nochmal explizit
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string): boolean {
  const origin = req.headers.origin

  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (!origin) return true
  if (isAllowedOrigin(origin)) {
    const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin
    res.setHeader('Access-Control-Allow-Origin', normalized)
    return true
  }
  return false
}
