/**
 * Shared helper: Soft-Delete-Marker für DSGVO Art. 17.
 *
 * Setzt / liest einen Deletion-Marker `tenantDeletion:{tenantId}` in Redis.
 *
 * INTEGRATION-GAP (TODO für Agent P3 / Follow-up):
 *   api/pro/entities.ts und api/mandant/case.ts prüfen diesen Marker noch NICHT.
 *   Solange das nicht gemacht ist, können Daten nach Soft-Delete-Request noch
 *   gelesen werden. Die Endpoints müssen isDeletionPending aufrufen und mit
 *   410 Gone antworten, bevor sie irgendwelche Nutzdaten zurückgeben.
 *   Beispiel:
 *     const pending = await isDeletionPending(redis, tenantId)
 *     if (pending) return res.status(410).json({ error: 'Tenant ist gelöscht', scheduledFor: pending.scheduledFor })
 */

import { Redis } from '@upstash/redis'

export interface DeletionMarker {
  tenantId: string
  requestedAt: string
  requestedBy: string
  scope: 'tenant' | 'mandant'
  mandantToken?: string
  /** ISO-Date: 30 Tage nach requestedAt */
  scheduledFor: string
}

export async function isDeletionPending(
  redis: Redis,
  tenantId: string,
): Promise<DeletionMarker | null> {
  return redis.get<DeletionMarker>(`tenantDeletion:${tenantId}`)
}

export async function writeDeletionMarker(
  redis: Redis,
  marker: DeletionMarker,
): Promise<void> {
  // 35 Tage TTL — 30 Tage Recovery + 5 Tage Puffer für Cron-Job
  const ttlSeconds = 35 * 24 * 60 * 60
  await redis.set(`tenantDeletion:${marker.tenantId}`, marker, { ex: ttlSeconds })
}

export async function clearDeletionMarker(
  redis: Redis,
  tenantId: string,
): Promise<void> {
  await redis.del(`tenantDeletion:${tenantId}`)
}
