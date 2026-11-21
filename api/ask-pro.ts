/**
 * Vercel Serverless Function — Pro-Tier legal research endpoint.
 *
 * PRIVILEGED-DATA RULE:
 * The browser is never the authority boundary. Every request is evaluated
 * server-side by _lawyer-privacy BEFORE an external LLM call can happen.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { recordAudit } from './_audit'
import { requireProSession } from './_auth'
import { applyCors, applySecurityHeaders } from './_http'
import { chat, estimateCostUsd } from './_llm'
import { createPrivacyReceipt, evaluateLawyerAiEgress, type LawyerPrivacyEnvelope } from './_lawyer-privacy'
import { applyRateLimit, RATE_LLM, ipUserKey } from './_ratelimit'

const BASE_PRO_PROMPT = `Du bist juristische Recherche-Assistenz für eine deutsche Rechtsanwältin oder einen deutschen Rechtsanwalt.

AUFGABE
• Beantworte die Rechtsfrage knapp, präzise, professionell.
• Strukturiere: einschlägige Tatbestände → kurze Prüfung → ggf. prozessuale Hinweise.
• Kollegial, sachlich, ohne Mandant:innen-Ansprache. Maximal 10 Sätze Fließtext.
• Fülle das Feld "zitate" mit jedem Paragraphen, den du im Fließtext genannt hast: reine Paragraphennummer, Gesetzesabkürzung und knappe Relevanzbeschreibung.

WICHTIG
• Zitiere nur Paragraphen, die du sicher kennst. Erfinde keine Normen.
• Wenn unsicher, kennzeichne die Unsicherheit ausdrücklich — die Antwort wird anwaltlich gegengeprüft.
• Dies ist Recherche-Unterstützung und keine autonome Rechtsentscheidung.
• Gesetz-Abkürzung in "zitate.gesetz" immer ohne §-Zeichen und Nummer.`

export type LawyerProfile = {
  practiceArea?: string
  jurisdictionFocus?: string
  citationStyle?: 'knapp' | 'ausführlich'
  firmContext?: string
}

type ApprovedAnswerMemory = { question: string; approvedAnswer: string }

export function buildProSystemPrompt(profile?: LawyerProfile | null): string {
  if (!profile) return BASE_PRO_PROMPT
  const hints: string[] = []
  if (profile.practiceArea) hints.push(`• Schwerpunkt: ${sanitize(profile.practiceArea)}.`)
  if (profile.jurisdictionFocus && profile.jurisdictionFocus !== 'DE') hints.push(`• Regionaler Fokus: ${sanitize(profile.jurisdictionFocus)}.`)
  hints.push(profile.citationStyle === 'ausführlich' ? '• Zitier-Stil: ausführlich.' : '• Zitier-Stil: knapp.')
  if (profile.firmContext) hints.push(`• Kanzleikontext: ${sanitize(profile.firmContext)}`)
  return `${BASE_PRO_PROMPT}\n\nPROFILKONTEXT\n${hints.join('\n')}`
}

function buildMemoryPrompt(memory?: ApprovedAnswerMemory[]): string {
  if (!memory?.length) return ''
  return '\n\nKANZLEI-INTERNER ERFAHRUNGSSCHATZ\n' +
    memory.slice(0, 3).map((m, i) => `Beispiel ${i + 1}\nFrage: ${sanitize(m.question)}\nFreigegebene Antwort: ${sanitize(m.approvedAnswer)}`).join('\n\n') +
    '\n\nNutze diese Beispiele nur wenn sie sachlich zur aktuellen Frage passen.'
}

function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

const PRO_JSON_SCHEMA = {
  name: 'rechtsrecherche_antwort',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: {
      antwort: { type: 'string' },
      zitate: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          properties: { paragraph: { type: 'string' }, gesetz: { type: 'string' }, bedeutung: { type: 'string' } },
          required: ['paragraph', 'gesetz', 'bedeutung'],
        },
      },
    },
    required: ['antwort', 'zitate'],
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = requireProSession(req, res, 'assistenz')
  if (!session) return
  const rlOk = await applyRateLimit(req, res, RATE_LLM, ipUserKey(req, session.userId))
  if (!rlOk) return

  const { question, lawyerProfile, privacy } = req.body as {
    question?: unknown
    lawyerProfile?: LawyerProfile
    approvedMemory?: ApprovedAnswerMemory[]
    privacy?: LawyerPrivacyEnvelope
  }
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Question (string) required' })
  if (question.length > 12_000) return res.status(413).json({ error: 'Question too large for privileged research path' })

  const requestedMemory = Array.isArray(req.body?.approvedMemory) ? (req.body.approvedMemory as ApprovedAnswerMemory[]).slice(0, 3) : []
  const privacyDecision = evaluateLawyerAiEgress({ question, approvedMemory: requestedMemory, privacy })

  if (privacyDecision.decision !== 'ALLOW') {
    // This header is intentionally testable by the live Privacy Proof Center.
    // It means the request was stopped before chat()/provider selection.
    res.setHeader('X-Privacy-Provider-Calls', '0')
    const receipt = createPrivacyReceipt({ decision: privacyDecision, privacy })
    await recordAudit(session.tenantId, session.userId, {
      action: 'ai.privacy.block', entityType: 'privacy_receipt', entityId: receipt.receiptDigest,
      diff: {
        policyVersion: receipt.policyVersion,
        dataMode: receipt.dataMode,
        provider: receipt.provider,
        reasons: receipt.reasons,
        detectedClasses: receipt.detectedClasses,
        readinessDigest: receipt.readinessDigest,
        signed: Boolean(receipt.signature),
        providerCalls: 0,
      },
    })
    return res.status(423).json({
      error: 'Privileged AI privacy gate blocked this request',
      code: 'LAWYER_PRIVACY_BLOCK',
      reasons: privacyDecision.reasons,
      detectedClasses: privacyDecision.detectedClasses,
      privacyReceipt: receipt,
    })
  }

  const safeMemory = privacyDecision.dataMode === 'synthetic' ? requestedMemory : []
  const systemPrompt = buildProSystemPrompt(lawyerProfile) +
    '\n\nAUTORITÄTSKONTEXT\n• Menschliche anwaltliche Prüfung bleibt erforderlich.' +
    buildMemoryPrompt(safeMemory)

  try {
    const { content, model, usage, request_id, provider } = await chat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
      {
        provider: privacyDecision.provider,
        route: 'ask-pro-lawyer-privacy',
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_schema', json_schema: PRO_JSON_SCHEMA },
      },
    )
    res.setHeader('X-Privacy-Provider-Calls', '1')

    const receipt = createPrivacyReceipt({ decision: privacyDecision, privacy, providerRequestId: request_id, model })
    await recordAudit(session.tenantId, session.userId, {
      action: 'ai.ask-pro', entityType: 'research', entityId: receipt.receiptDigest,
      diff: {
        privacyPolicyVersion: receipt.policyVersion,
        privacyReceiptDigest: receipt.receiptDigest,
        readinessDigest: receipt.readinessDigest,
        dataMode: receipt.dataMode,
        provider,
        signedReceipt: Boolean(receipt.signature),
        providerCalls: 1,
      },
      llm: {
        model, request_id,
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: usage?.total_tokens ?? 0,
        estimated_cost_usd: estimateCostUsd(model, usage),
      },
    })

    try {
      const parsed = JSON.parse(content)
      return res.status(200).json({ ...parsed, privacyReceipt: receipt })
    } catch {
      return res.status(502).json({ error: 'LLM returned invalid JSON' })
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'OpenAI key not configured') return res.status(500).json({ error: 'Approved AI provider is not configured' })
    if (err instanceof Error && err.message === 'Empty LLM response') return res.status(502).json({ error: 'Empty LLM response' })
    return res.status(500).json({ error: 'Approved AI provider request failed' })
  }
}
