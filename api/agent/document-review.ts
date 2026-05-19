/**
 * POST /api/agent/document-review
 *
 * Document-Review-Agent — Drop-Zone-Bulk-Verarbeitung. Refa wirft bis zu 30
 * OCR'd PDFs rein, der Agent: (1) extrahiert pro Doc den Mandant-Namen +
 * matcht gegen Akten-DB, (2) klassifiziert Doc-Typ, (3) schlägt clean
 * filename vor, (4) lädt Bestand der betroffenen Akten, (5) macht
 * Pflichtdoc-Gap-Analyse pro Akte, (6) baut Review-Dashboard-Payload.
 *
 * Closed-beta Pro endpoint — gated by Pro session. Drafts only; never
 * writes to case_documents. Die Refa-Review-UI committed selektiv.
 *
 * Input:  { documents: [{document_id, original_filename, ocr_text}] } max 30
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'node:crypto'
import { recordAudit } from '../_audit'
import { applyCors, applySecurityHeaders } from '../_http'
import { applyRateLimit, RATE_LLM } from '../_ratelimit'
import { requireProSession } from '../_auth'
import { runAgent, type AgentRunResult } from '../_agent'
import { buildDocumentReviewTools } from '../_document_review_tools'
import { logger } from '../_log'

const SYSTEM_PROMPT = `Du bist der Document-Review-Agent für eine deutsche
Migrationskanzlei. Eine Refa hat einen Stapel OCR'd PDFs in die Drop-Zone
geworfen. Du bereitest die Zuordnung zu Akten + Renames + Gap-Analyse so
weit vor, dass die Refa nur noch 1-Klick-Reviewt.

ARBEITSWEISE — STRICTLY IN DIESER REIHENFOLGE, JEDES TOOL MAX. 1×
1. \`match_documents_to_akten\` — ALLE Dokumente IN EINEM CALL übergeben.
   Liefert pro Doc {document_id, suggested_case_id, mandatsart_id, confidence, match_kind}.
2. \`classify_document_type\` — ALLE Dokumente IN EINEM CALL übergeben.
3. \`suggest_rename\` — pro Doc mit dem zugewiesenen doc_type aus Schritt 2
   und mandant_name aus dem Match aus Schritt 1. Wenn kein Match: null als
   mandant_name übergeben (rename benutzt dann "Unbekannt").
4. \`get_current_case_docs\` — mit den distinct suggested_case_ids aus Schritt 1
   (nur eindeutige Matches, match_kind=unique_name).
5. \`analyze_pflichtdoc_gaps\` — pro Akte aus Schritt 4. current_doc_types
   ableiten aus den internal_names + checklist_item_ids (best-effort, im
   Zweifel leer lassen). new_doc_types: alle doc_types die in diesem Batch
   dieser Akte zugeordnet wurden.
6. \`build_review_summary\` — exakt einmal, mit allen matches + gaps.

OUTPUT (am Ende, kein weiterer Tool-Call)
Deutsche Zusammenfassung in 4-6 Sätzen für die Refa:
- Wie viele Docs verarbeitet, wie viele eindeutig zugeordnet, wie viele
  unklar/ambiguous.
- Welche Akten haben jetzt fehlende Pflichtdokumente (Mandant-Name + Liste).
- Hinweis: alle Vorschläge stehen unten zum Review — kein Auto-Commit.

KEINE Halluzinationen. Bei Tool-Errors → ehrlich erwähnen. Maximal 8 Tool-Calls.`

interface DocumentInput {
  document_id: string
  original_filename: string
  ocr_text: string
}

interface ReviewRequestBody {
  documents: DocumentInput[]
}

const MAX_DOCS = 30
const MAX_OCR_CHARS = 6000

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

  const session = requireProSession(req, res)
  if (!session) return

  const rlOk = await applyRateLimit(req, res, RATE_LLM)
  if (!rlOk) return

  const body = (req.body ?? {}) as ReviewRequestBody
  const documents = Array.isArray(body.documents) ? body.documents : []

  if (documents.length === 0) {
    return res.status(400).json({
      error: 'documents fehlt oder leer — mindestens 1 Dokument übergeben.',
    })
  }
  if (documents.length > MAX_DOCS) {
    return res.status(400).json({
      error: `documents max. ${MAX_DOCS} pro Batch — bitte aufteilen.`,
    })
  }

  const sanitized: DocumentInput[] = []
  for (const d of documents) {
    if (
      !d ||
      typeof d.document_id !== 'string' ||
      typeof d.original_filename !== 'string' ||
      typeof d.ocr_text !== 'string'
    ) {
      return res.status(400).json({
        error: 'Jedes document braucht {document_id, original_filename, ocr_text} als string.',
      })
    }
    sanitized.push({
      document_id: d.document_id.slice(0, 200),
      original_filename: d.original_filename.slice(0, 400),
      ocr_text: d.ocr_text.slice(0, MAX_OCR_CHARS),
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'LLM nicht konfiguriert.' })
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const tools = buildDocumentReviewTools({
    tenant_id: session.tenantId,
    today_iso: todayIso,
  })

  const userMessage =
    `Heutiges Datum: ${todayIso}\n` +
    `Batch: ${sanitized.length} Dokumente.\n\n` +
    sanitized
      .map(
        (d) =>
          `--- document_id: ${d.document_id} ---\n` +
          `filename: ${d.original_filename}\n` +
          `ocr (${d.ocr_text.length} chars):\n${d.ocr_text}`,
      )
      .join('\n\n')

  let result: AgentRunResult
  try {
    result = await runAgent({
      agentName: 'document_review',
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tools,
      userHash: session.userId,
      maxIterations: 12,
      maxCostUsd: 0.8,
      inputPayload: {
        documents_count: sanitized.length,
        documents_sha256: crypto
          .createHash('sha256')
          .update(JSON.stringify(sanitized.map((d) => d.document_id)))
          .digest('hex'),
        tenant_id: session.tenantId,
      },
    })
  } catch (e) {
    logger.error({ msg: 'document-review.runAgent crashed', err: String(e) })
    return res.status(500).json({ error: 'Agent crashed — bitte später erneut.' })
  }

  const artefacts = summariseReviewArtefacts(result)

  await recordAudit(session.tenantId, session.userId, {
    action: 'agent.document_review',
    entityType: 'agent_run',
    entityId: result.agentRunId,
    llm: {
      model: 'gpt-4o-mini',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: result.totalCostUsd,
    },
    diff: {
      iterations: result.iterations,
      status: result.status,
      documents_total: sanitized.length,
      documents_matched: artefacts.summary.documents_matched,
      cases_with_gaps: artefacts.summary.cases_with_gaps,
    },
  })

  const payload = {
    agent_run_id: result.agentRunId,
    status: result.status,
    iterations: result.iterations,
    total_cost_usd: Number(result.totalCostUsd.toFixed(6)),
    final_message: result.finalMessage,
    error: result.error,
    tool_trace: result.toolTrace.map((c) => ({
      tool: c.tool,
      latency_ms: c.latencyMs,
      cached: c.cached,
      error: c.error,
    })),
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

interface ReviewArtefacts {
  summary: {
    documents_total: number
    documents_matched: number
    documents_unmatched: number
    documents_low_confidence: number
    cases_with_gaps: number
  }
  matches: Array<Record<string, unknown>>
  gaps: Array<Record<string, unknown>>
  classifications: Array<Record<string, unknown>>
  renames: Array<Record<string, unknown>>
}

function summariseReviewArtefacts(result: AgentRunResult): ReviewArtefacts {
  const out: ReviewArtefacts = {
    summary: {
      documents_total: 0,
      documents_matched: 0,
      documents_unmatched: 0,
      documents_low_confidence: 0,
      cases_with_gaps: 0,
    },
    matches: [],
    gaps: [],
    classifications: [],
    renames: [],
  }

  for (const call of result.toolTrace) {
    if (call.error) continue
    const o = (call.output ?? {}) as Record<string, unknown>
    switch (call.tool) {
      case 'match_documents_to_akten':
        if (Array.isArray(o.matches)) {
          out.matches = o.matches as Array<Record<string, unknown>>
        }
        break
      case 'classify_document_type':
        if (Array.isArray(o.results)) {
          out.classifications = o.results as Array<Record<string, unknown>>
        }
        break
      case 'suggest_rename':
        if (Array.isArray(o.renames)) {
          out.renames = o.renames as Array<Record<string, unknown>>
        }
        break
      case 'analyze_pflichtdoc_gaps':
        if (Array.isArray(o.gap_analysis)) {
          out.gaps = o.gap_analysis as Array<Record<string, unknown>>
        }
        break
      case 'build_review_summary':
        if (o.summary && typeof o.summary === 'object') {
          out.summary = { ...out.summary, ...(o.summary as Record<string, number>) }
        }
        break
    }
  }

  // Falls der Agent build_review_summary nie aufgerufen hat: aus
  // matches/gaps selber zusammenrechnen.
  if (out.summary.documents_total === 0 && out.matches.length > 0) {
    const total = out.matches.length
    const matched = out.matches.filter((m) => m.suggested_case_id).length
    const lowConf = out.matches.filter(
      (m) => m.suggested_case_id && typeof m.confidence === 'number' && (m.confidence as number) < 0.6,
    ).length
    const gapsCount = out.gaps.filter((g) => {
      const labels = g.missing_labels_de
      return Array.isArray(labels) && labels.length > 0
    }).length
    out.summary = {
      documents_total: total,
      documents_matched: matched,
      documents_unmatched: total - matched,
      documents_low_confidence: lowConf,
      cases_with_gaps: gapsCount,
    }
  }

  return out
}
