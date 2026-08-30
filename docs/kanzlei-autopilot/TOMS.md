# Technische und organisatorische Maßnahmen (TOMs) — Kanzlei Autopilot

Status: **Pilot-Arbeitsfassung zur Kanzlei-/Datenschutzprüfung**. This is not a certification or substitute for the Kanzlei's Art. 32 GDPR assessment.

## 1. Confidentiality / access

- authenticated Pro workspace; no real case dashboard on public routes
- tenant-scoped server access
- role/scope checks for case, research, write and audit functions
- unknown matter classification defaults to `real_mandate`
- cross-tenant and cross-matter authority violations fail closed
- session idle expiry and explicit logout
- provider/API credentials stored only as secrets; no browser Vite AI key
- Advoware writes require exact action-bound approval before discovery/auth/network

## 2. Data minimisation & pseudonymisation

- external AI receives only purpose-specific derived/pseudonymised facts
- direct identifier scanner blocks common identifiers and test canaries
- real-mandate external AI requires pseudonymised case reference
- real-mandate external AI receives no approved-memory examples
- privacy receipts contain prompt/memory digests, not prompt content
- audit entries store control metadata, not mandate prose

## 3. External AI provider boundary

- privileged lawyer AI path pins one approved provider
- provider failover disabled for privileged mode
- real mandate is BLOCK until provider contract/DPA/confidentiality/subprocessor/retention/TOM/DPIA checks are evidenced
- raw identifiers remain BLOCK even after organisational release
- every blocked request stops before `chat()` and exposes provider-call count 0
- model output remains draft until lawyer review
- citations are verified against the local law corpus before presentation as verified

## 4. Storage

### Local working data

Current pilot browser state may contain mandate data locally. Therefore pilot devices must have:

- full-disk encryption enabled
- OS login protected with strong password/PIN
- automatic screen lock
- current OS/browser security updates
- no shared browser profile
- no unapproved browser extensions with page access
- device backup policy agreed with Kanzlei

### Cloud sync

- legacy plaintext sync endpoint accepts **synthetic matters only**
- any real or unclassified matter returns `SECURE_VAULT_REQUIRED`
- secure vault encrypts the full snapshot in the browser before network transfer
- AES-256-GCM authenticated encryption
- PBKDF2-HMAC-SHA256, currently 600,000 iterations, random 128-bit salt
- random 96-bit GCM IV per encryption
- tenant context is authenticated as AES-GCM additional data
- server stores only opaque ciphertext envelope and does not receive the passphrase/key
- wrong tenant/passphrase/tampering fails decryption
- encrypted pilot vault TTL: 30 days, renewable by explicit upload

Encrypted data remains personal data for GDPR purposes; encryption reduces disclosure risk but does not remove legal obligations.

## 5. Transport

- HTTPS/TLS for browser ↔ GitLaw API and provider calls
- no secret values in URL query parameters
- `Cache-Control: no-store` on privileged research/readiness/vault endpoints
- CORS/origin checks on server endpoints

## 6. Integrity

- exact action digests bind Advoware approvals to operation + params + body
- privacy receipts digest policy/readiness/prompt/memory state
- optional HMAC-SHA256 privacy receipt signing
- AES-GCM detects vault modification
- local audit chain is tamper-evident; server audit records provide independent metadata where configured
- no silent legal deadline confirmation

## 7. Availability / recoverability

Pilot target:

- encrypted export/vault as secondary recovery copy
- restoration tested before productive dependency on the tool
- Advoware remains authoritative source for connected Kanzlei records during the pilot
- provider outage must degrade to BLOCK/manual workflow, not alternate-provider secret disclosure
- no automated destructive action in outage recovery

## 8. Separation / isolation

- tenant namespace on authenticated APIs/storage
- matter ID/context on work packets and action receipts
- ambiguous matter matching routes to review
- no fuzzy autonomous filing of email/document into a matter
- cross-matter memory disabled for privileged external AI

## 9. Logging & observability

Allowed in security/audit records:

- hashed user identity
- tenant ID
- action type
- entity identifier where safe
- policy version/digests
- reasons for block
- provider/model/request ID after an actual AI call
- token/cost telemetry

Forbidden:

- raw prompt text in privacy receipt/audit diff
- client secrets
- API tokens
- vault passphrase
- document contents merely for debugging

## 10. Retention & deletion

- secure encrypted pilot vault: 30-day TTL
- legacy plaintext sync forbidden for real/unclassified matters
- local data deletion via Kanzlei-controlled reset/export workflow
- provider retention must be independently evidenced before real-mandate AI release; product default remains locked
- deletion/subject-right handling procedure must identify every processor and storage location

## 11. Incident controls

Kill switches:

1. set `LEGAL_AI_REAL_MANDATE_ENABLED=0` / remove release gate
2. revoke provider/API credentials
3. disable connector credentials
4. revoke Advoware app credentials if affected
5. disable cloud sync / delete encrypted vault when appropriate
6. preserve metadata needed for investigation without copying mandate secrets into incident tickets

See `INCIDENT_RESPONSE.md`.

## 12. Regular testing

Before pilot and after material changes:

- CI authority tests
- lawyer privacy tests
- secure vault encryption/tamper tests
- Advoware zero-call write-gate tests
- cross-matter/tenant tests
- live Privacy Proof Center gauntlet
- restore test
- manual review of release-gate evidence

A failed privacy or authority invariant blocks promotion; it is not accepted as a known warning.
