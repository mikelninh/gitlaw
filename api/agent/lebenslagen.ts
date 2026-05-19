/**
 * POST /api/agent/lebenslagen
 *
 * The Lebenslagen-Assistent — takes a free-text description of a citizen's
 * legal problem and orchestrates 6 tools (detect → §§ → frist → template →
 * draft) to produce a usable defence package: classification, relevant
 * paragraphs with curated short-text, a computed deadline if the problem
 * has one, a matching letter template, and a filled draft.
 *
 * Public endpoint — rate-limited by IP. No PII stored beyond what the
 * caller pastes (and that lives only on the agent_runs row for audit).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'node:crypto'
import { recordAudit } from '../_audit'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_LLM } from '../_ratelimit'
import { runAgent, type AgentRunResult } from '../_agent'
import { buildLebenslagenTools } from '../_lebenslagen_tools'
import { logger } from '../_log'

const SYSTEM_PROMPT = `Du bist der Lebenslagen-Assistent von GitLaw.

DEINE AUFGABE
Eine Bürger:in beschreibt ein Rechtsproblem in Alltagssprache. Du verwandelst
diese Beschreibung in ein konkretes Verteidigungs-Paket:
- Welche Lebenslage liegt vor?
- Welche §§ sind einschlägig?
- Welche Frist läuft (wenn überhaupt)?
- Welche Brief-Vorlage passt?
- Ein erster Brief-Entwurf, der die konkreten Fakten der Person nutzt.

ARBEITSWEISE — STRICTLY IN DIESER REIHENFOLGE
1. IMMER zuerst \`detect_lebenslage\` aufrufen mit der vollständigen Beschreibung.
2. \`search_relevant_paragraphs\` mit der erkannten Lebenslage. Optional ein
   Keyword aus der Beschreibung (z.B. "Kündigung", "Härtefall", "Bußgeld") zum
   schärferen Filter.
3. Wenn die Beschreibung eine Frist enthält ("3 Wochen", "bis nächsten Freitag",
   "innerhalb 14 Tagen") → \`compute_frist\` mit dem Text-Schnipsel.
4. \`find_template\` mit der Lebenslage UND einem Keyword das den Subtyp
   einfängt ("Eigenbedarf", "Mieterhöhung", "Widerruf", …).
5. Wenn find_template eine passende Vorlage zurückgibt → \`draft_letter\` mit
   der template_id und den Fakten + (sofern bekannt) Name + Adresse aus dem
   Input. NIE Fakten erfinden.
6. Wenn ein einzelner § genannt wird der nicht in den Lebenslagen-Treffern ist
   (z.B. die Bürger:in schreibt "ich hab gelesen § 826 BGB könnte greifen") →
   \`lookup_paragraph_by_code\` zur Verifikation.

OUTPUT (am Ende, kein weiterer Tool-Call)
Eine kurze deutsche Zusammenfassung (5-8 Sätze) mit:
- Was die Lebenslage ist
- Welche §§ einschlägig sind (max. 4 wichtigste)
- Frist + Dringlichkeit (wenn anwendbar)
- Welche Vorlage du benutzt hast + Hinweis dass der Brief unter "Downloads"
  liegt
- Klare Eskalations-Empfehlung: bei einfachen Sachen "Brief kann direkt raus"
  vs. bei komplexen "Mieterverein/Anwalt einschalten — Frist ist {x} Tage"
- Disclaimer: KEINE Rechtsberatung, für Verbindliches → Anwält:in

WICHTIG
- KEINE Halluzinationen. Wenn ein Tool einen Fehler oder "verified=false" gibt,
  erwähne das ehrlich in der Zusammenfassung.
- Wenn die Beschreibung zu vage ist (keine konkrete Frage, kein §, keine
  Beziehung erkennbar): sag das ehrlich + bitte um konkrete Rückfrage statt
  zu raten.
- Maximal 7 Tool-Calls — die Sequenz oben deckt das ab.`

interface LebenslagenRequestBody {
  description: string
  name?: string | null
  address?: string | null
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

  const rlOk = await applyRateLimit(req, res, RATE_LLM)
  if (!rlOk) return

  const body = (req.body ?? {}) as LebenslagenRequestBody
  const description = (body.description || '').toString().trim()
  if (!description || description.length < 20) {
    return res.status(400).json({
      error:
        'Bitte beschreibe dein Problem in mindestens 20 Zeichen — sonst kann der Agent dich nicht treffsicher beraten.',
    })
  }
  if (description.length > 4000) {
    return res.status(400).json({
      error: 'Beschreibung max. 4000 Zeichen.',
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'LLM nicht konfiguriert — OPENAI_API_KEY fehlt.',
    })
  }

  const tools = buildLebenslagenTools()

  const userBlock: string[] = []
  if (body.name) userBlock.push(`Name: ${body.name}`)
  if (body.address) userBlock.push(`Adresse: ${body.address}`)
  const userBlockStr = userBlock.length
    ? `\n\nNutzer-Daten:\n${userBlock.join('\n')}`
    : ''

  const userMessage = `Beschreibung des Problems:\n${description}${userBlockStr}`

  let result: AgentRunResult
  try {
    result = await runAgent({
      agentName: 'lebenslagen',
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tools,
      userHash: hashUser(req),
      maxIterations: 10,
      maxCostUsd: 0.4,
      inputPayload: {
        description_length: description.length,
        has_name: Boolean(body.name),
        has_address: Boolean(body.address),
        // Don't store the description in input_json — it may contain PII that
        // citizens write into the box. Logged for audit only in hashed form.
        description_sha256: crypto
          .createHash('sha256')
          .update(description)
          .digest('hex'),
      },
    })
  } catch (e) {
    logger.error({ msg: 'lebenslagen.runAgent crashed', err: String(e) })
    return res.status(500).json({ error: 'Agent crashed — bitte später erneut.' })
  }

  // Distill the agent's tool_trace into a tidy artefacts block — the
  // letter draft + matched template + cited paragraphs + frist.
  const artefacts = summariseLebenslagenArtefacts(result)

  // Strip large fields from the trace before sending — the body text of
  // the draft is in artefacts, no need to also have it inline.
  const lightTrace = result.toolTrace.map((c) => {
    const out = (c.output ?? {}) as Record<string, unknown>
    const lightOut = { ...out }
    delete lightOut.body
    delete lightOut.draft
    return { ...c, output: lightOut }
  })

  await recordAudit('public', 'anon', {
    action: 'agent.lebenslagen',
    entityType: 'agent_run',
    entityId: result.agentRunId,
    llm: {
      model: 'gpt-4o-mini',
      prompt_tokens: 0, // per-call detail lives in llm_usage already
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: result.totalCostUsd,
    },
    diff: { iterations: result.iterations, status: result.status },
  })

  const payload = {
    agent_run_id: result.agentRunId,
    status: result.status,
    iterations: result.iterations,
    total_cost_usd: Number(result.totalCostUsd.toFixed(6)),
    final_message: result.finalMessage,
    error: result.error,
    tool_trace: lightTrace,
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

function hashUser(req: VercelRequest): string {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString()
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// ── Artefact summary ────────────────────────────────────────────────────

function summariseLebenslagenArtefacts(result: AgentRunResult) {
  const out = {
    lebenslage: null as null | { id: string; confidence: number; reasoning_de: string },
    paragraphs: [] as Array<{ ref: string; law: string; section: string; title: string; short: string }>,
    frist: null as null | {
      anchor_iso?: string
      deadline_iso: string
      days_left: number
      expired: boolean
      urgent: boolean
      source: string
    },
    template_used: null as null | { id: string; title: string },
    letter: null as null | {
      template_id: string
      template_title: string
      draft: string
      filled_placeholders: string[]
      remaining_placeholders: string[]
      warnings: string[]
    },
  }

  for (const call of result.toolTrace) {
    if (call.error) continue
    const o = (call.output ?? {}) as Record<string, unknown>
    if (call.tool === 'detect_lebenslage' && typeof o.lebenslage === 'string') {
      out.lebenslage = {
        id: o.lebenslage as string,
        confidence: (o.confidence as number) ?? 0,
        reasoning_de: (o.reasoning_de as string) ?? '',
      }
    } else if (call.tool === 'search_relevant_paragraphs' && Array.isArray(o.paragraphs)) {
      out.paragraphs = (o.paragraphs as typeof out.paragraphs).slice(0, 6)
    } else if (call.tool === 'lookup_paragraph_by_code' && o.verified === true) {
      const exists = out.paragraphs.some((p) => p.ref === (o.ref as string))
      if (!exists) {
        out.paragraphs.push({
          ref: o.ref as string,
          law: o.law as string,
          section: o.section as string,
          title: o.title as string,
          short: o.short as string,
        })
      }
    } else if (call.tool === 'compute_frist' && typeof o.deadline_iso === 'string') {
      out.frist = {
        anchor_iso: o.anchor_iso as string,
        deadline_iso: o.deadline_iso as string,
        days_left: (o.days_left as number) ?? 0,
        expired: Boolean(o.expired),
        urgent: Boolean(o.urgent),
        source: (o.source as string) ?? 'unknown',
      }
    } else if (call.tool === 'find_template' && Array.isArray(o.templates) && o.templates.length > 0) {
      const first = o.templates[0] as { id: string; title: string }
      out.template_used = { id: first.id, title: first.title }
    } else if (call.tool === 'draft_letter' && typeof o.draft === 'string') {
      out.letter = {
        template_id: o.template_id as string,
        template_title: o.template_title as string,
        draft: o.draft as string,
        filled_placeholders: (o.filled_placeholders as string[]) ?? [],
        remaining_placeholders: (o.remaining_placeholders as string[]) ?? [],
        warnings: (o.warnings as string[]) ?? [],
      }
    }
  }

  return out
}
