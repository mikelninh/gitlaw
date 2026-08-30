import crypto from 'node:crypto'
import { DECISIONS, digest } from './core.mjs'
import { decideAdvowareAction } from './advoware-policy.mjs'

const CONFIG_URL = 'https://www2.advo-net.net/AdvonetConfigurator/api/Url'
const PRODUCT_ID = 64

const OPERATIONS = Object.freeze({
  list_matters: { method: 'GET', path: '/api/v1/Akten', action: 'advoware.matter.read' },
  get_matter: { method: 'GET', path: ({ id }) => `/api/v1/Akten/${encodeURIComponent(String(id))}`, action: 'advoware.matter.read' },
  new_activities: { method: 'GET', path: '/api/v1/NewActivities', action: 'advoware.activity.read' },
  create_followup: { method: 'POST', path: '/api/v1/Wiedervorlagen', action: 'advoware.followup.write' },
  attach_file: { method: 'POST', path: '/api/v1/File', action: 'advoware.file.attach' },
  create_invoice: { method: 'POST', path: '/api/v1/Rechnungen', action: 'advoware.invoice.create' },
  update_invoice: { method: 'PUT', path: '/api/v1/Rechnungen', action: 'advoware.invoice.update' },
  update_matter: { method: 'PUT', path: ({ id }) => `/api/v1/Akten/${encodeURIComponent(String(id))}`, action: 'advoware.matter.update' },
})

function slashless(url) {
  return String(url || '').replace(/\/+$/, '')
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function actionDigest({ operation, params = {}, body = null }) {
  return digest(canonical({ operation, params, body }))
}

export function exactApprovalFor({ operation, params = {}, body = null, approvedBy = 'lawyer' }) {
  return {
    decision: DECISIONS.ALLOW,
    operation,
    action_digest: actionDigest({ operation, params, body }),
    approved_by: approvedBy,
  }
}

export function generateAdvowareHmac({ appId, apiKey, nonce, requestTimeStamp, product = PRODUCT_ID }) {
  if (!appId || !apiKey || !nonce || !requestTimeStamp) throw new Error('appId, apiKey, nonce und requestTimeStamp sind erforderlich')
  const key = Buffer.from(apiKey, 'base64')
  const message = `${product}:${appId}:${nonce}:${requestTimeStamp}`
  return crypto.createHmac('sha512', key).update(message, 'utf8').digest('base64')
}

export function createAdvowareClient({
  kanzlei,
  database = 'ADVOWARE',
  user,
  password,
  appId,
  apiKey,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  nonceFactory = () => crypto.randomUUID(),
} = {}) {
  if (!kanzlei || !user || !password || !appId || !apiKey) throw new Error('Advoware Kanzlei/User/Password/App-ID/API-Key erforderlich')
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl fehlt')

  let discovery = null
  let token = null
  let tokenExpiresAt = 0
  let totalProviderCalls = 0

  async function providerFetch(...args) {
    totalProviderCalls += 1
    return fetchImpl(...args)
  }

  async function discover() {
    if (discovery) return discovery
    const res = await providerFetch(`${CONFIG_URL}?Kanzlei=${encodeURIComponent(kanzlei)}`, { method: 'GET', headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`advoware_discovery_failed:${res.status}`)
    const data = await res.json()
    const apiBase = slashless(data.connectorUrl || data.relayUrl)
    const securityGateway = slashless(data.securityGateway)
    if (!apiBase || !securityGateway) throw new Error('advoware_discovery_incomplete')
    discovery = { apiBase, securityGateway }
    return discovery
  }

  async function authenticate() {
    const time = now().getTime()
    if (token && time < tokenExpiresAt) return token
    const d = await discover()
    const requestTimeStamp = now().toISOString()
    const nonce = nonceFactory()
    const HMAC512Signature = generateAdvowareHmac({ appId, apiKey, nonce, requestTimeStamp })
    const body = {
      AppID: appId,
      Kanzlei: kanzlei,
      Database: database,
      User: user,
      Role: 2,
      Product: PRODUCT_ID,
      Password: password,
      Nonce: nonce,
      HMAC512Signature,
      RequestTimeStamp: requestTimeStamp,
    }
    const res = await providerFetch(`${d.securityGateway}/api/v1/Token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`advoware_auth_failed:${res.status}`)
    const auth = await res.json()
    if (!auth.access_token) throw new Error('advoware_auth_missing_token')
    token = auth.access_token
    const expiresSeconds = Number(auth.expires_in || 3600)
    tokenExpiresAt = now().getTime() + Math.max(1, expiresSeconds - 30) * 1000
    return token
  }

  async function execute(operation, { params = {}, body = null, approval = null, context = {} } = {}) {
    const spec = OPERATIONS[operation]
    if (!spec) return { status: 'blocked', decision: DECISIONS.BLOCK, reason: 'unknown_advoware_operation', providerCalls: 0 }

    const authority = decideAdvowareAction(spec.action, context)
    const expectedDigest = actionDigest({ operation, params, body })

    if (authority.decision === DECISIONS.BLOCK) {
      return { status: 'blocked', decision: DECISIONS.BLOCK, reason: authority.reason, action_digest: expectedDigest, providerCalls: 0 }
    }

    if (authority.decision === DECISIONS.APPROVAL) {
      const exact = approval?.decision === DECISIONS.ALLOW &&
        approval?.operation === operation &&
        approval?.action_digest === expectedDigest &&
        Boolean(approval?.approved_by)
      if (!exact) {
        return { status: 'approval_required', decision: DECISIONS.APPROVAL, reason: authority.reason, action_digest: expectedDigest, providerCalls: 0 }
      }
    }

    const callsBefore = totalProviderCalls
    const d = await discover()
    const accessToken = await authenticate()
    const path = typeof spec.path === 'function' ? spec.path(params) : spec.path
    const url = new URL(`${d.apiBase}${path}`)
    for (const [key, value] of Object.entries(params.query || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
    const headers = { Authorization: `Bearer ${accessToken}`, accept: 'application/json' }
    const init = { method: spec.method, headers }
    if (body !== null && spec.method !== 'GET') {
      headers['content-type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const response = await providerFetch(url.toString(), init)
    const text = await response.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    const providerCalls = totalProviderCalls - callsBefore
    if (!response.ok) {
      return {
        status: 'provider_failed',
        decision: authority.decision,
        action_digest: expectedDigest,
        providerCalls,
        provider_status: response.status,
        data,
      }
    }
    return {
      status: 'executed',
      decision: authority.decision,
      action_digest: expectedDigest,
      providerCalls,
      provider_status: response.status,
      data,
    }
  }

  return {
    execute,
    listMatters: (query = {}, options = {}) => execute('list_matters', { ...options, params: { query } }),
    getMatter: (id, options = {}) => execute('get_matter', { ...options, params: { id } }),
    getNewActivities: (query = {}, options = {}) => execute('new_activities', { ...options, params: { query } }),
    clearSession() { discovery = null; token = null; tokenExpiresAt = 0 },
    getProviderCallCount() { return totalProviderCalls },
  }
}
