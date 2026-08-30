import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'
import { privacyReadiness } from '../_lawyer-privacy'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const corsAllowed = applyCors(req, res, 'GET, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const readiness = privacyReadiness()
  return res.status(200).json({
    ...readiness,
    // Deliberately expose only booleans/digests. Never return secret values,
    // provider credentials, contract files or signing keys.
    tenantScoped: true,
    realMandateDefault: 'BLOCK',
    rawIdentifiersDefault: 'BLOCK',
    crossMatterMemory: 'DISABLED_FOR_PRIVILEGED_AI',
    providerFailover: 'DISABLED_FOR_PRIVILEGED_AI',
  })
}
