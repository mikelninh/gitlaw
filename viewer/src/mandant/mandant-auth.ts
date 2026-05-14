/**
 * Auth-State für das Mandanten-Portal — komplett getrennt von /pro.
 *
 * Warum eigene Keys: ProAuth nutzt gitlaw.pro.*, ein gemeinsamer State würde
 * den Mandanten unbeabsichtigt als Anwalt anmelden und guardAction-Checks
 * scheitern lassen. Sauber getrennte Silos sind einfacher als role-Shenanigans.
 */

const KEY_INVITE   = 'gitlaw.mandant.invite.v1'
const KEY_SESSION  = 'gitlaw.mandant.session.v1'
const KEY_LAST_ACTIVE = 'gitlaw.mandant.lastActive.v1'
const KEY_MANDANT_ID  = 'gitlaw.mandant.id.v1'

const VALID_MANDANT_TOKENS = new Set([
  'MANDANT-DEMO',
  // Phase 2: echte Magic-Links hier per API generieren und prüfen
])

export function isMandantTokenValid(token: string): boolean {
  return VALID_MANDANT_TOKENS.has(token.trim().toUpperCase())
}

export function setMandantSession(token: string, mandantId: string): void {
  localStorage.setItem(KEY_INVITE, token.trim().toUpperCase())
  localStorage.setItem(KEY_SESSION, token.trim().toUpperCase())
  localStorage.setItem(KEY_MANDANT_ID, mandantId)
  localStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()))
}

export function getMandantSession(): { token: string; mandantId: string } | null {
  const token = localStorage.getItem(KEY_SESSION)
  const mandantId = localStorage.getItem(KEY_MANDANT_ID)
  if (!token || !mandantId) return null
  return { token, mandantId }
}

export function getMandantId(): string | null {
  return localStorage.getItem(KEY_MANDANT_ID)
}

export function touchMandantActivity(): void {
  localStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()))
}

export function isMandantSessionExpired(timeoutMinutes = 240): boolean {
  const raw = localStorage.getItem(KEY_LAST_ACTIVE)
  if (!raw) return true
  const last = Number(raw)
  if (!Number.isFinite(last)) return true
  return Date.now() - last > timeoutMinutes * 60 * 1000
}

export function clearMandantSession(): void {
  ;[KEY_INVITE, KEY_SESSION, KEY_LAST_ACTIVE, KEY_MANDANT_ID].forEach(k =>
    localStorage.removeItem(k),
  )
}

/**
 * Leitet einen Demo-Token auf eine stabile mandantId ab.
 * Phase 2: echte IDs kommen vom Backend.
 */
export function mandantIdFromToken(token: string): string {
  const upper = token.trim().toUpperCase()
  if (upper === 'MANDANT-DEMO') return 'mandant-demo'
  return `mandant-${upper.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
}
