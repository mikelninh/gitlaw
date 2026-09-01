import crypto from 'node:crypto'

export type AuthenticityStatus = 'unverified' | 'original_as_received' | 'verified_issuer'
export type HumanDecisionStatus = 'pending' | 'approved' | 'rejected'

export interface TrustChainV1 {
  version: 'trust-chain/v1'
  subject: { type: string; id: string }
  authenticity: { status: AuthenticityStatus; method: string }
  integrity: { sha256: string; verified: boolean; version: string; capturedAt: string }
  provenance: { sourceSystem: string; sourceUri: string; acquiredAt: string }
  authority: { id: string; title: string; version: string; sourceUrl: string; status: 'authoritative' | 'case_specific' }
  evidence: Array<{
    id: string
    sourceId: string
    locator: { kind: 'page' | 'paragraph' | 'section' | 'row' | 'field' | 'record'; value: string }
    excerptHash: string
  }>
  derivation: { summary: string; method: string; evidenceIds: string[] }
  humanDecision: { required: true; status: HumanDecisionStatus; actorId: string | null; at: string | null }
  audit: { traceId: string; createdAt: string }
}

export function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

export function stableTrustChainJson(chain: TrustChainV1): string {
  const ordered: TrustChainV1 = {
    version: chain.version,
    subject: chain.subject,
    authenticity: chain.authenticity,
    integrity: chain.integrity,
    provenance: chain.provenance,
    authority: chain.authority,
    evidence: chain.evidence,
    derivation: chain.derivation,
    humanDecision: chain.humanDecision,
    audit: chain.audit,
  }
  return JSON.stringify(ordered)
}

export function trustChainDigest(chain: TrustChainV1): string {
  return sha256Text(stableTrustChainJson(chain))
}

export function validateTrustChain(chain: TrustChainV1): string[] {
  const reasons: string[] = []
  if (chain.version !== 'trust-chain/v1') reasons.push('unsupported_trust_chain_version')
  if (!chain.subject?.type || !chain.subject?.id) reasons.push('subject_required')
  if (!['unverified', 'original_as_received', 'verified_issuer'].includes(chain.authenticity?.status)) reasons.push('authenticity_invalid')
  if (!chain.authenticity?.method) reasons.push('authenticity_method_required')
  if (!/^[a-f0-9]{64}$/i.test(chain.integrity?.sha256 ?? '')) reasons.push('integrity_sha256_invalid')
  if (chain.integrity?.verified !== true) reasons.push('integrity_not_verified')
  if (!chain.integrity?.version || !chain.integrity?.capturedAt) reasons.push('integrity_metadata_required')
  if (!chain.provenance?.sourceSystem || !chain.provenance?.sourceUri || !chain.provenance?.acquiredAt) reasons.push('provenance_required')
  if (!chain.authority?.id || !chain.authority?.title || !chain.authority?.version || !chain.authority?.sourceUrl) reasons.push('authority_required')
  if (!['authoritative', 'case_specific'].includes(chain.authority?.status)) reasons.push('authority_status_invalid')
  if (!Array.isArray(chain.evidence) || chain.evidence.length === 0) reasons.push('exact_evidence_required')

  const evidenceIds = new Set<string>()
  for (const evidence of chain.evidence ?? []) {
    if (!evidence?.id || evidenceIds.has(evidence.id)) reasons.push('evidence_id_invalid')
    evidenceIds.add(evidence.id)
    if (!evidence?.sourceId) reasons.push('evidence_source_required')
    if (!evidence?.locator?.kind || !evidence?.locator?.value) reasons.push('exact_locator_required')
    if (!/^[a-f0-9]{64}$/i.test(evidence?.excerptHash ?? '')) reasons.push('evidence_hash_invalid')
  }
  if (!chain.derivation?.summary || !chain.derivation?.method) reasons.push('derivation_required')
  if (!Array.isArray(chain.derivation?.evidenceIds) || chain.derivation.evidenceIds.length === 0) reasons.push('derivation_evidence_required')
  for (const id of chain.derivation?.evidenceIds ?? []) {
    if (!evidenceIds.has(id)) reasons.push('derivation_unknown_evidence')
  }
  if (chain.humanDecision?.required !== true) reasons.push('human_decision_required')
  if (!['pending', 'approved', 'rejected'].includes(chain.humanDecision?.status)) reasons.push('human_decision_status_invalid')
  if (chain.humanDecision?.status === 'approved' && (!chain.humanDecision.actorId || !chain.humanDecision.at)) reasons.push('approval_identity_required')
  if (!chain.audit?.traceId || !chain.audit?.createdAt) reasons.push('audit_anchor_required')
  return [...new Set(reasons)]
}

export function validateConsequentialAction(chain: TrustChainV1, approvedBy: string): string[] {
  const reasons = validateTrustChain(chain)
  if (chain.authenticity.status === 'unverified') reasons.push('source_authenticity_unverified')
  if (chain.humanDecision.status === 'pending') reasons.push('human_decision_pending')
  if (chain.humanDecision.status === 'rejected') reasons.push('human_decision_rejected')
  if (chain.humanDecision.status !== 'approved') reasons.push('human_approval_not_recorded')
  if (chain.humanDecision.actorId !== approvedBy) reasons.push('human_approval_mismatch')
  return [...new Set(reasons)]
}

export function withHumanDecision(
  base: TrustChainV1,
  input: { status: 'approved' | 'rejected'; actorId: string; at: string; traceId: string },
): TrustChainV1 {
  return {
    ...base,
    humanDecision: { required: true, status: input.status, actorId: input.actorId, at: input.at },
    audit: { traceId: input.traceId, createdAt: input.at },
  }
}
