import { fetchWithProSession } from './pro-api'
import { getAccessContext } from './store'
import { buildSnapshot, importSnapshot, type ProStateSnapshot } from './sync'
import { decryptVault, encryptVault, type SecureVaultEnvelope } from './secure-vault-crypto'

function tenantBinding(): string {
  const tenantId = getAccessContext()?.tenantId
  if (!tenantId) throw new Error('Authentifizierter Tenant-Kontext fehlt.')
  return tenantId
}

export async function pushSecureVault(passphrase: string): Promise<{ ok: true; sizeBytes: number; ttlDays: number }> {
  const snapshot = buildSnapshot()
  const envelope = await encryptVault(snapshot, passphrase, tenantBinding())
  const resp = await fetchWithProSession('/api/pro/secure-sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  })
  if (!resp.ok) throw new Error(`Secure Vault Upload fehlgeschlagen (HTTP ${resp.status}).`)
  return await resp.json() as { ok: true; sizeBytes: number; ttlDays: number }
}

export async function pullSecureVault(passphrase: string): Promise<ReturnType<typeof importSnapshot>> {
  const resp = await fetchWithProSession('/api/pro/secure-sync', { method: 'GET' })
  if (!resp.ok) throw new Error(`Secure Vault Download fehlgeschlagen (HTTP ${resp.status}).`)
  const envelope = await resp.json() as SecureVaultEnvelope
  const snapshot = await decryptVault<ProStateSnapshot>(envelope, passphrase, tenantBinding())
  return importSnapshot(snapshot, 'merge')
}

export function snapshotContainsRealMandate(snapshot: ProStateSnapshot): boolean {
  return snapshot.cases.some(c => c.privacy?.dataMode !== 'synthetic')
}
