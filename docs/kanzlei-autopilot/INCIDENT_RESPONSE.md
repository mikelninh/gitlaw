# Confidentiality & Data Incident Response — Kanzlei Autopilot

Status: pilot working procedure. Regulatory/client notification decisions remain with the Kanzlei/controller and appropriate legal/privacy advisers.

## Severity triggers

Treat as high priority if any of these occurs:

- mandate content reached an unauthorised provider/person
- a raw identifier escaped a real-mandate privacy gate
- cross-matter or cross-tenant access succeeded
- an unapproved Advoware/beA/external write executed
- provider/API credentials may be compromised
- laptop/browser profile containing mandate data is lost/compromised
- plaintext real-mandate snapshot was stored remotely
- audit/privacy receipt integrity cannot be verified

## First 15 minutes — contain

1. **Disable real-mandate external AI** (`LEGAL_AI_REAL_MANDATE_ENABLED=0`).
2. Revoke/rotate affected provider credentials.
3. Disable affected connector (Advoware/mail/etc.) or revoke its token/App-ID where appropriate.
4. Stop automation execution if scope is unclear.
5. Preserve relevant metadata/receipts/log IDs; do **not** paste mandate documents into GitHub/Slack/support tickets.
6. Record time, reporter, affected tenant/matter pseudonymous references and suspected boundary.

## First assessment

Answer with evidence, not assumptions:

- what exact data categories were involved?
- which data subjects/matters?
- did data leave the Kanzlei/GitLaw authorised boundary?
- which processor/subprocessor/person received it?
- was content encrypted/pseudonymised?
- did an actual provider request ID exist?
- what does `X-Privacy-Provider-Calls` / privacy receipt show?
- was the action merely prepared or actually executed?
- can access be revoked/deleted?
- is the incident ongoing?

## Evidence collection

Collect only what is necessary:

- privacy receipt digest/signature
- provider request ID if present
- policy readiness digest
- audit event IDs
- action digest/approval ID
- timestamps
- connector/provider status
- relevant deployment/commit SHA

Keep raw mandate content in the authorised case system; reference it from the incident record rather than copying it.

## Decision owners

- technical containment: ____________________
- Kanzlei/controller decision: ____________________
- professional-secrecy/legal review: ____________________
- DPO/privacy contact if applicable: ____________________
- provider security contact: ____________________

## GDPR / professional obligations

The Kanzlei must assess whether the event is a personal-data breach and whether notification/communication duties apply, including applicable deadlines. GitLaw must not automatically decide or send a regulatory/client notification.

## Recovery

Before re-enabling the affected capability:

- root cause identified
- exploit/bypass reproduced in a safe synthetic test
- regression test added
- CI green
- compromised credentials rotated
- processor/provider deletion/containment evidence collected where relevant
- affected release gate independently re-reviewed
- Kanzlei owner authorises re-enable

## Post-incident proof

Publish internally:

- what failed
- why the existing control missed it
- new control/test
- residual risk
- whether any autonomy level was reduced

Do not hide failures to preserve product optics. A safety system becomes trustworthy by making failures inspectable and preventing recurrence.
