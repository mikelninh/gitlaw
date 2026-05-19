/**
 * POST /api/agent/behoerden
 *
 * Behörden-Korrespondenz-Agent — Migration-law firm's daily LEA / BAMF /
 * VG inbox triage. Takes pre-OCR'd letter text + the kanzlei's tenant_id,
 * runs 5-7 tools, returns a structured pre-package: matched Akte,
 * classification, required documents, deadline, plus drafts for the
 * Mandant notification (in their language) and the Anwalt-response.
 *
 * Closed-beta Pro endpoint — gated by Pro session. Drafts only; never
 * sends, never writes to the case. Anwält:in reviews + 1-click commits.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'node:crypto'
import { recordAudit } from '../_audit'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_LLM } from '../_ratelimit'
import { requireProSession } from '../_auth'
import { runAgent, type AgentRunResult } from '../_agent'
import { buildBehoerdenTools } from '../_behoerden_tools'
import { logger } from '../_log'

const SYSTEM_PROMPT = `Du bist der Behörden-Korrespondenz-Agent für eine deutsche
Migrationskanzlei. Du verarbeitest einen eingehenden Brief von LEA / BAMF /
Verwaltungsgericht und bereitest die Antwort + Mandant-Benachrichtigung vor.
Du schreibst NICHTS automatisch raus — alle Drafts werden anwaltlich reviewt.

ARBEITSWEISE — STRICTLY IN DIESER REIHENFOLGE
1. \`extract_meta\` — Aktenzeichen, Absender, Betreff, Brief-Datum, Mandant-Name.
2. \`find_matching_case\` mit den Meta-Daten. Wenn matched=ambiguous_name oder
   none: weiterarbeiten, aber in der Zusammenfassung darauf hinweisen, dass
   eine manuelle Akten-Zuordnung nötig ist.
3. \`classify_letter_type\` — bestimmt was die Behörde will + Dringlichkeit.
4. \`extract_demanded_documents\` — welche Unterlagen werden gefordert.
5. \`extract_behoerden_frist\` — Frist + Typ.
6. \`draft_mandant_notification\` — NUR aufrufen wenn letter_type ∈ {nachforderung_dokumente,
   anhoerung, terminladung} ODER required_documents nicht leer ist. Sprache:
   nimm "de" wenn keine andere Info — die UI kann später auf Mandant-Sprache
   wechseln. Wenn matched.case.mandant_name vorhanden ist, den verwenden.
7. \`draft_anwalt_response\` — IMMER aufrufen (auch bei Bescheiden, dort
   wird ein knapper Eingangs-/Empfangs-Brief gedraftet).

OUTPUT (am Ende, kein weiterer Tool-Call)
Deutsche Zusammenfassung in 5-7 Sätzen für die Anwält:in:
- Welche Akte (Aktenzeichen + Mandant-Name) oder "keine Akte gefunden — manuell zuordnen"
- Brief-Typ + Dringlichkeit
- Geforderte Unterlagen in Stichpunkten (falls vorhanden)
- Frist (Datum + verbleibende Tage falls absehbar)
- Ankündigung: "Drafts für Mandant + Behörden-Antwort liegen unten zum Review"
- Klare Eskalations-Empfehlung wenn Frist hoch-urgent (< 7 Tage)

KEINE Halluzinationen. Wenn ein Tool error zurückgibt: ehrlich in der
Zusammenfassung erwähnen. Maximal 8 Tool-Calls.`

interface BehoerdenRequestBody {
  letter_text: string
  kanzlei_name?: string
  // Optional override — by default agent matches in Mandant's preferred
  // language detected per-case. Future enhancement.
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'POST, OPTIONS')
  if (!corsAllowed) {
    return res.status(403).json({ error: 'Origin not allowed' })
  }
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Pro-only: this agent reads the tenant's Akten DB. Same auth as other
  // /api/pro/* endpoints.
  const session = requireProSession(req, res)
  if (!session) return // requireProSession already wrote 401/403

  const rlOk = await applyRateLimit(req, res, RATE_LLM)
  if (!rlOk) return

  const body = (req.body ?? {}) as BehoerdenRequestBody
  const letterText = (body.letter_text || '').toString().trim()
  if (!letterText || letterText.length < 80) {
    return res.status(400).json({
      error:
        'letter_text fehlt oder ist zu kurz — bitte den vollständigen OCR-Text des Briefs übergeben (mind. 80 Zeichen).',
    })
  }
  if (letterText.length > 20000) {
    return res.status(400).json({
      error: 'letter_text max. 20000 Zeichen — bei längeren Briefen den relevanten Teil zuschneiden.',
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'LLM nicht konfiguriert.' })
  }

  const tools = buildBehoerdenTools({
    tenant_id: session.tenantId,
    kanzlei_name: body.kanzlei_name,
  })

  let result: AgentRunResult
  try {
    result = await runAgent({
      agentName: 'behoerden_korrespondenz',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Eingegangener Behörden-Brief (OCR-Text):\n\n${letterText}`,
      tools,
      userHash: session.userId,
      maxIterations: 12,
      maxCostUsd: 0.6,
      inputPayload: {
        letter_text_length: letterText.length,
        letter_text_sha256: crypto.createHash('sha256').update(letterText).digest('hex'),
        tenant_id: session.tenantId,
      },
    })
  } catch (e) {
    logger.error({ msg: 'behoerden.runAgent crashed', err: String(e) })
    return res.status(500).json({ error: 'Agent crashed — bitte später erneut.' })
  }

  const artefacts = summariseBehoerdenArtefacts(result)

  await recordAudit(session.tenantId, session.userId, {
    action: 'agent.behoerden_korrespondenz',
    entityType: 'agent_run',
    entityId: result.agentRunId,
    llm: {
      model: 'gpt-4o-mini',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: result.totalCostUsd,
    },
    diff: { iterations: result.iterations, status: result.status, matched: artefacts.matched_case?.id ?? null },
  })

  const payload = {
    agent_run_id: result.agentRunId,
    status: result.status,
    iterations: result.iterations,
    total_cost_usd: Number(result.totalCostUsd.toFixed(6)),
    final_message: result.finalMessage,
    error: result.error,
    tool_trace: result.toolTrace.map((c) => {
      const out = (c.output ?? {}) as Record<string, unknown>
      const light = { ...out }
      delete light.body
      delete light.subject
      return { ...c, output: light }
    }),
    artefacts,
  }

  if (
    result.status === 'aborted_budget' ||
    result.status === 'aborted_iterations' ||
    result.status === 'failed'
  ) {
    return res.status(422).json(payload)
  }
  return res.status(200).json(payload)
}

// ── Artefact summary ────────────────────────────────────────────────────

function summariseBehoerdenArtefacts(result: AgentRunResult) {
  const out = {
    meta: null as null | {
      aktenzeichen: string | null
      absender_behoerde: string | null
      betreff: string | null
      datum_brief: string | null
      mandant_name_erwaehnt: string | null
    },
    matched_case: null as null | {
      id: string
      aktenzeichen: string
      mandant_name: string
      match_kind: string
    },
    candidates: null as null | Array<Record<string, unknown>>,
    classification: null as null | {
      letter_type: string
      reasoning_de: string
      urgency: string
    },
    required_documents: [] as Array<{ name_de: string; reason?: string | null }>,
    frist: null as null | {
      deadline_iso: string | null
      raw_text: string | null
      type: string
      notes?: string | null
    },
    mandant_notification: null as null | {
      subject: string
      body: string
      language: string
    },
    anwalt_response: null as null | {
      subject: string
      body: string
      remaining_placeholders: string[]
    },
  }

  for (const call of result.toolTrace) {
    if (call.error) continue
    const o = (call.output ?? {}) as Record<string, unknown>
    switch (call.tool) {
      case 'extract_meta':
        out.meta = {
          aktenzeichen: (o.aktenzeichen as string | null) ?? null,
          absender_behoerde: (o.absender_behoerde as string | null) ?? null,
          betreff: (o.betreff as string | null) ?? null,
          datum_brief: (o.datum_brief as string | null) ?? null,
          mandant_name_erwaehnt: (o.mandant_name_erwaehnt as string | null) ?? null,
        }
        break
      case 'find_matching_case': {
        const matched = (o.matched as string) || 'none'
        if (matched === 'exact_aktenzeichen' || matched === 'unique_name') {
          const c = o.case as Record<string, unknown>
          out.matched_case = {
            id: c.id as string,
            aktenzeichen: c.aktenzeichen as string,
            mandant_name: c.mandant_name as string,
            match_kind: matched,
          }
        } else if (matched === 'ambiguous_name') {
          out.candidates = o.candidates as Array<Record<string, unknown>>
        }
        break
      }
      case 'classify_letter_type':
        if (typeof o.letter_type === 'string') {
          out.classification = {
            letter_type: o.letter_type as string,
            reasoning_de: (o.reasoning_de as string) ?? '',
            urgency: (o.urgency as string) ?? 'mittel',
          }
        }
        break
      case 'extract_demanded_documents':
        if (Array.isArray(o.required_documents)) {
          out.required_documents = o.required_documents as typeof out.required_documents
        }
        break
      case 'extract_behoerden_frist':
        out.frist = {
          deadline_iso: (o.deadline_iso as string | null) ?? null,
          raw_text: (o.raw_text as string | null) ?? null,
          type: (o.type as string) ?? 'keine',
          notes: (o.notes as string | null) ?? null,
        }
        break
      case 'draft_mandant_notification':
        if (typeof o.subject === 'string' && typeof o.body === 'string') {
          out.mandant_notification = {
            subject: o.subject as string,
            body: o.body as string,
            language: (o.language as string) ?? 'de',
          }
        }
        break
      case 'draft_anwalt_response':
        if (typeof o.body === 'string') {
          out.anwalt_response = {
            subject: (o.subject as string) ?? '',
            body: o.body as string,
            remaining_placeholders:
              (o.remaining_placeholders as string[] | undefined) ?? [],
          }
        }
        break
    }
  }

  return out
}
