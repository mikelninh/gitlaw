import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'
import { requireProSession } from '../_auth'
import { applyCors, applySecurityHeaders } from '../_http'

const redis = Redis.fromEnv()
const MAX_BASE64_BYTES = 700_000
const TTL_SECONDS = 60 * 60 * 24 * 30

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({
      error: 'Document vault ist serverseitig nicht konfiguriert.',
      hint: 'Upstash-Integration im Vercel-Dashboard verbinden und neu deployen.',
    })
  }

  if (req.method === 'POST') {
    const session = requireProSession(req, res, 'assistenz')
    if (!session) return
    const { caseId, fileName, mimeType, base64, sizeBytes } = req.body || {}
    if (!fileName || !mimeType || !base64 || !sizeBytes) {
      return res.status(400).json({ error: 'fileName, mimeType, base64 and sizeBytes are required' })
    }
    if (typeof base64 !== 'string' || base64.length > MAX_BASE64_BYTES) {
      return res.status(413).json({
        error: 'File too large for beta document vault',
        limitBase64Bytes: MAX_BASE64_BYTES,
      })
    }
    const documentId = uid()
    const key = `proDoc:${session.tenantId}:${documentId}`
    const checksumSha256 = createHash('sha256').update(base64).digest('hex')
    try {
      await redis.set(
        key,
        {
          tenantId: session.tenantId,
          caseId: typeof caseId === 'string' ? caseId : undefined,
          fileName,
          mimeType,
          sizeBytes,
          checksumSha256,
          storageProvider: 'upstash-beta-vault',
          base64,
          uploadedAt: new Date().toISOString(),
          uploadedBy: session.userId,
        },
        { ex: TTL_SECONDS },
      )
      return res.status(200).json({
        ok: true,
        documentId,
        storageMode: 'server_vault',
        storageProvider: 'upstash-beta-vault',
        checksumSha256,
        ttlDays: TTL_SECONDS / 86400,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Upload failed', detail: String(err) })
    }
  }

  if (req.method === 'GET') {
    const session = requireProSession(req, res, 'read_only')
    if (!session) return
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    const metaOnly = String(req.query.meta || '') === '1'
    if (!id) return res.status(400).json({ error: 'Missing document id' })
    try {
      const key = `proDoc:${session.tenantId}:${id}`
      const payload = await redis.get<{
        tenantId: string
        fileName: string
        mimeType: string
        sizeBytes: number
        checksumSha256?: string
        storageProvider?: string
        uploadedAt?: string
        uploadedBy?: string
        base64: string
      }>(key)
      if (!payload) return res.status(404).json({ error: 'Document not found' })
      if (metaOnly) {
        return res.status(200).json({
          ok: true,
          documentId: id,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
          checksumSha256: payload.checksumSha256 || null,
          storageProvider: payload.storageProvider || 'upstash-beta-vault',
          uploadedAt: payload.uploadedAt || null,
          uploadedBy: payload.uploadedBy || null,
        })
      }
      const buffer = Buffer.from(payload.base64, 'base64')
      res.setHeader('Content-Type', payload.mimeType)
      res.setHeader('Content-Disposition', `inline; filename="${payload.fileName.replace(/"/g, '')}"`)
      return res.status(200).send(buffer)
    } catch (err) {
      return res.status(500).json({ error: 'Download failed', detail: String(err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
