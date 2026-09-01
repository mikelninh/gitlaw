import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireProSession } from '../_auth'
import { recordAudit } from '../_audit'
import { requireDb } from '../_db'
import { applyCors, applySecurityHeaders } from '../_http'
import {
  buildLegalDecisionRecord,
  buildLegalFindingRecord,
  legalProductionGate,
  listLegalDecisions,
  loadLegalFinding,
  persistLegalDecision,
  persistLegalFinding,
} from '../_legal_findings'

function idempotencyKey(req: VercelRequest): string | null {
  const raw = req.headers['x-idempotency-key']
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return
  if (!requireDb(res)) return

  const findingId = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  const action = typeof req.query.action === 'string' ? req.query.action.trim() : ''

  try {
    if (req.method === 'POST' && action === 'decision') {
      const lawyer = requireProSession(req, res, 'anwalt')
      if (!lawyer) return
      if (!findingId) return res.status(400).json({ error: 'finding id required' })
      const key = idempotencyKey(req)
      if (!key) return res.status(400).json({ error: 'x-idempotency-key required' })
      const status = req.body?.status
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(422).json({ error: 'status must be approved or rejected' })
      }
      const finding = await loadLegalFinding(lawyer.tenantId, findingId)
      if (!finding) return res.status(404).json({ error: 'Legal finding not found' })
      const decision = buildLegalDecisionRecord(finding, {
        status,
        actorId: lawyer.userId,
        note: typeof req.body?.note === 'string' ? req.body.note : '',
        traceId: `legal-decision:${findingId}:${key}`,
      })
      const saved = await persistLegalDecision(lawyer.tenantId, decision, key)
      const gate = await legalProductionGate(lawyer.tenantId, findingId)
      await recordAudit(lawyer.tenantId, lawyer.userId, {
        action: 'legal.finding.decision',
        entityType: 'legal_finding',
        entityId: findingId,
        diff: { status: saved.status, decisionId: saved.decisionId, chainSha256: saved.chainSha256, gateAllow: gate.allow },
      })
      return res.status(200).json({ ok: true, finding, decision: saved, gate })
    }

    if (req.method === 'POST') {
      const key = idempotencyKey(req)
      if (!key) return res.status(400).json({ error: 'x-idempotency-key required' })
      const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : ''
      const citation = typeof req.body?.citation === 'string' ? req.body.citation.trim() : ''
      const findingText = typeof req.body?.findingText === 'string' ? req.body.findingText.trim() : ''
      if (!caseId || !citation || findingText.length < 3) {
        return res.status(422).json({ error: 'caseId, citation and findingText are required' })
      }
      const record = buildLegalFindingRecord({
        caseId,
        citation,
        findingText,
        createdBy: session.userId,
        traceId: `legal-finding:${caseId}:${key}`,
      })
      const saved = await persistLegalFinding(session.tenantId, record, key)
      const gate = await legalProductionGate(session.tenantId, saved.findingId)
      await recordAudit(session.tenantId, session.userId, {
        action: 'legal.finding.created',
        entityType: 'legal_finding',
        entityId: saved.findingId,
        diff: { caseId, citation: saved.citation, chainSha256: saved.chainSha256 },
      })
      return res.status(201).json({ ok: true, finding: saved, gate })
    }

    if (req.method === 'GET') {
      if (!findingId) return res.status(400).json({ error: 'finding id required' })
      const finding = await loadLegalFinding(session.tenantId, findingId)
      if (!finding) return res.status(404).json({ error: 'Legal finding not found' })
      const decisions = await listLegalDecisions(session.tenantId, findingId)
      const gate = await legalProductionGate(session.tenantId, findingId)
      return res.status(200).json({ ok: true, finding, decisions, gate })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'legal_finding_failed'
    const status = message.includes('not_found') ? 404
      : message.includes('mismatch') || message.includes('changed') ? 409
        : message.startsWith('legal_') ? 422
          : 500
    return res.status(status).json({ error: message })
  }
}
