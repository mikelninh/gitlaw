/**
 * Neon Postgres Connection-Wrapper.
 *
 * Exportiert:
 * - getSql()       — gepoolter Client für API-Handler (HTTP-Verbindung via Neon-Proxy)
 * - getSqlDirect() — ungepoolter Client für Migrations-Skripte
 * - requireDb()    — schreibt 503 und gibt false zurück wenn DATABASE_URL fehlt
 */
import { neon, neonConfig } from '@neondatabase/serverless'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { VercelResponse } from '@vercel/node'

// Fetch-basiertes Transport für Vercel Serverless + Edge
neonConfig.fetchConnectionCache = true

let _sql: NeonQueryFunction<false, false> | null = null
let _sqlDirect: NeonQueryFunction<false, false> | null = null

/**
 * Gepoolter Client — für API-Handler.
 * Wirft beim ersten Call wenn DATABASE_URL nicht gesetzt.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL ist nicht gesetzt. ' +
      'Vercel Marketplace → Neon → Connect to Project, dann: vercel env pull .env.local',
    )
  }
  _sql = neon(url)
  return _sql
}

/**
 * Ungepoolter Client — für Migrations-Skripte (braucht echte PG-Session).
 * Wirft beim ersten Call wenn weder DATABASE_URL_UNPOOLED noch DATABASE_URL gesetzt.
 */
export function getSqlDirect(): NeonQueryFunction<false, false> {
  if (_sqlDirect) return _sqlDirect
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL_UNPOOLED (oder DATABASE_URL) ist nicht gesetzt.',
    )
  }
  _sqlDirect = neon(url)
  return _sqlDirect
}

/**
 * Prüft ob DATABASE_URL gesetzt ist.
 * Schreibt 503 und gibt false zurück wenn nicht — sonst true.
 *
 * Verwendung in Endpoints:
 *   const sql = requireDb(res)
 *   if (!sql) return
 */
export function requireDb(res: VercelResponse): NeonQueryFunction<false, false> | false {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      error: 'Datenbank nicht konfiguriert.',
      hint: 'Vercel Marketplace → Neon → Connect to Project, dann neu deployen.',
    })
    return false
  }
  return getSql()
}

// Convenience-Export für direkten Import in Handlers (wirft wenn DATABASE_URL fehlt)
export { getSql as sql }
