export const SHADOW_LOCK_KEY = 'gitlaw.pro.shadowLock.v1'
const CLOUD_SYNC_KEY = 'gitlaw.pro.cloudSync.v1'

export interface ShadowLockState {
  enabled: boolean
  activatedAt: string | null
  purpose: 'friday_real_mandate_shadow' | null
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function getShadowLockState(): ShadowLockState {
  if (!storageAvailable()) return { enabled: false, activatedAt: null, purpose: null }
  try {
    const raw = window.sessionStorage.getItem(SHADOW_LOCK_KEY)
    if (!raw) return { enabled: false, activatedAt: null, purpose: null }
    const parsed = JSON.parse(raw) as Partial<ShadowLockState>
    return {
      enabled: parsed.enabled === true,
      activatedAt: typeof parsed.activatedAt === 'string' ? parsed.activatedAt : null,
      purpose: parsed.purpose === 'friday_real_mandate_shadow' ? parsed.purpose : null,
    }
  } catch {
    // Corrupt lock state must fail safer: keep the browser in Shadow Lock.
    return { enabled: true, activatedAt: null, purpose: 'friday_real_mandate_shadow' }
  }
}

export function isShadowLockEnabled(): boolean {
  return getShadowLockState().enabled
}

export function enableShadowLock(): ShadowLockState {
  const next: ShadowLockState = {
    enabled: true,
    activatedAt: new Date().toISOString(),
    purpose: 'friday_real_mandate_shadow',
  }
  if (storageAvailable()) {
    window.sessionStorage.setItem(SHADOW_LOCK_KEY, JSON.stringify(next))
    // Defense in depth: the existing cloud-sync preference is disabled too.
    window.localStorage.setItem(CLOUD_SYNC_KEY, '0')
    window.dispatchEvent(new CustomEvent('gitlaw:shadow-lock-change', { detail: next }))
  }
  return next
}

export function disableShadowLock(): ShadowLockState {
  const next: ShadowLockState = { enabled: false, activatedAt: null, purpose: null }
  if (storageAvailable()) {
    window.sessionStorage.removeItem(SHADOW_LOCK_KEY)
    // Cloud sync remains OFF. Ending Shadow Lock never silently re-enables egress.
    window.localStorage.setItem(CLOUD_SYNC_KEY, '0')
    window.dispatchEvent(new CustomEvent('gitlaw:shadow-lock-change', { detail: next }))
  }
  return next
}

export function assertExternalAiAllowed(): void {
  if (isShadowLockEnabled()) {
    throw new Error('P1 Shadow Lock aktiv: externer KI-Aufruf ist für diese Browser-Session blockiert.')
  }
}
