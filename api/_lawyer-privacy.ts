import crypto from 'node:crypto'

export const LAWYER_PRIVACY_POLICY_VERSION = 'lawyer-privacy/0.1'
export type LawyerDataMode = 'synthetic' | 'redacted' | 'real_mandate'
export type LawyerProvider = 'openai'

export type LawyerPrivacyEnvelope = {
  dataMode?: LawyerDataMode
  purpose?: string
  caseRef?: string
  clientConsent?: boolean
  externalServiceNecessary?: boolean
  redactionApplied?: boolean
  memoryScope?: 'none' | 'same_case'
}

export type PrivacyReadiness = {
  policyVersion: string
  approvedProvider: LawyerProvider
  shadowModeReady: boolean
  realMandateAiReady: boolean
  gates: Record<string, boolean>
  proofDigest: string
}

export type PrivacyDecision = {
  decision: 'ALLOW' | 'BLOCK'
  reasons: string[]
  dataMode: LawyerDataMode
  provider: LawyerProvider
  detectedClasses: string[]
  promptDigest: string
  memoryDigest: string
  readiness: PrivacyReadiness
}

export type PrivacyReceipt = {
  schema: 'lawyer-privacy-receipt/0.1'
  policyVersion: string
  at: string
  decision: 'ALLOW' | 'BLOCK'
  reasons: string[]
  dataMode: LawyerDataMode
  provider: LawyerProvider
  purpose: string | null
  caseRefDigest: string | null
  promptDigest: string
  memoryDigest: string
  detectedClasses: string[]
  providerRequestId?: string
  model?: string
  readinessDigest: string
  receiptDigest: string
  signature?: string
  signatureAlgorithm?: 'HMAC-SHA256'
}

const APPROVED_PROVIDER: LawyerProvider = 'openai'
const on = (name: string) => process.env[name] === '1'
const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function privacyReadiness(env = process.env): PrivacyReadiness {
  const gates = {
    privacy_enforcement_enabled: env.LAWYER_PRIVACY_ENFORCE !== '0',
    real_mandate_ai_explicitly_enabled: env.LEGAL_AI_REAL_MANDATE_ENABLED === '1',
    provider_contract_reviewed: env.LEGAL_AI_PROVIDER_CONTRACT_REVIEWED === '1',
    confidentiality_terms_confirmed: env.LEGAL_AI_CONFIDENTIALITY_CONFIRMED === '1',
    dpa_avv_confirmed: env.LEGAL_AI_DPA_CONFIRMED === '1',
    subprocessors_reviewed: env.LEGAL_AI_SUBPROCESSORS_REVIEWED === '1',
    comparable_secret_protection_reviewed: env.LEGAL_AI_SECRET_PROTECTION_REVIEWED === '1',
    zero_data_retention_confirmed: env.LEGAL_AI_ZERO_RETENTION_CONFIRMED === '1',
    toms_reviewed: env.LEGAL_AI_TOMS_REVIEWED === '1',
    dpia_reviewed: env.LEGAL_AI_DPIA_REVIEWED === '1',
    incident_process_ready: env.LEGAL_AI_INCIDENT_PROCESS_READY === '1',
    deletion_process_ready: env.LEGAL_AI_DELETION_PROCESS_READY === '1',
    receipt_signing_key_configured: Boolean(env.PRIVACY_RECEIPT_SIGNING_KEY),
    approved_provider_pinned: (env.LEGAL_AI_PROVIDER || APPROVED_PROVIDER) === APPROVED_PROVIDER,
  }
  const realMandateAiReady = Object.values(gates).every(Boolean)
  const proofDigest = sha(canonical({ policyVersion: LAWYER_PRIVACY_POLICY_VERSION, approvedProvider: APPROVED_PROVIDER, gates }))
  return {
    policyVersion: LAWYER_PRIVACY_POLICY_VERSION,
    approvedProvider: APPROVED_PROVIDER,
    shadowModeReady: true,
    realMandateAiReady,
    gates,
    proofDigest,
  }
}

const SENSITIVE_PATTERNS: Array<{ cls: string; re: RegExp }> = [
  { cls: 'canary_secret', re: /MANDATE-CANARY-[A-Z0-9_-]{6,}/i },
  { cls: 'email', re: /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/ },
  { cls: 'iban', re: /\b[A-Z]{2}\d{2}(?:[\s]?\d{4}){3,5}\b/ },
  { cls: 'phone', re: /\b(?:\+49|0049|0\d{2,4})[\s/.-]?\d{3,8}(?:[\s/.-]?\d{1,8})?\b/ },
  { cls: 'tax_id', re: /\b\d{11}\b/ },
  { cls: 'social_security_number', re: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b/ },
  { cls: 'street_address', re: /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|allee|weg|gasse|damm|ufer|ring|chaussee|stieg)\s+\d+[a-zA-Z]?\b/ },
  { cls: 'birth_date_phrase', re: /\b(?:geb\.|geboren\s+am)\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:19|20)\d{2}\b/i },
  { cls: 'named_person', re: /\b(?:Herr|Frau|Hr\.|Fr\.|Mandant(?:in)?|Mandantin)\s+[A-ZÄÖÜ][a-zäöüß-]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß-]{2,})?\b/ },
]

export function detectSensitiveClasses(text: string): string[] {
  const found = new Set<string>()
  for (const p of SENSITIVE_PATTERNS) if (p.re.test(text)) found.add(p.cls)
  return [...found].sort()
}

function memoryText(memory: Array<{ question?: string; approvedAnswer?: string }> = []): string {
  return memory.map(m => `${m.question || ''}\n${m.approvedAnswer || ''}`).join('\n---\n')
}

export function evaluateLawyerAiEgress(input: {
  question: string
  approvedMemory?: Array<{ question?: string; approvedAnswer?: string }>
  privacy?: LawyerPrivacyEnvelope | null
  env?: NodeJS.ProcessEnv
}): PrivacyDecision {
  const env = input.env || process.env
  const readiness = privacyReadiness(env)
  const privacy = input.privacy || {}
  const dataMode: LawyerDataMode = privacy.dataMode || 'synthetic'
  const provider = APPROVED_PROVIDER
  const promptDigest = sha(input.question)
  const memText = memoryText(input.approvedMemory)
  const memoryDigest = sha(memText)
  const detectedClasses = [...new Set([
    ...detectSensitiveClasses(input.question),
    ...detectSensitiveClasses(memText),
  ])].sort()
  const reasons: string[] = []

  if (env.LAWYER_PRIVACY_ENFORCE === '0') {
    reasons.push('privacy_enforcement_disabled')
    return { decision: 'BLOCK', reasons, dataMode, provider, detectedClasses, promptDigest, memoryDigest, readiness }
  }

  if (detectedClasses.includes('canary_secret')) reasons.push('canary_secret_detected')

  if (dataMode === 'synthetic') {
    if (detectedClasses.length > 0) reasons.push('synthetic_payload_contains_sensitive_identifiers')
  }

  if (dataMode === 'redacted') {
    if (privacy.redactionApplied !== true) reasons.push('redaction_attestation_required')
    if (detectedClasses.length > 0) reasons.push('redacted_payload_still_contains_sensitive_identifiers')
    if ((privacy.memoryScope || 'none') !== 'none' && memText.trim()) reasons.push('cross_prompt_memory_disabled_for_redacted_mode')
  }

  if (dataMode === 'real_mandate') {
    if (!readiness.realMandateAiReady) reasons.push('real_mandate_provider_gate_incomplete')
    if (privacy.clientConsent !== true) reasons.push('client_consent_required_for_mandate_specific_external_service')
    if (privacy.externalServiceNecessary !== true) reasons.push('external_service_necessity_not_attested')
    if (privacy.redactionApplied !== true) reasons.push('pseudonymisation_required_before_external_ai')
    if (!privacy.purpose || privacy.purpose.trim().length < 3) reasons.push('specific_purpose_required')
    if (!privacy.caseRef) reasons.push('pseudonymous_case_reference_required')
    if ((privacy.memoryScope || 'none') !== 'none' || memText.trim()) reasons.push('approved_memory_disabled_for_real_mandate_ai')
    if (detectedClasses.length > 0) reasons.push('raw_identifier_detected_in_real_mandate_payload')
  }

  return {
    decision: reasons.length === 0 ? 'ALLOW' : 'BLOCK',
    reasons,
    dataMode,
    provider,
    detectedClasses,
    promptDigest,
    memoryDigest,
    readiness,
  }
}

export function createPrivacyReceipt(input: {
  decision: PrivacyDecision
  privacy?: LawyerPrivacyEnvelope | null
  providerRequestId?: string
  model?: string
  at?: string
  signingKey?: string
}): PrivacyReceipt {
  const at = input.at || new Date().toISOString()
  const privacy = input.privacy || {}
  const base = {
    schema: 'lawyer-privacy-receipt/0.1' as const,
    policyVersion: LAWYER_PRIVACY_POLICY_VERSION,
    at,
    decision: input.decision.decision,
    reasons: [...input.decision.reasons],
    dataMode: input.decision.dataMode,
    provider: input.decision.provider,
    purpose: privacy.purpose?.trim() || null,
    caseRefDigest: privacy.caseRef ? sha(privacy.caseRef) : null,
    promptDigest: input.decision.promptDigest,
    memoryDigest: input.decision.memoryDigest,
    detectedClasses: [...input.decision.detectedClasses],
    ...(input.providerRequestId ? { providerRequestId: input.providerRequestId } : {}),
    ...(input.model ? { model: input.model } : {}),
    readinessDigest: input.decision.readiness.proofDigest,
  }
  const receiptDigest = sha(canonical(base))
  const signingKey = input.signingKey ?? process.env.PRIVACY_RECEIPT_SIGNING_KEY
  if (!signingKey) return { ...base, receiptDigest }
  const signature = crypto.createHmac('sha256', signingKey).update(receiptDigest).digest('base64')
  return { ...base, receiptDigest, signature, signatureAlgorithm: 'HMAC-SHA256' }
}

export function verifyPrivacyReceipt(receipt: PrivacyReceipt, signingKey: string): boolean {
  if (!receipt.signature || receipt.signatureAlgorithm !== 'HMAC-SHA256') return false
  const { receiptDigest, signature, signatureAlgorithm: _algorithm, ...withoutSignature } = receipt
  const expectedDigest = sha(canonical(withoutSignature))
  if (expectedDigest !== receiptDigest) return false
  const expected = crypto.createHmac('sha256', signingKey).update(receiptDigest).digest('base64')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
