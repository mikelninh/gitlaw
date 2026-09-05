import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  actionDigest,
  createAdvowareClient,
  exactApprovalFor,
  generateAdvowareHmac,
} from './advoware-client.mjs'
import { DECISIONS } from './core.mjs'

const FIXED_TIME = new Date('2026-08-30T00:00:00.000Z')
const API_KEY = Buffer.from('test-secret-key', 'utf8').toString('base64')

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function makeProvider({ apiResponses = [] } = {}) {
  const calls = []
  let apiIndex = 0
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    if (String(url).startsWith('https://www2.advo-net.net/AdvonetConfigurator/api/Url')) {
      return json(200, {
        connectorUrl: 'https://connector.local:22222/',
        relayUrl: 'https://relay.example.invalid/',
        securityGateway: 'https://security.example.invalid/',
      })
    }
    if (String(url) === 'https://security.example.invalid/api/v1/Token') {
      return json(200, { access_token: 'token-123', expires_in: 3600 })
    }
    const next = apiResponses[apiIndex++] ?? { status: 200, body: { ok: true } }
    return json(next.status, next.body)
  }
  return { calls, fetchImpl }
}

function clientWith(provider) {
  return createAdvowareClient({
    kanzlei: 'KANZLEI-01',
    database: 'ADVOWARE',
    user: 'bao',
    password: 'secret',
    appId: 'app-123',
    apiKey: API_KEY,
    fetchImpl: provider.fetchImpl,
    now: () => FIXED_TIME,
    nonceFactory: () => 'nonce-abc',
  })
}

test('Advoware HMAC matches the documented SHA-512 construction', () => {
  assert.equal(generateAdvowareHmac({
    appId: 'app-123',
    apiKey: API_KEY,
    nonce: 'nonce-abc',
    requestTimeStamp: FIXED_TIME.toISOString(),
  }), 'o7rz9KmoXZs550HfzO6ffiG17XwiPmlBHlksUYKZ3jcfolELow51Fw5KlrQqCK5y41aIValDjrh1iQ2GZ2WtqQ==')
})

test('read-only matter sync discovers, authenticates, prefers connectorUrl and then reuses session', async () => {
  const provider = makeProvider({
    apiResponses: [
      { status: 200, body: [{ Id: 17, Aktenzeichen: '123/26' }] },
      { status: 200, body: [{ Id: 18, Aktenzeichen: '124/26' }] },
    ],
  })
  const client = clientWith(provider)

  const first = await client.listMatters({ Search: '123/26' })
  assert.equal(first.status, 'executed')
  assert.equal(first.decision, DECISIONS.ALLOW)
  assert.equal(first.providerCalls, 3)
  assert.deepEqual(first.data, [{ Id: 17, Aktenzeichen: '123/26' }])
  assert.match(provider.calls[0].url, /AdvonetConfigurator\/api\/Url\?Kanzlei=KANZLEI-01/)
  assert.equal(provider.calls[1].url, 'https://security.example.invalid/api/v1/Token')
  assert.match(provider.calls[2].url, /^https:\/\/connector\.local:22222\/api\/v1\/Akten\?Search=123%2F26/)
  assert.equal(provider.calls[2].init.headers.Authorization, 'Bearer token-123')

  const authBody = JSON.parse(provider.calls[1].init.body)
  assert.equal(authBody.Product, 64)
  assert.equal(authBody.Role, 2)
  assert.equal(authBody.Nonce, 'nonce-abc')
  assert.equal(authBody.RequestTimeStamp, FIXED_TIME.toISOString())
  assert.equal(authBody.HMAC512Signature, generateAdvowareHmac({
    appId: 'app-123', apiKey: API_KEY, nonce: 'nonce-abc', requestTimeStamp: FIXED_TIME.toISOString(),
  }))

  const second = await client.listMatters({ Search: '124/26' })
  assert.equal(second.status, 'executed')
  assert.equal(second.providerCalls, 1)
  assert.equal(provider.calls.length, 4)
})

test('productive Advoware write requires exact approval before any network/auth call', async () => {
  const provider = makeProvider()
  const client = clientWith(provider)
  const body = { AktenId: 17, Datum: '2026-09-02', Text: 'Interne Wiedervorlage' }

  const denied = await client.execute('create_followup', { body })
  assert.equal(denied.status, 'approval_required')
  assert.equal(denied.decision, DECISIONS.APPROVAL)
  assert.equal(denied.providerCalls, 0)
  assert.equal(provider.calls.length, 0)

  const wrongApproval = exactApprovalFor({
    operation: 'create_followup',
    body: { ...body, Datum: '2026-09-03' },
    approvedBy: 'bao',
  })
  const stillDenied = await client.execute('create_followup', { body, approval: wrongApproval })
  assert.equal(stillDenied.status, 'approval_required')
  assert.equal(stillDenied.providerCalls, 0)
  assert.equal(provider.calls.length, 0)

  const approval = exactApprovalFor({ operation: 'create_followup', body, approvedBy: 'bao' })
  const executed = await client.execute('create_followup', { body, approval })
  assert.equal(executed.status, 'executed')
  assert.equal(executed.providerCalls, 3)
  assert.equal(provider.calls.length, 3)
  assert.equal(provider.calls[2].url, 'https://connector.local:22222/api/v1/Wiedervorlagen')
  assert.equal(provider.calls[2].init.method, 'POST')
  assert.deepEqual(JSON.parse(provider.calls[2].init.body), body)
})

test('approval is bound to operation, params and body digest', () => {
  const body = { AktenId: 17, Datum: '2026-09-02' }
  const a = exactApprovalFor({ operation: 'create_followup', body, approvedBy: 'bao' })
  assert.equal(a.action_digest, actionDigest({ operation: 'create_followup', body }))
  assert.notEqual(a.action_digest, actionDigest({ operation: 'create_followup', body: { ...body, Datum: '2026-09-03' } }))
  assert.notEqual(a.action_digest, actionDigest({ operation: 'update_matter', body }))
})

test('cross-matter Advoware access is blocked before discovery', async () => {
  const provider = makeProvider()
  const client = clientWith(provider)
  const result = await client.getMatter(17, { context: { cross_matter: true } })
  assert.equal(result.status, 'blocked')
  assert.equal(result.decision, DECISIONS.BLOCK)
  assert.equal(result.providerCalls, 0)
  assert.equal(provider.calls.length, 0)
})

test('unknown Advoware operation fails closed with zero provider calls', async () => {
  const provider = makeProvider()
  const client = clientWith(provider)
  const result = await client.execute('delete_everything')
  assert.equal(result.status, 'blocked')
  assert.equal(result.providerCalls, 0)
  assert.equal(provider.calls.length, 0)
})
