import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors, applySecurityHeaders } from '../_http'
import { extractBearerToken, mintSessionToken, resolveInvite, verifySessionToken } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'POST') {
    const invite = typeof req.body?.invite === 'string' ? req.body.invite : ''
    const claims = resolveInvite(invite)
    if (!claims) return res.status(401).json({ error: 'Invalid invite token' })
    const token = mintSessionToken(claims)
    return res.status(200).json({
      token,
      access: {
        tenantId: claims.tenantId,
        userId: claims.userId,
        role: claims.role,
        sessionExpiresAt: new Date(claims.exp * 1000).toISOString(),
      },
    })
  }

  if (req.method === 'GET') {
    const token = extractBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Missing bearer session' })
    const claims = verifySessionToken(token)
    if (!claims) return res.status(401).json({ error: 'Invalid or expired session' })
    return res.status(200).json({
      access: {
        tenantId: claims.tenantId,
        userId: claims.userId,
        role: claims.role,
        sessionExpiresAt: new Date(claims.exp * 1000).toISOString(),
      },
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
