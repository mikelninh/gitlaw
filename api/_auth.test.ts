import { beforeAll, describe, expect, it } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  mintSessionToken,
  verifySessionToken,
  requireProSession,
  hashEmail,
  type ProSessionClaims,
} from './_auth'

beforeAll(() => {
  process.env.GITLAW_SESSION_SECRET = 'test-secret-that-is-definitely-longer-than-32-characters'
})

function claims(role: ProSessionClaims['role'] = 'anwalt'): ProSessionClaims {
  const now = Math.floor(Date.now() / 1000)
  return {
    tenantId: 'tenant-a',
    userId: 'user-a',
    role,
    invite: 'TEST',
    iat: now,
    exp: now + 3600,
  }
}

function responseRecorder() {
  const record: { status?: number; body?: unknown } = {}
  const res = {
    status(code: number) {
      record.status = code
      return this
    },
    json(body: unknown) {
      record.body = body
      return this
    },
  } as unknown as VercelResponse
  return { res, record }
}

describe('GitLaw Pro auth boundary', () => {
  it('mints and verifies tenant-bound signed session claims', () => {
    const original = claims('anwalt')
    const token = mintSessionToken(original)
    const verified = verifySessionToken(token)
    expect(verified?.tenantId).toBe('tenant-a')
    expect(verified?.userId).toBe('user-a')
    expect(verified?.role).toBe('anwalt')
  })

  it('fails closed on token tampering', () => {
    const token = mintSessionToken(claims())
    const [h, p, s] = token.split('.')
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    payload.tenantId = 'tenant-b'
    const tampered = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`
    expect(verifySessionToken(tampered)).toBeNull()
  })

  it('rejects expired sessions', () => {
    const c = claims()
    c.exp = Math.floor(Date.now() / 1000) - 1
    expect(verifySessionToken(mintSessionToken(c))).toBeNull()
  })

  it('enforces role rank at the request boundary', () => {
    const token = mintSessionToken(claims('read_only'))
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as VercelRequest
    const { res, record } = responseRecorder()
    expect(requireProSession(req, res, 'anwalt')).toBeNull()
    expect(record.status).toBe(403)
  })

  it('accepts sufficient role and preserves tenant identity', () => {
    const token = mintSessionToken(claims('owner'))
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as VercelRequest
    const { res } = responseRecorder()
    const result = requireProSession(req, res, 'anwalt')
    expect(result?.tenantId).toBe('tenant-a')
    expect(result?.role).toBe('owner')
  })

  it('uses a secret-peppered stable normalized user hash', () => {
    expect(hashEmail(' Lawyer@Example.com ')).toBe(hashEmail('lawyer@example.com'))
    expect(hashEmail('lawyer@example.com')).not.toContain('lawyer@example.com')
  })
})
