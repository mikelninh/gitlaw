/**
 * Persistenter Audit-Log-Helper.
 *
 * recordAudit() schreibt in:
 *   1. Redis-Liste  audit:{tenantId}  (LPUSH + LTRIM auf 10 000 Einträge)
 *   2. Postgres-Tabelle audit_log     (wenn DATABASE_URL gesetzt — Agent P3 erstellt Schema)
 *
 * DSGVO: userId wird als SHA-256-HMAC-Hash gespeichert (Pepper = GITLAW_SESSION_SECRET).
 * Kein Klartext-PII in Einträgen. Kein Logging dieser Funktion selbst (Endlos-Schleife).
 *
 * Integration (Agent P2/P4 übernehmen das):
 *   import { recordAudit } from '../_audit'
 *   await recordAudit(session.tenantId, session.userId, {
 *     action: 'case.create',
 *     entityType: 'case',
 *     entityId: newCase.id,
 *   })
 *
 * Empfohlene Einstiegspunkte:
 *   api/pro/session.ts          → action: 'login'
 *   api/mandant/case.ts         → action: 'case.create' | 'case.update' | 'case.archive'
 *   api/pro/upload.ts           → action: 'doc.upload'
 *   api/pro/akte-summary.ts     → action: 'ai.summary'
 *   api/pro/entities.ts         → action: 'ai.entities'
 *   api/pro/intake/**           → action: 'intake.received' | 'intake.reviewed'
 *   api/pro/sync.ts             → action: 'sync.push' | 'sync.pull'
 */

import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'

export interface AuditLlmUsage {
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  estimated_cost_usd: number
  request_id?: string
}

export interface AuditInput {
  action: string
  entityType: string
  entityId?: string
  /** Strukturierte Änderungen — KEIN PII darin speichern */
  diff?: Record<string, unknown>
  /** LLM-Token-Verbrauch + Kostenschätzung — wird für Cost-per-Mandant-Reporting genutzt */
  llm?: AuditLlmUsage
}

interface AuditRecord {
  id: string
  ts: string
  tenantId: string
  userHash: string
  action: string
  entityType: string
  entityId?: string
  diff?: Record<string, unknown>
  llm?: AuditLlmUsage
}

const REDIS_LIST_MAX = 10_000

function buildRedisClient(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return Redis.fromEnv()
}

/**
 * HMAC-SHA-256-Hash der userId — identischer Mechanismus wie hashEmail() in _auth.ts.
 * Pepper = GITLAW_SESSION_SECRET, damit Hash nicht ohne Key rückrechenbar ist.
 */
function hashUserId(userId: string): string {
  const pepper = process.env.GITLAW_SESSION_SECRET
  if (!pepper || pepper.length < 32) {
    // Ohne Pepper: einfacher SHA-256 (kein Rückschluss auf echte User, da userId nie PII ist)
    return crypto.createHash('sha256').update(userId).digest('hex')
  }
  return crypto.createHmac('sha256', pepper).update(userId).digest('hex')
}

function uid(): string {
  return crypto.randomUUID()
}

export async function recordAudit(
  tenantId: string,
  userId: string,
  input: AuditInput,
): Promise<void> {
  const record: AuditRecord = {
    id: uid(),
    ts: new Date().toISOString(),
    tenantId,
    userHash: hashUserId(userId),
    action: input.action,
    entityType: input.entityType,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.diff ? { diff: input.diff } : {}),
    ...(input.llm ? { llm: input.llm } : {}),
  }

  const redisKey = `audit:${tenantId}`

  // 1. Redis — primärer Speicher
  const redis = buildRedisClient()
  if (redis) {
    try {
      await redis.lpush(redisKey, JSON.stringify(record))
      await redis.ltrim(redisKey, 0, REDIS_LIST_MAX - 1)
    } catch (err) {
      // Redis-Fehler darf Endpoint nicht brechen — nur intern loggen
      console.error('[audit] redis write failed', (err as Error).message)
    }
  }

  // 2. Postgres — wenn DATABASE_URL gesetzt (Agent P3 erstellt Tabelle audit_log)
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(dbUrl)
      await sql`
        INSERT INTO audit_log (
          id, ts, tenant_id, user_hash, action, entity_type, entity_id, diff,
          llm_model, llm_prompt_tokens, llm_completion_tokens, llm_total_tokens, llm_estimated_cost_usd
        )
        VALUES (
          ${record.id},
          ${record.ts}::timestamptz,
          ${record.tenantId},
          ${record.userHash},
          ${record.action},
          ${record.entityType},
          ${record.entityId ?? null},
          ${record.diff ? JSON.stringify(record.diff) : null},
          ${record.llm?.model ?? null},
          ${record.llm?.prompt_tokens ?? null},
          ${record.llm?.completion_tokens ?? null},
          ${record.llm?.total_tokens ?? null},
          ${record.llm?.estimated_cost_usd ?? null}
        )
      `
    } catch {
      // Tabelle fehlt noch (P3 legt sie an) oder andere DB-Fehler — nicht fatal
      console.warn('[audit] postgres write skipped')
    }
  }
}
