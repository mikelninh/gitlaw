# GitLaw: from first use to a paid, repeatable outcome

Status: implementation candidate, 6 October 2026. No production permission, customer savings, payment or retention is established by this change.

## The one outcome

Prepare one document pack for a lawyer to review: sources visible, approved case-specific checklist, incoming versions reviewed, missing items clearly identified, no duplicate requests, unresolved matters explicit. This is not a successful application, legal opinion, guaranteed complete legal file or autonomous representation.

Keep the existing firm system authoritative during shadow mode. Do not ask the firm to adopt a second master record or replace its practice-management system. Cutover, if ever needed, requires a separate approved plan.

## First appointment: no preparation homework

A practitioner and, ideally, the staff member who actually handles documents try `viewer/public/migration-office-demo.html` with the bundled synthetic example. Allow 15 minutes; target an unassisted completion within five minutes. Do not treat the target as an observed time saving. Watch without coaching and record where the person gets stuck. Ask what they would still need to do in their current workflow. The exercise accepts no documents or free text and makes no model/network requests. Its receipt stays local unless the user deliberately shares it.

Three useful observations: did the person finish, did they understand the handoff, and would they try another? A synthetic session is not a customer outcome or payment signal. Fix the largest observed obstacle before adding features. Do not make the lawyer assemble 20–30 cases just to understand the product.

## Paid pilot only after an explicit scope agreement

The existing historical pilot remains separate and unchanged: 20–30 completed historical cases, genuinely anonymised/de-identified by the firm before transfer, approved setup, named lawyer reviewer, no live mandate actions. The operator helps with preparation through the firm's approved process; there is no permission to upload raw files to a public demo. Pseudonymisation alone is not anonymisation. Where effective anonymisation cannot be established, stop and qualify a separate lawful real-data setup.

Proposed offer to test, not active pricing: EUR 299 net for one bounded historical workflow pilot, no automatic renewal, no live-client hosting promise. Define deliverables, case/page limits, review time, dates, transfer channel, retention and remedy/refund terms before acceptance. Invoice only the agreed service, record settlement separately from an accepted quote, and do not advertise a production subscription before its readiness gate is met. A pilot can be loss-making research; log all delivery hours rather than disguising them as free founder time.

The operator must not expand the existing replay into a production document service through a renamed button. Review whether its current input/output schema measures this document-preparation outcome; reconcile that mapping before running the pilot. No lawyer is assigned by this file.

## Real-data release gate: evidence, not checked boxes

All go-live requirements in GO_LIVE_CHECKLIST.md continue to apply. For each requirement attach owner, exact environment/revision, dated test or reviewed document, result, expiry/review date, and remaining limitations. Unknown is not PASS.

1. Firm-authorised legal/privacy reviewer: roles, lawful basis, processor/subprocessor agreements, confidentiality, specific section 43e BRAO assessment including subsection 5 where relevant, retention/exit, transfer assessment, sensitive data and DPIA screening. EU hosting alone is not approval.
2. Engineering/security reviewer: named firm accounts with MFA, per-case/tenant server authorization, revocable client access, cross-tenant and forged-ID tests, private encrypted object storage, restricted downloads, file validation/malware quarantine, safe audit logging, exports, deletion and a witnessed restore test. A browser role selector provides none of this.
3. Operational owner and backup: bounded queue and page limits, retries/backoff/dead-letter handling, idempotency, alarms for failures and unexpected costs, pause/kill switch, provider-outage/manual fallback, tested incident procedure and rollback. Never widen permissions from model confidence.
4. Practitioner acceptance: current case-specific checklist approved, each document/version source-linked, replacement invalidates review, open questions visible, consequential actions remain human-owned. Never infer legal sufficiency from a green checklist.

Start approved real-data operation with one firm and a limited number of supervised cases, not self-service public access. The historical pilot's seven-day raw-data policy is not the retention policy of a real mandate file.

## Runbook after deployment

A document arrival may trigger validation, deduplication and optional approved OCR/classification. It may not approve a document, a checklist, a deadline or a legal filing. New versions invalidate affected approvals. Uncertainty routes to a named human; an AI outage leaves original documents and manual workflow available. Notifications and legal communications stay approval-gated in v1. Do not introduce autonomous mailbox/WhatsApp access before first-use evidence warrants it.

## Economics and customer value

Use `outcome-economics.mjs` with ordered, unique attempt rows; keep synthetic and observed records separate. Store opaque IDs only, not names or case text. Final accepted work needs recorded human review. Allocate actual model/OCR/tool cost, operator time, payment costs and hosting. Retry and failed-attempt costs remain in the numerator. Missing data stays null. Reconcile operator-entered revenue against paid invoices and refunds. This helper is not connected to production telemetry or billing yet and does not implement budget enforcement.

For baseline comparisons, use matched case complexity and independent or counterbalanced review where possible. Include the firm's setup, import, review, correction and export time. Track all attempted cases, not just attractive successes. Saved capacity is not automatically realised cash or billable revenue.

Illustrative monthly offer hypothesis: EUR 299 net, up to 40 document packs and an agreed page allowance; additional usage needs explicit consent. Not a launched tariff.
- Customer: 40 packs x 15 minutes saved / 60 x EUR 45/hour = EUR 450 of capacity, not cash saved. At only 20 packs x 5 minutes, value is EUR 75, so the same price fails this hypothesis.
- Supplier assumptions: EUR 20 model/OCR/tools (including retries), EUR 20 hosting allocation, EUR 20 support (0.5 hour x EUR 40), EUR 26.67 case intervention (40 minutes x EUR 40/hour), EUR 9 payment fees. Total EUR 95.67; contribution EUR 203.33, about 68.0%. This excludes development, acquisition, fixed overhead and tax; it is not profit.
- Five minutes of operator intervention per pack instead of one adds EUR 106.67/month, reducing contribution to EUR 96.67, about 32.3%. Test exception burden before promising automation or price.

## Evidence gates for expansion

Proposed gates, not achievements: after authorised testing, review at least 20 representative completed cases; all critical security/authority failures block expansion; target >=30% reduction in total customer handling time with no unacceptable quality regression. A small sample is preliminary and cannot establish a rare-event safety rate.

First paid invoice is a distinct milestone. Repeat use means another genuine pack on another day; retention means renewal, not a demo rating. Before wider onboarding, seek three paying firms, two billing cycles of actual reuse, acceptable operator workload and a contribution margin target agreed from observed costs. Small-cohort results are directional, not a market forecast. Ask why each non-returning customer stopped. No fabricated testimonials or automatic renewal without agreement.

## Verification and remaining boundaries

37 new local Node contract tests passed. Chromium exercised the exact HTML using Playwright set_content: review, request, receipt export, role-limited rehearsal release, reset and 390/320px layout, with no page errors or application network requests. Managed Chromium blocked direct file and localhost navigation; hosted delivery was not tested. The full repository test suite and production endpoints were not run locally. No existing auth, storage, secrets, flags, external sending or payment configuration was changed.

These tests do not prove real customer benefit, authentication, legal correctness, GDPR compliance or production readiness. The existing production go-live gate remains closed until independently reviewed evidence exists.
