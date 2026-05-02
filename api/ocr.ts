import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from './_auth'
import { applyCors, applySecurityHeaders } from './_http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const session = requireProSession(req, res, 'assistenz')
  if (!session) return

  const { caseId, attachmentInternalName, mode, sourceLanguage, targetLanguage } = req.body || {}
  if (!caseId || !attachmentInternalName || !mode) {
    return res.status(400).json({ error: 'caseId, attachmentInternalName and mode are required' })
  }

  return res.status(501).json({
    ok: false,
    status: 'not_enabled',
    message: 'OCR/translation backend is scaffolded but not yet connected to a production document pipeline.',
    jobPreview: {
      tenantId: session.tenantId,
      caseId,
      attachmentInternalName,
      mode,
      sourceLanguage: sourceLanguage || null,
      targetLanguage: targetLanguage || null,
    },
  })
}
