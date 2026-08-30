# DSFA / DPIA Working Draft — Kanzlei Autopilot

**Arbeitsentwurf.** Must be reviewed/owned by the controller/Kanzlei and, where applicable, its Datenschutzbeauftragte:r. This file does not determine by itself whether Art. 35 GDPR legally requires a DPIA in a specific deployment.

## 1. Processing considered

Kanzlei workflow assistance for intake, document triage, case chronology, legal research, draft preparation, deadline candidates, Advoware synchronisation and bounded routine preparation.

Three modes are assessed separately:

- P0 synthetic
- P1 real mandate / shadow, no external AI
- P2 pseudonymised real-mandate external AI under explicit release gates

## 2. Data subjects

Potentially:

- clients / prospective clients
- family members and counterparties
- witnesses
- public officials / authority contacts
- Kanzlei staff
- other persons appearing in mandate documents

## 3. Data categories

Depending on mandate:

- identity/contact data
- residence/immigration status
- employment/income data
- family data
- correspondence and procedural records
- legal allegations and strategy
- potentially special-category data (e.g. health, religion, ethnicity) and criminal-offence data
- documents/identifiers such as passports, IDs or financial information

**External AI minimisation target:** none of the direct identifiers above unless specifically lawful/necessary and separately approved. Current privileged lane rejects common direct identifiers.

## 4. Purpose

Reduce administrative/legal preparation burden while preserving lawyer authority, confidentiality and source traceability.

No purpose extension merely because data exists. Secondary model training, advertising, profiling or provider reuse is outside the intended purpose and must not be enabled for mandate content.

## 5. Necessity / proportionality questions for Bao

For every promoted workflow ask:

1. Can it be done locally or inside Advoware instead of external AI?
2. What is the minimum set of facts required?
3. Can identities be replaced by roles/pseudonyms?
4. Does the output materially reduce work?
5. Is an external provider necessary for this specific workflow?
6. Is there a lower-risk equivalent?
7. How will the lawyer verify output before consequence?
8. How long must derived data exist?

If value is low or a lower-risk path is practical, do not promote external processing.

## 6. Risk register

| Risk | Example harm | Inherent concern | Controls | Pilot residual stance |
|---|---|---:|---|---|
| disclosure of mandate secret to AI/provider | confidentiality/professional harm | critical | real-default BLOCK; provider gates; consent/necessity; pseudonymisation; raw-ID detector; ZDR evidence gate | no P2 until all green |
| wrong-matter filing | another client's data mixed in | critical | exact stable identifiers; ambiguous match → review; cross-matter BLOCK | shadow-test exact matching |
| prompt/history memory bleed | prior client facts reused | critical | privileged memory disabled; sanitised history; tenant/matter boundaries | test with canaries |
| browser key/token theft | third party gains provider/system access | high | no browser AI key; server/local companion secrets; short sessions | review browser extensions/device |
| cloud storage disclosure | server/storage operator sees full case | high | plaintext real sync forbidden; client AES-GCM vault | restore/tamper test |
| provider failover disclosure | secret silently sent to unapproved vendor | high | privileged provider pinned; failover disabled | attack/test config |
| hallucinated legal rule | bad advice/deadline | high | source verification; uncertainty visible; human review; deadline confirm approval | measure corrections |
| over-automation | agent sends/commits without lawyer | high | Authority ALLOW/APPROVAL/BLOCK; beA/substantive sends approval | gauntlet |
| excessive retention | old mandates remain accessible | high | TTL/deletion procedure/provider retention gate | verify register |
| account compromise | attacker reads matters | high | auth/session/device controls; least privilege; revocation | strengthen before scale |
| log leakage | debugging copy becomes shadow database | high | no prompt/document content in security receipts/audit | review logs |
| processor/subprocessor change | data flows change unnoticed | high | vendor register + review trigger; readiness digest changes only by controlled env | periodic review |
| ransomware/device loss | local mandate data exposed/unavailable | high | full-disk encryption, OS hygiene, encrypted backup/restore | verify pilot device |

## 7. Special-category / criminal data

Do not assume ordinary personal-data rules are sufficient. The Kanzlei must document the applicable Art. 6 legal basis and, where relevant, Art. 9 / Art. 10 conditions and German national-law basis. The product's §43e/consent gate is a professional-secrecy control; it is **not automatically the GDPR legal basis**.

## 8. Transfers / provider location

For each external provider record:

- legal entity and role
- processing/data locations
- international transfer mechanism where applicable
- DPA/AVV
- subprocessor list
- staff-access model
- retention / Zero Data Retention configuration
- security controls/certifications
- deletion behavior
- breach notification terms

A marketing claim is not sufficient evidence for the release gate.

## 9. Data-subject rights / discoverability

Maintain a system inventory sufficient to answer:

- where this person's data exists
- what was uploaded/derived
- which processors received data
- applicable retention/deletion state
- whether a privacy receipt proves a provider call occurred

Receipts intentionally do not contain the prompt; matter records must maintain the human-readable business history inside the authorised case system.

## 10. Security incident scenario exercise

Before P2, tabletop at least:

1. provider key suspected leaked
2. wrong matter matched to incoming document
3. external AI payload contains unexpected identifier
4. provider changes subprocessor/retention behavior
5. encrypted vault passphrase lost
6. employee laptop lost

Record owner, detection path, containment, restoration and regulatory/client-notification decision process.

## 11. Sign-off

- Controller/Kanzlei owner: ____________________ Date: ______
- Lawyer / professional secrecy review: ____________________ Date: ______
- DPO/privacy review if applicable: ____________________ Date: ______
- Technical owner: ____________________ Date: ______
- Residual risks accepted / conditions: ______________________________________

## 12. Review triggers

Re-open this assessment if:

- new data category or practice area is added
- new LLM/provider/subprocessor is introduced
- raw documents begin leaving the Kanzlei boundary
- autonomous external communications are promoted
- beA/invoice/financial execution scope changes
- retention/storage architecture changes
- an incident or near miss occurs
- model/provider terms materially change
