# GitLaw Pro — Product Architecture Pack

GitLaw Pro is the legal-product proof for the Product Architect OS and the working pilot surface for Bao.

The goal is not “an AI lawyer.” The goal is to make legal research, case preparation and bounded workflow execution dramatically faster while keeping legal authority, confidentiality boundaries and consequential external actions under qualified human control.

## The six-file contract

- [`intent.md`](intent.md) — who GitLaw Pro serves, the painful job and measurable outcome
- [`product-spec.md`](product-spec.md) — what the product should do and refuse to do
- [`architecture.md`](architecture.md) — components, data flow, provider boundaries and authority model
- [`constraints.md`](constraints.md) — Mandatsgeheimnis, privacy, security, compliance and irreversible decisions
- [`golden-cases.md`](golden-cases.md) — the three workflows that must work end to end
- [`verification.md`](verification.md) — the evidence required before trust or autonomy increases

## Bao pilot — the product loop

```text
REAL CASE / SYNTHETIC PRE-PILOT CASE
        ↓
CASE WORKSPACE
        ↓
GROUNDED RESEARCH
        ↓
SOURCE + CITATION VERIFICATION
        ↓
DRAFT / NEXT-ACTION PROPOSAL
        ↓
RISK + AUTHORITY CHECK
        ↓
BAO REVIEWS / APPROVES
        ↓
BOUNDED EXECUTION
        ↓
AUDIT + OUTCOME + FEEDBACK
```

The model may interpret, retrieve, structure and propose. **Bao remains the legal decision-maker.**

## Three primary golden cases for GitLaw Pro

### Golden 01 — Grounded legal research → useful case answer

**Question:** Can GitLaw Pro turn a messy legal question and case file into a useful answer whose important claims are actually supported by inspectable sources?

Proof must show:

- relevant facts extracted from the case
- relevant sources retrieved
- citations verified against source text
- uncertainty/conflicting authority visible
- no invented source or unsupported decisive claim
- Bao can inspect the evidence quickly

Success is not “good prose.” Success is **faster qualified review with traceable support**.

### Golden 02 — Missing or conflicting evidence → no bluffing

**Question:** What happens when the file is incomplete, sources conflict, or a required fact is unknown?

Proof must show:

- missing evidence is surfaced explicitly
- conflicting facts/authority remain distinct rather than silently merged
- the system asks for or recommends the next evidence-gathering step
- confidence does not substitute for evidence
- the workflow cannot mark itself complete while a required condition is unmet

This is the reliability case.

### Golden 03 — Consequential external action → lawyer authority gate

**Question:** Can the system prepare a useful external legal action without gaining authority to send or execute it by itself?

Proof must show:

- draft/action is prepared from grounded case context
- recipient/action/tool capability is explicit
- the runtime blocks execution before Bao approval
- approval/rejection is recorded
- the executed payload is the approved payload or execution fails closed
- audit evidence remains available afterwards

This is the trust case.

## What we should measure with Bao

For each pilot workflow record:

1. **Baseline time** without GitLaw Pro
2. **Assisted time** with GitLaw Pro
3. **Material corrections** Bao had to make
4. **Unsupported/citation failures**
5. **Missing-evidence detection rate**
6. **Whether authority boundaries behaved correctly**
7. **Bao usefulness rating** (1–5)
8. **Would he use this on the next comparable case?** yes/no + why

The north-star pilot metric is not token count or number of agent steps. It is:

> **Qualified legal work completed faster, with evidence and authority intact.**

## Immediate red decisions before real client data

These are Product Architect / lawyer decisions, not agent experiments:

- exact deployment and data-processing boundary
- which real client data may enter which component
- retention/deletion rules
- provider/subprocessor policy
- access-control and identity model
- logging/redaction policy
- which actions always require qualified human approval
- what is never sent to an external model/provider
- incident and failure procedure

Until those are explicitly accepted, synthetic or appropriately controlled test data remains the default.

## Day-to-day use with Bao

The interface should make five things obvious in seconds:

1. **What case are we trying to move forward?**
2. **What has the agent team already done?**
3. **What evidence supports the current proposal?**
4. **What is blocked or uncertain?**
5. **What decision needs Bao now?**

Everything else is secondary UI.

## Definition of Done for GitLaw Pro changes

A meaningful change is only done when:

- the relevant architecture-pack files still describe reality
- affected golden cases pass or the product contract was deliberately changed
- important evidence is inspectable
- consequential actions remain behind the intended authority boundary
- Bao can try the workflow rather than merely review a code diff

That is how GitLaw Pro becomes both a useful legal product and strong Product Architect proof.