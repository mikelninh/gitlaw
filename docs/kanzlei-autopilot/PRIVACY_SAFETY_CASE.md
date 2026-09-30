# GitLaw Kanzlei Autopilot — Privacy & Mandatsgeheimnis Safety Case

Status: **working safety case for pilot review — not a legal certification**  
Policy: `lawyer-privacy/0.2`

## Safety claim

> GitLaw must not disclose, transmit, persist or reuse real mandate information outside an explicitly authorised purpose and boundary merely because an automation or AI feature is technically capable of doing so.

The system is designed to make the safe state the default:

- unknown/unclassified matter → **REAL MANDATE**
- real mandate → **Shadow Mode / no external AI by default**
- external AI → **BLOCK** until every organisational + technical release gate is evidenced
- raw direct identifiers in a real-mandate AI payload → **BLOCK even after the release gate is green**
- missing mandate-specific consent/necessity evidence → **BLOCK**
- reusable/cross-prompt memory for privileged AI → **BLOCK**
- provider failover for privileged AI → **DISABLED**
- browser-held AI API keys → **DISABLED**
- plaintext cloud snapshot containing a real/unclassified matter → **BLOCK**
- consequential legal action → separate Authority Control approval boundary

## What this proves — and what it does not

This safety case can prove that specified software controls exist, execute and produce evidence. It does **not** prove by itself that a Kanzlei is legally compliant, that a DPIA is unnecessary, that a contract is sufficient, or that any AI output is legally correct. Those are human legal/organisational decisions.

## Legal-control map

| Source / duty | Product control | Automated proof | Runtime evidence | Human evidence |
|---|---|---|---|---|
| § 43a BRAO — Verschwiegenheit | real-mandate default, tenant/matter isolation | privacy + cross-matter tests | audit + privacy receipt | Kanzlei policy |
| § 203 StGB — Geheimnisse | no raw secret egress; canary detector; least data | canary attack must BLOCK before provider | `providerCalls=0` block receipt | staff instruction |
| § 43e BRAO — service providers only as necessary; select + bind provider; subproviders; foreign protection; mandate-specific consent where applicable | necessity attestation; provider gates; confidentiality/DPA/subprocessor/foreign-protection checks; per-matter consent evidence | incomplete gate test | readiness digest + receipt | signed contract review + consent evidence |
| GDPR Art. 25 — privacy by design/default | fail-closed classification; minimisation; pseudonymisation | default-classification test | data-mode receipt | TOM review |
| GDPR Art. 28 — processors | provider/DPA/subprocessor release gates | readiness gate test | readiness digest | AVV/DPA + processor register |
| GDPR Art. 32 — security/TOMs/testing | encryption, pseudonymisation, tenant binding, signed receipts, regular gauntlet | vault + tamper + egress tests | CI run + live gauntlet | TOM sign-off |
| GDPR Art. 35 — DPIA where high-risk processing applies | privileged AI remains locked until `dpia_reviewed` | readiness gate | readiness digest | DPIA / documented assessment |

Primary legal texts:

- BRAO § 43a: https://www.gesetze-im-internet.de/brao/__43a.html
- BRAO § 43e: https://www.gesetze-im-internet.de/brao/__43e.html
- StGB § 203: https://www.gesetze-im-internet.de/stgb/__203.html
- GDPR Art. 25: https://eur-lex.europa.eu/eli/reg/2016/679/art_25/oj
- GDPR Art. 28: https://eur-lex.europa.eu/eli/reg/2016/679/art_28/oj
- GDPR Art. 32: https://eur-lex.europa.eu/eli/reg/2016/679/art_32/oj
- GDPR Art. 35: https://eur-lex.europa.eu/eli/reg/2016/679/art_35/oj

## Three operating modes

### P0 — Synthetic

No real client data. External AI may be exercised so the complete workflow can be tested.

Required proof:
- explicit `privacy.dataMode = synthetic`
- no canary/direct identifiers in outbound payload
- privacy receipt for every AI request

### P1 — Shadow / Real mandate

Real work may be mirrored and prepared locally / inside explicitly approved Kanzlei systems, but **no external AI egress**.

This is the default for next week's first real cases.

Permitted examples:
- Advoware read delta
- exact matter matching
- local work packet
- local checklist delta
- task generation
- human deadline review queue
- encrypted vault backup

Not permitted merely because UI exists:
- external LLM call with mandate facts
- external substantive message
- beA submission
- mandate acceptance
- binding deadline confirmation

### P2 — Privileged external AI

May be promoted only for a narrow action after all release gates are true and the matter evidence is complete.

Even in P2:
- direct identifiers are rejected
- data is pseudonymised/minimised
- no cross-matter memory
- one approved provider only
- no automatic provider failover
- no final legal authority

## Real-mandate AI release gates

All server-side gates must be true:

1. privacy enforcement enabled
2. real-mandate AI explicitly enabled
3. provider contract reviewed
4. confidentiality terms confirmed
5. AVV/DPA confirmed
6. subprocessors reviewed
7. comparable secret protection reviewed where relevant
8. Zero Data Retention / equivalent approved retention configuration evidenced
9. TOMs reviewed
10. DPIA/high-risk assessment reviewed
11. incident process ready
12. deletion process ready
13. privacy-receipt signing key configured
14. approved provider pinned

Per matter, additionally:

15. client consent evidence where the chosen mandate-specific external-service use requires it under the Kanzlei's §43e assessment
16. necessity of external service attested
17. specific purpose recorded
18. pseudonymous case reference assigned
19. outgoing content pseudonymised/minimised
20. raw identifier scanner passes
21. reusable memory empty for real-mandate external AI

## Proof objects

### Privacy readiness digest

A SHA-256 digest of the policy version, approved provider and every Boolean release gate. Changing one gate changes the digest.

### Privacy receipt

Every allow/block attempt creates a privacy receipt containing:

- policy version
- time
- ALLOW/BLOCK
- reasons
- data mode
- provider
- purpose
- hash of pseudonymous case reference
- hash of prompt
- hash of memory
- detected secret classes
- provider request ID/model only when a provider call occurred
- readiness digest
- receipt digest
- optional HMAC-SHA256 signature

**The prompt itself is not stored in the receipt.**

### Provider-call proof

Blocked `/api/ask-pro` responses expose `X-Privacy-Provider-Calls: 0`. The live Privacy Proof Center treats a block as PASS only when both are true:

- HTTP 423
- provider calls = 0

## Attack gauntlet

The meeting demo attacks the real API with synthetic data:

1. omit classification → BLOCK / 0 provider calls
2. insert `MANDATE-CANARY-*` secret → BLOCK / 0
3. real mandate without consent → BLOCK / 0
4. add direct identifier → BLOCK / 0
5. inject prior-matter memory → BLOCK / 0
6. attempt cross-matter access → BLOCK
7. attempt Advoware write without exact approval → 0 Advoware calls
8. attempt plaintext real-mandate cloud sync → BLOCK
9. encrypt vault; inspect envelope for canary → absent
10. alter ciphertext → decrypt fails

## Key management

- AI/provider/API keys: server or local companion secret store only, never browser bundle/repo.
- secure-vault passphrase: entered by Kanzlei user, remains client-side; never sent to GitLaw storage endpoint.
- privacy receipt signing key: server secret, separate from client vault passphrase.
- no secrets in GitHub, screenshots, audit diffs or support logs.

## Data minimisation rule

For external AI, prefer a derived question such as:

> `Person A, adult third-country national, existing §8 permit, employer change after application; issue: effect on extension requirements.`

not:

> name + DOB + address + passport + Aktenzeichen + full correspondence.

If the legal question can be answered without a data field, that field must not be sent.

## Acceptance criteria for next week's meeting

The pilot may process a real matter in **Shadow Mode** when:

- authentication/tenant isolation works
- no real-mandate external AI is required
- no plaintext real-mandate cloud sync occurs
- one backup/export strategy is agreed
- Bao chooses the shadow cases
- all consequential actions remain review-only

Privileged external AI remains locked until the full release gate is independently reviewed.
