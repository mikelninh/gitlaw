export const SECURE_VAULT_VERSION = 'gitlaw-secure-vault/1' as const
export const SECURE_VAULT_ITERATIONS = 600_000
const AAD_PREFIX = 'gitlaw-pro-secure-vault-v1'

export interface SecureVaultEnvelope {
  version: typeof SECURE_VAULT_VERSION
  alg: 'AES-256-GCM'
  kdf: 'PBKDF2-HMAC-SHA256'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  tenantBindingDigest: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64(new Uint8Array(digest))
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (passphrase.length < 16) throw new Error('Vault-Passphrase muss mindestens 16 Zeichen lang sein.')
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function aad(tenantBinding: string): Uint8Array {
  return new TextEncoder().encode(`${AAD_PREFIX}:${tenantBinding}`)
}

export async function encryptVault(plaintext: unknown, passphrase: string, tenantBinding: string): Promise<SecureVaultEnvelope> {
  if (!tenantBinding.trim()) throw new Error('Tenant-Bindung fehlt.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt, SECURE_VAULT_ITERATIONS)
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(tenantBinding), tagLength: 128 },
    key,
    encoded,
  )
  return {
    version: SECURE_VAULT_VERSION,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: SECURE_VAULT_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    tenantBindingDigest: await sha256(tenantBinding),
  }
}

export async function decryptVault<T>(envelope: SecureVaultEnvelope, passphrase: string, tenantBinding: string): Promise<T> {
  if (envelope.version !== SECURE_VAULT_VERSION || envelope.alg !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-HMAC-SHA256') {
    throw new Error('Unbekanntes Secure-Vault-Format.')
  }
  if (envelope.iterations < SECURE_VAULT_ITERATIONS) throw new Error('Vault-KDF ist schwächer als die aktuelle Mindestanforderung.')
  if (envelope.tenantBindingDigest !== await sha256(tenantBinding)) throw new Error('Vault gehört nicht zu diesem Tenant-Kontext.')
  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const ciphertext = base64ToBytes(envelope.ciphertext)
  const key = await deriveKey(passphrase, salt, envelope.iterations)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad(tenantBinding), tagLength: 128 },
      key,
      ciphertext,
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as T
  } catch {
    throw new Error('Vault konnte nicht entschlüsselt werden: falsche Passphrase, falscher Tenant oder manipulierte Daten.')
  }
}
