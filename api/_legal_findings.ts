import crypto from 'node:crypto'
import { getSql } from './_db'
import { resolveLegalAuthority } from './_legal_authority'
import {
  type TrustChainV1,
  trustChainDigest,
  validateConsequentialAction,
  validateTrustChain,
  withHumanDecision,
} from './_trust_chain'

export interface LegalFindingRecord {
  findingId: string
  caseId: string
  citation: string
  findingText: string
  trustChain: TrustChainV1
  chainSha256: string
  createdBy: string
  createdAt: string
}

export interface LegalDecisionRecord {
  decisionId: string
  findingId: string
  status: 'approved' | 'rejected'
  actorId: string
  note: string
  trustChain: TrustChainV1
  chainSha256: string
  createdAt: string
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function buildLegalFindingRecord(input: {
  caseId: string
  citation: string
  findingText: string
  createdBy: string
  traceId: string
  now?: string
}): LegalFindingRecord {
  const resolved = resolveLegalAuthority(input.citation)
  const now = input.now ?? new Date().toISOString()
  const findingId = uid('legal_finding')
  const evidenceId = `law:${resolved.abbreviation}:${resolved.marker}${resolved.number}`
  const chain: TrustChainV1 = {
    version: 'trust-chain/v1',
    subject: { type: 'legal_case', id: input.caseId },
    authenticity: {
      status: 'original_as_received',
      method: 'gitlaw_corpus_snapshot_hash',
    },
    integrity: {
      sha256: resolved.corpusSha256,
      verified: true,
      version: `sha256:${resolved.corpusSha256.slice(0, 16)}`,
      capturedAt: now,
    },
    provenance: {
      sourceSystem: 'gitlaw-federal-law-corpus',
      sourceUri: resolved.sourceUri,
      acquiredAt: now,
    },
    authority: {
      id: `${resolved.abbreviation}:${resolved.marker}${resolved.number}`,
      title: `${resolved.lawName} — ${resolved.paragraphHeading}`,
      version: resolved.lawStand,
      sourceUrl: resolved.sourceUrl,
      status: 'authoritative',
    },
    evidence: [{
      id: evidenceId,
      sourceId: resolved.lawFile,
      locator: { kind: 'paragraph', value: resolved.paragraphHeading },
      excerptHash: resolved.paragraphSha256,
    }],
    derivation: {
      summary: input.findingText.trim(),
      method: 'gitlaw_corpus_citation_check/v1',
      evidenceIds: [evidenceId],
    },
    humanDecision: { required: true, status: 'pending', actorId: null, at: null },
    audit: { traceId: input.traceId, createdAt: now },
  }
  const structural = validateTrustChain(chain)
  if (structural.length > 0) throw new Error(`legal_trust_chain_invalid:${structural.join(',')}`)
  return {
    findingId,
    caseId: input.caseId,
    citation: resolved.citation,
    findingText: input.findingText.trim(),
    trustChain: chain,
    chainSha256: trustChainDigest(chain),
    createdBy: input.createdBy,
    createdAt: now,
  }
}

export function buildLegalDecisionRecord(
  base: LegalFindingRecord,
  input: { status: 'approved' | 'rejected'; actorId: string; note?: string; traceId: string; now?: string },
): LegalDecisionRecord {
  const now = input.now ?? new Date().toISOString()
  const chain = withHumanDecision(base.trustChain, {
    status: input.status,
    actorId: input.actorId,
    at: now,
    traceId: input.traceId,
  })
  return {
    decisionId: uid('legal_decision'),
    findingId: base.findingId,
    status: input.status,
    actorId: input.actorId,
    note: input.note?.trim() ?? '',
    trustChain: chain,
    chainSha256: trustChainDigest(chain),
    createdAt: now,
  }
}

function rowToFinding(row: Record<string, unknown>): LegalFindingRecord {
  return {
    findingId: String(row.finding_id),
    caseId: String(row.case_id),
    citation: String(row.citation),
    findingText: String(row.finding_text),
    trustChain: row.trust_chain as TrustChainV1,
    chainSha256: String(row.chain_sha256),
    createdBy: String(row.created_by),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

function rowToDecision(row: Record<string, unknown>): LegalDecisionRecord {
  return {
    decisionId: String(row.decision_id),
    findingId: String(row.finding_id),
    status: String(row.status) as 'approved' | 'rejected',
    actorId: String(row.actor_id),
    note: String(row.note ?? ''),
    trustChain: row.trust_chain as TrustChainV1,
    chainSha256: String(row.chain_sha256),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

export async function persistLegalFinding(
  tenantSlug: string,
  record: LegalFindingRecord,
  idempotencyKey: string,
): Promise<LegalFindingRecord> {
  const sql = getSql()
  const existing = await sql`
    SELECT * FROM legal_findings
    WHERE tenant_slug=${tenantSlug} AND idempotency_key=${idempotencyKey}
    LIMIT 1
  ` as Array<Record<string, unknown>>
  if (existing[0]) return rowToFinding(existing[0])
  await sql`
    INSERT INTO legal_findings (
      tenant_slug, finding_id, case_id, citation, finding_text, trust_chain,
      chain_sha256, idempotency_key, created_by, created_at
    ) VALUES (
      ${tenantSlug}, ${record.findingId}, ${record.caseId}, ${record.citation}, ${record.findingText},
      ${JSON.stringify(record.trustChain)}::jsonb, ${record.chainSha256}, ${idempotencyKey},
      ${record.createdBy}, ${record.createdAt}::timestamptz
    )
  `
  return record
}

export async function loadLegalFinding(tenantSlug: string, findingId: string): Promise<LegalFindingRecord | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM legal_findings WHERE tenant_slug=${tenantSlug} AND finding_id=${findingId} LIMIT 1
  ` as Array<Record<string, unknown>>
  return rows[0] ? rowToFinding(rows[0]) : null
}

export async function persistLegalDecision(
  tenantSlug: string,
  decision: LegalDecisionRecord,
  idempotencyKey: string,
): Promise<LegalDecisionRecord> {
  const sql = getSql()
  const existing = await sql`
    SELECT * FROM legal_finding_decisions
    WHERE tenant_slug=${tenantSlug} AND idempotency_key=${idempotencyKey}
    LIMIT 1
  ` as Array<Record<string, unknown>>
  if (existing[0]) return rowToDecision(existing[0])
  await sql`
    INSERT INTO legal_finding_decisions (
      tenant_slug, decision_id, finding_id, status, actor_id, note,
      trust_chain, chain_sha256, idempotency_key, created_at
    ) VALUES (
      ${tenantSlug}, ${decision.decisionId}, ${decision.findingId}, ${decision.status},
      ${decision.actorId}, ${decision.note}, ${JSON.stringify(decision.trustChain)}::jsonb,
      ${decision.chainSha256}, ${idempotencyKey}, ${decision.createdAt}::timestamptz
    )
  `
  return decision
}

export async function listLegalDecisions(tenantSlug: string, findingId: string): Promise<LegalDecisionRecord[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM legal_finding_decisions
    WHERE tenant_slug=${tenantSlug} AND finding_id=${findingId}
    ORDER BY created_at ASC, decision_id ASC
  ` as Array<Record<string, unknown>>
  return rows.map(rowToDecision)
}

export function verifyLegalChainAgainstCorpus(
  finding: LegalFindingRecord,
  current: LegalFindingRecord | LegalDecisionRecord,
): string[] {
  const chain = current.trustChain
  const reasons: string[] = []
  if (current.chainSha256 !== trustChainDigest(chain)) reasons.push('trust_chain_digest_mismatch')
  reasons.push(...validateConsequentialAction(chain, chain.humanDecision.actorId ?? ''))
  if (chain.subject.type !== 'legal_case' || chain.subject.id !== finding.caseId) reasons.push('legal_subject_mismatch')

  let resolved
  try {
    resolved = resolveLegalAuthority(finding.citation)
  } catch {
    reasons.push('legal_authority_no_longer_resolves')
    return [...new Set(reasons)]
  }
  const expectedAuthorityId = `${resolved.abbreviation}:${resolved.marker}${resolved.number}`
  if (chain.integrity.sha256 !== resolved.corpusSha256) reasons.push('legal_corpus_snapshot_changed')
  if (chain.authority.id !== expectedAuthorityId) reasons.push('legal_authority_id_mismatch')
  if (chain.authority.version !== resolved.lawStand) reasons.push('legal_authority_version_changed')
  if (chain.authority.sourceUrl !== resolved.sourceUrl) reasons.push('legal_authority_source_changed')
  if (chain.provenance.sourceUri !== resolved.sourceUri) reasons.push('legal_provenance_changed')
  const evidence = chain.evidence[0]
  if (!evidence || evidence.locator.kind !== 'paragraph') reasons.push('legal_exact_paragraph_required')
  else {
    if (evidence.locator.value !== resolved.paragraphHeading) reasons.push('legal_paragraph_locator_changed')
    if (evidence.excerptHash !== resolved.paragraphSha256) reasons.push('legal_paragraph_text_changed')
  }
  return [...new Set(reasons)]
}

export async function legalProductionGate(tenantSlug: string, findingId: string, expectedCaseId?: string) {
  const finding = await loadLegalFinding(tenantSlug, findingId)
  if (!finding) throw new Error('legal_finding_not_found')
  if (expectedCaseId && finding.caseId !== expectedCaseId) throw new Error('legal_finding_case_mismatch')
  const decisions = await listLegalDecisions(tenantSlug, findingId)
  const current = decisions.at(-1) ?? finding
  const reasons = verifyLegalChainAgainstCorpus(finding, current)
  return {
    allow: reasons.length === 0,
    findingId,
    caseId: finding.caseId,
    citation: finding.citation,
    decisionId: decisions.at(-1)?.decisionId ?? null,
    approvedBy: current.trustChain.humanDecision.actorId,
    chainSha256: trustChainDigest(current.trustChain),
    reasons,
    trustChain: current.trustChain,
    decisions,
  }
}
