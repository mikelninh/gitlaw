# Data Retention & Deletion — Kanzlei Autopilot

Status: pilot policy draft. The Kanzlei's statutory/professional retention duties for the underlying mandate record take precedence; GitLaw should avoid creating unnecessary duplicate records.

## Principle

> The authoritative legal file may need to be retained. A convenience copy, AI prompt, cache or temporary processing artifact does not automatically need the same lifetime.

## Inventory

| Store | Intended content | Pilot retention | Deletion owner |
|---|---|---|---|
| Advoware / Kanzlei system | authoritative case record | Kanzlei policy/legal duty | Kanzlei |
| GitLaw browser state | working case/research/draft state | pilot session / until migrated or deleted | Kanzlei user |
| encrypted secure vault | ciphertext backup only | 30-day TTL, refreshed by explicit upload | Kanzlei user / server TTL |
| legacy plaintext sync | synthetic only | 90-day existing demo TTL | product/Kanzlei |
| privacy receipts | hashes/control metadata, no prompt | security/audit policy | product/Kanzlei |
| server audit | metadata, no prompt/document body by design | define before production | controller/product agreement |
| external AI provider | only approved pseudonymised payload | must match evidenced account-specific approved retention/ZDR setting | provider + Kanzlei |
| local companion logs | metadata only | short operational window | Kanzlei |

## Prohibited retention patterns

- full prompts/documents in application logs merely for debugging
- API keys/passphrases in logs or audit
- storing a decrypted secure-vault copy server-side
- keeping temporary OCR/upload copies after their purpose without a documented need
- indefinite provider retention because a default setting was never reviewed
- duplicate client consent documents inside privacy receipts

## Deletion procedure

For a matter/workspace deletion request:

1. identify authoritative Kanzlei retention obligation
2. distinguish authoritative record from GitLaw convenience/temporary copies
3. remove permitted local GitLaw working copies
4. delete encrypted vault if requested/appropriate
5. remove or expire temporary connector/OCR artifacts
6. request/verify provider deletion where relevant and available
7. preserve only required security/audit metadata, without mandate prose
8. record deletion completion/evidence reference

## Provider exit / contract termination

Before terminating/changing provider:

- stop new egress
- export necessary non-provider evidence
- revoke API keys
- request deletion/return under contract/DPA
- record confirmation
- remove runtime release flags
- run Privacy Proof Center to prove real-mandate AI is locked

## Lost secure-vault passphrase

GitLaw storage does not possess the decryption key. If the Kanzlei loses the vault passphrase, server-side recovery of ciphertext is intentionally impossible. The authoritative Kanzlei record and approved recovery process must therefore remain available.

This is a confidentiality property, but it creates an availability risk that must be accepted and addressed by the Kanzlei backup procedure.
