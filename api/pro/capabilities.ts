import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { GITLAW_AGENT_CONTRACT } from './capabilities-contract'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  return res.status(200).json({
    ok: true,
    tenantId: session.tenantId,
    role: session.role,
    contract: GITLAW_AGENT_CONTRACT,
  })
}
