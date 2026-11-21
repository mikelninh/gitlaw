import test from 'node:test'
import assert from 'node:assert/strict'
import { decryptVault, encryptVault, SECURE_VAULT_ITERATIONS } from '../../../viewer/src/pro/secure-vault-crypto.ts'

const passphrase = 'correct-horse-battery-staple-lawyer-vault'
const tenant = 'kanzlei-nguyen-test'
const payload = {
  cases: [{ id: 'matter-1', mandantName: 'MANDATE-CANARY-SUPERSECRET-81A2', aktenzeichen: '42/26' }],
  research: [{ question: 'confidential research question' }],
}

test('secure vault round-trips but envelope contains no mandate plaintext', async () => {
  const envelope = await encryptVault(payload, passphrase, tenant)
  const serialized = JSON.stringify(envelope)
  assert.equal(envelope.iterations, SECURE_VAULT_ITERATIONS)
  assert.equal(envelope.alg, 'AES-256-GCM')
  assert.equal(serialized.includes('MANDATE-CANARY-SUPERSECRET-81A2'), false)
  assert.equal(serialized.includes('42/26'), false)
  assert.equal(serialized.includes('confidential research question'), false)
  const restored = await decryptVault(envelope, passphrase, tenant)
  assert.deepEqual(restored, payload)
})

test('wrong passphrase and wrong tenant fail closed', async () => {
  const envelope = await encryptVault(payload, passphrase, tenant)
  await assert.rejects(() => decryptVault(envelope, 'wrong-passphrase-that-is-long-enough', tenant), /Vault konnte nicht entschlüsselt/)
  await assert.rejects(() => decryptVault(envelope, passphrase, 'other-tenant'), /gehört nicht zu diesem Tenant/)
})

test('ciphertext tampering is detected by AES-GCM authentication', async () => {
  const envelope = await encryptVault(payload, passphrase, tenant)
  const last = envelope.ciphertext.at(-1)
  const tampered = { ...envelope, ciphertext: envelope.ciphertext.slice(0, -1) + (last === 'A' ? 'B' : 'A') }
  await assert.rejects(() => decryptVault(tampered, passphrase, tenant), /Vault konnte nicht entschlüsselt/)
})
