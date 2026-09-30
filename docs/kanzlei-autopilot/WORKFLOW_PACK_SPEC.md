# Kanzlei Autopilot — Workflow Pack v1

A Workflow Pack is the reusable unit that turns Kanzlei Autopilot from a custom implementation into a repeatable product.

## Design rule

The core must never contain a customer name, customer credential, private template or customer-specific authority assumption.

```text
Kanzlei Autopilot Core
        +
Domain Workflow Pack
        +
Customer Configuration
```

Customer #2 receives the same core and Workflow Pack with different templates, checklists, credentials and authority envelope.

## Required fields

- `id`, `version`, `sector`, `domain`, `name`, `purpose`
- `triggers`
- `requiredInputs`
- `automaticActions` — `ALLOW`
- `approvalActions` — `APPROVAL`
- `blockedActions` — `BLOCK`
- `dataPolicy`
- `successCriteria`
- `measurements`
- `defaultAutonomy`
- `promotion`

The executable validator lives at `pilot/law-firm/autopilot/workflow-pack.mjs`.

## Golden Workflow #1

`migration/document-readiness`

```text
new document / message
→ exact matter match
→ dedupe
→ OCR/classification preparation
→ what changed?
→ checklist comparison
→ missing documents
→ timeline/date candidates
→ factual follow-up draft
→ work packet
→ lawyer reviews exceptions
```

### Automatic preparation

Exact matter matching, dedupe, OCR/classification preparation, delta preparation, checklist comparison, timeline proposal, deadline candidate proposal, factual follow-up drafting and work-packet preparation.

### Approval

Document usability confirmation, binding deadline confirmation, external client-message send and authoritative matter-record writes.

### Block

Ambiguous automatic matter matching, cross-matter access, final legal decisions, unapproved beA submission and self-expanded authority.

## Earned autonomy

`P0 synthetic → P1 shadow → P2 prepare → P3 bounded execute → P4 earned autonomy`

For Golden Workflow #1, promotion eligibility currently requires at least 100 observed runs, correction rate ≤2%, and exactly zero unsafe executions, wrong-matter events and critical misses.

Promotion eligibility is evidence, not automatic permission. The organisation still owns the final authority decision.
