# Kanzlei Autopilot V1

## North star

> Return real hours to the lawyer every week while preserving client confidentiality, source quality and final lawyer authority.

The primary metric is **confirmed lawyer-hours returned / week**. It is measured only from lawyer-confirmed before/after baselines. Synthetic target models are labelled as engineering targets and are never published as customer evidence.

## Target operating loop

```text
Mandant / email / WhatsApp / scan / portal
                 ↓
          canonical GitLaw case
                 ↓
      intake + document preparation
                 ↓
 OCR → classify → dedupe → checklist state
                 ↓
 missing-doc routine communication draft
                 ↓
 fact + change + timeline packet
                 ↓
 deadline candidate + source
                 ↓
 GitLaw research + citation verification
                 ↓
 draft / beA package / billing preparation
                 ↓
             BAO TODAY
      only consequential exceptions
                 ↓
 lawyer approve / edit / reject
                 ↓
 authorized external action
                 ↓
 audit + time/value measurement
```

## V1 already implemented on this branch

### Pure authority/orchestration core

`core.mjs` encodes `ALLOW / APPROVAL / BLOCK` and fails closed on unknown actions.

**ALLOW preparation**

- intake structure
- OCR preparation
- document classification proposal
- duplicate check
- timeline proposal
- deadline candidate extraction
- research preparation
- draft preparation
- beA package preparation
- billing preparation

**APPROVAL**

- binding deadline confirmation
- substantive client advice send
- beA submission
- matter acceptance
- invoice send in V1

**BLOCK**

- changing bank details
- self-expanding agent authority
- final legal decision
- cross-matter / cross-tenant access

Routine factual client messages are autonomous only when the source event, client channel, lawyer-approved template and (where relevant) lawyer-approved checklist are all present. Duplicate document chases are suppressed.

### Authenticated `Bao Today` exception desk

Route: `/#/pro/autopilot`

The operational dashboard lives inside the existing `ProAuth` boundary. There is deliberately no public route that reads case state.

It reads real GitLaw Pro case/research state and surfaces:

- deadline/review exceptions for Bao
- pending document review for the team
- unreviewed research
- OCR opportunities
- missing required checklist items
- open team tasks
- cases with no intervention needed

### One-minute safe runner

While the authenticated Autopilot page is visible, the runner executes immediately and then every minute.

It currently performs only idempotent internal preparation:

1. queues one OCR job per document when needed;
2. creates one missing-document preparation task per missing required checklist item;
3. creates one lawyer deadline-review task for dates within 14 days.

The runner contains **no email, WhatsApp, beA or payment provider** and reports `externalMessagesSent = 0` and `legalDecisionsMade = 0`.

### One-page case work packet

Route: `/#/pro/autopilot/:caseId`

For a case it compiles:

- matter/status
- deadline review signal
- document counts and missing required documents
- research status and verified-citation counts
- recent drafts
- recent case/document/research/draft events
- Bao / team / automatic next actions
- prepared factual missing-document message in German and Vietnamese

The message is **prepared, not sent** in V1.

### Bao public entry

Route: `/#/bao`

The public page contains no case-store access. It explains the Autopilot concept and sends Bao into the authenticated Pro workspace.

## Measurement

`measureTimeSavings()` accepts only confirmed non-negative before/after measurements.

Recommended real metrics:

- lawyer minutes / intake
- team minutes / intake
- document touches / matter
- minutes spent chasing documents
- minutes from complete documents → ready for lawyer
- lawyer research minutes / matter
- lawyer drafting minutes / matter
- routine messages / matter
- lawyer attention items / active matter
- correction/rework rate
- unsafe or unauthorized actions
- confirmed lawyer-hours returned / week
- confirmed staff-hours returned / week

## Synthetic engineering target

`syntheticReferenceWeek()` is useful for planning load and prioritisation. Its output is explicitly labelled:

`synthetic_engineering_target_not_customer_evidence`

It must never be turned into a customer-facing ROI claim.

## Highest-value next production slices

### P0 — measure Bao's real baseline

Sample 10–20 normal matters. Capture actual minutes for intake, document handling, follow-up, timeline reconstruction, research, first draft, deadline review and billing preparation.

### P1 — real document processor

Replace the beta OCR placeholder with an approved production provider / locally appropriate processing setup. Preserve per-document provenance and review status. Do not mark a document legally usable automatically.

### P2 — approved routine communication executor

Connect a Kanzlei-controlled communication provider. Only factual, lawyer-template-approved messages may execute autonomously. Substantive advice stays `APPROVAL`.

### P3 — inbox/channel ingestion

Connect email and other approved channels into the canonical case intake queue. Incoming channels are transport, not source of truth. Do not allow the connector to approve documents or legal completeness.

### P4 — deadline evidence flow

Extract dates and source text automatically; create deadline candidates. Require lawyer confirmation before a date becomes a binding deadline in the Kanzlei system.

### P5 — research + draft factory

Use GitLaw's existing retrieval/citation verification to prepare case-specific research packets and drafts automatically after the case facts are sufficiently structured. Keep citations, uncertainty and missing facts visible.

### P6 — beA preparation

Monitor/ingest where technically and contractually appropriate, match to a matter, prepare package + attachments + checks. Keep submission behind exact lawyer approval until longitudinal evidence supports any narrower delegation.

### P7 — billing + value ledger

Prepare billing from documented case activity. Keep price exceptions/write-offs/bank changes gated. Produce a weekly private value report based on measured work, not estimates.

## Production gate before real confidential client data

Do not move from synthetic/redacted shadow mode to real mandate data merely because the UI works. Confirm the Kanzlei's data-processing setup, confidentiality/professional-duty assessment, provider contracts/AVVs where required, access control, retention/deletion, backups, incident response and exact systems of record.

The Autopilot should make routine work disappear. It should **not make responsibility disappear**.
