import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseLegalCitation, resolveLegalAuthority } from './_legal_authority'
import { buildLegalDecisionRecord, buildLegalFindingRecord, verifyLegalChainAgainstCorpus } from './_legal_findings'
import { trustChainDigest, validateConsequentialAction, validateTrustChain } from './_trust_chain'

const ORIGINAL = `# Strafgesetzbuch

**Abkürzung:** StGB
**Ausfertigungsdatum:** 1871-05-15
**Stand:** Teststand 2026-09-01

---

### § 1 — Keine Strafe ohne Gesetz

Eine Tat kann nur bestraft werden, wenn die Strafbarkeit gesetzlich bestimmt war, bevor die Tat begangen wurde.

### § 2 — Zeitliche Geltung

Andere Vorschrift.
`

let dir = ''

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitlaw-trust-'))
  fs.writeFileSync(path.join(dir, 'stgb.md'), ORIGINAL, 'utf8')
  process.env.GITLAW_LAWS_DIR = dir
})

afterEach(() => {
  delete process.env.GITLAW_LAWS_DIR
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('legal authority resolver', () => {
  it('resolves a client citation to exact server-side paragraph bytes', () => {
    expect(parseLegalCitation('§ 1 StGB')).toEqual({ marker: '§', number: '1', abbreviation: 'StGB' })
    const resolved = resolveLegalAuthority('§ 1 StGB')
    expect(resolved.paragraphHeading).toBe('§ 1 — Keine Strafe ohne Gesetz')
    expect(resolved.paragraphText).toContain('Eine Tat kann nur bestraft werden')
    expect(resolved.lawStand).toBe('Teststand 2026-09-01')
    expect(resolved.corpusSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(resolved.paragraphSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects unknown or malformed authority instead of accepting client evidence', () => {
    expect(() => resolveLegalAuthority('made up law')).toThrow('legal_citation_invalid')
    expect(() => resolveLegalAuthority('§ 999 StGB')).toThrow('legal_paragraph_not_found')
  })
})

describe('legal trust chain', () => {
  it('is traceable while pending but cannot authorize a consequential write', () => {
    const finding = buildLegalFindingRecord({
      caseId: 'CASE-1',
      citation: '§ 1 StGB',
      findingText: 'The prepared legal conclusion relies on § 1 StGB.',
      createdBy: 'assistant-1',
      traceId: 'trace-create',
      now: '2026-09-01T16:00:00.000Z',
    })
    expect(validateTrustChain(finding.trustChain)).toEqual([])
    expect(finding.trustChain.evidence[0].locator.kind).toBe('paragraph')
    expect(finding.trustChain.humanDecision.status).toBe('pending')
    expect(validateConsequentialAction(finding.trustChain, '')).toContain('human_decision_pending')
    expect(finding.chainSha256).toBe(trustChainDigest(finding.trustChain))
  })

  it('allows only the named lawyer approval and closes again after a later rejection', () => {
    const finding = buildLegalFindingRecord({
      caseId: 'CASE-1', citation: '§ 1 StGB', findingText: 'Prepared conclusion.',
      createdBy: 'assistant-1', traceId: 'trace-create', now: '2026-09-01T16:00:00.000Z',
    })
    const approved = buildLegalDecisionRecord(finding, {
      status: 'approved', actorId: 'lawyer-alice', traceId: 'trace-approve', now: '2026-09-01T16:05:00.000Z',
    })
    expect(verifyLegalChainAgainstCorpus(finding, approved)).toEqual([])
    expect(validateConsequentialAction(approved.trustChain, 'lawyer-bob')).toContain('human_approval_mismatch')

    const rejected = buildLegalDecisionRecord(finding, {
      status: 'rejected', actorId: 'lawyer-bob', traceId: 'trace-reject', now: '2026-09-01T16:10:00.000Z',
    })
    expect(verifyLegalChainAgainstCorpus(finding, rejected)).toContain('human_decision_rejected')
    expect(approved.chainSha256).not.toBe(rejected.chainSha256)
  })

  it('re-verifies the corpus and fails closed when the law snapshot changes after approval', () => {
    const finding = buildLegalFindingRecord({
      caseId: 'CASE-1', citation: '§ 1 StGB', findingText: 'Prepared conclusion.',
      createdBy: 'assistant-1', traceId: 'trace-create', now: '2026-09-01T16:00:00.000Z',
    })
    const approved = buildLegalDecisionRecord(finding, {
      status: 'approved', actorId: 'lawyer-alice', traceId: 'trace-approve', now: '2026-09-01T16:05:00.000Z',
    })
    expect(verifyLegalChainAgainstCorpus(finding, approved)).toEqual([])

    fs.writeFileSync(
      path.join(dir, 'stgb.md'),
      ORIGINAL.replace('Teststand 2026-09-01', 'Teststand 2026-09-02').replace('Eine Tat kann nur bestraft werden', 'Eine geänderte Tat kann nur bestraft werden'),
      'utf8',
    )
    const reasons = verifyLegalChainAgainstCorpus(finding, approved)
    expect(reasons).toContain('legal_corpus_snapshot_changed')
    expect(reasons).toContain('legal_authority_version_changed')
    expect(reasons).toContain('legal_paragraph_text_changed')
  })
})
