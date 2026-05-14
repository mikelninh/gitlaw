/**
 * Shared invite-token resolver: Postgres-first, Redis-Fallback.
 * Stellt sicher dass Mandanten-Endpoints konsistent authentifizieren —
 * auch wenn Redis-TTL abgelaufen ist aber Token in Postgres noch aktiv.
 */

import crypto from 'crypto'
import { Redis } from '@upstash/redis'
import { getSql } from '../_db'
import type { MandantInvite } from '../pro/mandant-invite'

const redis = Redis.fromEnv()

export interface ResolvedInvite {
  tenantId: string  // tenant slug (z.B. 'kanzlei-nguyen')
  caseId: string
  lang: 'de' | 'vi'
  expiresAt: number  // unix seconds (Redis-Form) oder 0 (Postgres-Form, dort schon validiert)
}

async function fromPostgres(token: string): Promise<ResolvedInvite | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const sql = getSql()
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const rows = await sql`
      SELECT mi.case_id, mi.lang, t.slug AS tenant_slug
      FROM mandant_invitations mi
      JOIN tenants t ON t.id = mi.tenant_id
      WHERE mi.token_hash = ${tokenHash}
        AND mi.expires_at > now()
        AND mi.revoked_at IS NULL
      LIMIT 1
    `
    if (!rows[0]) return null
    return {
      tenantId: rows[0].tenant_slug as string,
      caseId: rows[0].case_id as string,
      lang: (rows[0].lang as 'de' | 'vi') ?? 'de',
      expiresAt: 0,
    }
  } catch (err) {
    console.warn('[invite-resolver] Postgres-Lookup fehlgeschlagen:', err instanceof Error ? err.message : err)
    return null
  }
}

async function fromRedis(token: string): Promise<ResolvedInvite | null> {
  try {
    const invite = await redis.get<MandantInvite>(`mandantInvite:${token}`)
    if (!invite) return null
    const now = Math.floor(Date.now() / 1000)
    if (invite.expiresAt < now) return null
    return {
      tenantId: invite.tenantId,
      caseId: invite.caseId,
      lang: invite.lang,
      expiresAt: invite.expiresAt,
    }
  } catch (err) {
    console.warn('[invite-resolver] Redis-Lookup fehlgeschlagen:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function resolveMandantInvite(token: string): Promise<ResolvedInvite | null> {
  const trimmed = token.trim()
  if (!trimmed) return null
  const pg = await fromPostgres(trimmed)
  if (pg) return pg
  return fromRedis(trimmed)
}
