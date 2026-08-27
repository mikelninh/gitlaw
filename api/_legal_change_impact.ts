import * as crypto from 'node:crypto'
import type { ToolDef } from './_agent'

export type ChangeSignal =
  | 'money'
  | 'percentage'
  | 'duration'
  | 'date'
  | 'liability'
  | 'warranty'
  | 'termination'
  | 'governing_law'
  | 'party_or_scope'
  | 'other_text'

export type ClauseChange = {
  clauseId: string
  before: string | null
  after: string | null
  change: 'added' | 'removed' | 'modified'
  signals: ChangeSignal[]
  beforeHash: string | null
  afterHash: string | null
}

const SIGNALS: Array<[ChangeSignal, RegExp]> = [
  ['money', /(?:€|eur\b|usd\b|gbp\b|\$)\s*[\d.,]+|\b[\d.,]+\s*(?:€|eur\b|usd\b|gbp\b)/i],
  ['percentage', /\b\d+(?:[.,]\d+)?\s*%/],
  ['duration', /\b\d+\s*(?:day|days|tage?|monat|monate|months?|jahre?|years?|wochen?|weeks?)\b/i],
  ['date', /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/],
  ['liability', /\b(?:liability|haftung|haftungs|indemnif|freistell)/i],
  ['warranty', /\b(?:warrant|garantie|gewährleist|zusicherung)/i],
  ['termination', /\b(?:termination|kündig|beendig|withdrawal|rücktritt)/i],
  ['governing_law', /\b(?:governing law|anwendbares recht|jurisdiction|gerichtsstand|exclusive venue)/i],
  ['party_or_scope', /\b(?:party|parties|gesellschaft|käufer|verkäufer|seller|buyer|scope|leistungsumfang|gegenstand)/i],
]

function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function cosmeticNormalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u00a0\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function clauseKey(line: string, fallback: number): string {
  const m = line.match(/^\s*(?:§\s*)?([0-9]+(?:\.[0-9]+)*[a-z]?)\s*[.)-]?\s+/i)
  return m ? m[1] : `line-${fallback}`
}

function clauseMap(text: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map(cosmeticNormalize)
    .filter(Boolean)

  lines.forEach((line, idx) => {
    const key = clauseKey(line, idx + 1)
    const existing = map.get(key)
    map.set(key, existing ? `${existing} ${line}` : line)
  })
  return map
}

function detectSignals(before: string | null, after: string | null): ChangeSignal[] {
  const joined = `${before ?? ''}\n${after ?? ''}`
  const signals = SIGNALS.filter(([, re]) => re.test(joined)).map(([name]) => name)
  return signals.length ? signals : ['other_text']
}

export function analyzeLegalChangeImpact(input: {
  beforeText: string
  afterText: string
  beforeVersion?: string
  afterVersion?: string
}) {
  const beforeNorm = cosmeticNormalize(input.beforeText)
  const afterNorm = cosmeticNormalize(input.afterText)

  if (beforeNorm === afterNorm) {
    return {
      beforeVersion: input.beforeVersion ?? null,
      afterVersion: input.afterVersion ?? null,
      substantiveChangeCandidates: [],
      cosmeticOnly: true,
      reopenProposal: false,
      requiresHumanMaterialityReview: false,
      claimBoundary: 'Deterministic text comparison only; no legal materiality conclusion is made.',
    }
  }

  const before = clauseMap(input.beforeText)
  const after = clauseMap(input.afterText)
  const keys = new Set([...before.keys(), ...after.keys()])
  const changes: ClauseChange[] = []

  for (const key of keys) {
    const b = before.get(key) ?? null
    const a = after.get(key) ?? null
    if (b === a) continue
    changes.push({
      clauseId: key,
      before: b,
      after: a,
      change: b === null ? 'added' : a === null ? 'removed' : 'modified',
      signals: detectSignals(b, a),
      beforeHash: b === null ? null : hash(b),
      afterHash: a === null ? null : hash(a),
    })
  }

  const highSignal = changes.some((c) => c.signals.some((s) => s !== 'other_text'))

  return {
    beforeVersion: input.beforeVersion ?? null,
    afterVersion: input.afterVersion ?? null,
    substantiveChangeCandidates: changes,
    cosmeticOnly: changes.length === 0,
    reopenProposal: changes.length > 0,
    priorityReviewCandidate: highSignal,
    requiresHumanMaterialityReview: changes.length > 0,
    claimBoundary:
      'A changed clause can justify a review proposal, but only a competent human or explicit rule may decide legal materiality or which prior approval becomes invalid.',
  }
}

export function buildLegalChangeImpactTool(): ToolDef {
  return {
    name: 'analyze_legal_change_impact',
    description:
      'Deterministically compares two legal-document versions, returns before/after evidence and high-signal change markers. It proposes review; it never decides legal materiality.',
    schema: {
      type: 'object',
      properties: {
        beforeText: { type: 'string' },
        afterText: { type: 'string' },
        beforeVersion: { type: 'string' },
        afterVersion: { type: 'string' },
      },
      required: ['beforeText', 'afterText'],
      additionalProperties: false,
    },
    handler: (input) => analyzeLegalChangeImpact(input as {
      beforeText: string
      afterText: string
      beforeVersion?: string
      afterVersion?: string
    }),
  }
}
