# External Provider Due Diligence — Kanzlei Autopilot

Status: **evidence checklist, not approval**. Each item should link to an actual contract, setting, screenshot/export, vendor statement or legal review. Do not set the runtime release flag merely because the provider generally offers a feature.

## Provider identity

- legal entity: ____________________
- service/product: ____________________
- controller/processor role assessment: ____________________
- contract owner: ____________________
- review date/version: ____________________

## § 43e BRAO / professional secrecy review

- [ ] external service is necessary for the intended workflow
- [ ] provider was selected with due care
- [ ] written confidentiality obligation covers mandate secrets
- [ ] provider access is limited to what is necessary
- [ ] obligation survives termination as required
- [ ] sub-service-provider obligations are addressed
- [ ] comparable protection assessed where service is performed abroad
- [ ] mandate-specific client consent requirement assessed and evidence workflow defined
- [ ] contract permits Kanzlei to stop/revoke processing promptly

Evidence refs:

- contract: ____________________
- confidentiality terms: ____________________
- professional-secrecy memo: ____________________

## GDPR processor / transfer review

- [ ] Art. 28 DPA/AVV executed where applicable
- [ ] processing instructions documented
- [ ] confidentiality of authorised personnel addressed
- [ ] security/TOMs reviewed
- [ ] subprocessor list reviewed
- [ ] advance-change/objection mechanism understood
- [ ] deletion/return on termination addressed
- [ ] audit/information rights reviewed
- [ ] data-location / international-transfer assessment documented
- [ ] SCC / adequacy / supplementary measures documented where applicable

Evidence refs:

- DPA: ____________________
- subprocessor list/version: ____________________
- transfer mechanism: ____________________
- TOM/security docs: ____________________

## Retention / provider reuse

- [ ] exact API product/endpoint retention behavior verified
- [ ] Zero Data Retention or approved equivalent enabled **for this account/project**, not just advertised as available
- [ ] content is not used for model training by default / account setting evidenced
- [ ] abuse/safety logs and exceptions understood
- [ ] support/personnel access model understood
- [ ] deletion timeline tested/documented

Evidence refs / screenshots:

- retention setting: ____________________
- training setting: ____________________
- vendor confirmation/ticket: ____________________

## Security

- [ ] TLS in transit
- [ ] encryption at rest
- [ ] access controls/MFA for admin account
- [ ] API key scope/rotation/revocation process
- [ ] security certifications/reports reviewed where relevant
- [ ] vulnerability/incident disclosure process
- [ ] breach-notification terms and contacts
- [ ] availability/recovery expectations understood

## Product binding

Runtime flags must reflect evidence, for example:

```text
LEGAL_AI_PROVIDER=openai
LEGAL_AI_PROVIDER_CONTRACT_REVIEWED=1
LEGAL_AI_CONFIDENTIALITY_CONFIRMED=1
LEGAL_AI_DPA_CONFIRMED=1
LEGAL_AI_SUBPROCESSORS_REVIEWED=1
LEGAL_AI_SECRET_PROTECTION_REVIEWED=1
LEGAL_AI_ZERO_RETENTION_CONFIRMED=1
LEGAL_AI_TOMS_REVIEWED=1
LEGAL_AI_DPIA_REVIEWED=1
LEGAL_AI_INCIDENT_PROCESS_READY=1
LEGAL_AI_DELETION_PROCESS_READY=1
```

**Never commit these flags as proof.** Environment flags are only runtime attestations; the actual evidence remains in the Kanzlei compliance file.

## OpenAI-specific review notes

Current public OpenAI business/API documentation says API/business data is not used for training by default and qualifying API organisations may configure Zero Data Retention. General API retention can otherwise apply depending on endpoint/configuration. Therefore GitLaw's production gate requires **account/project-specific ZDR evidence**, not a generic website claim.

Review current official sources on the approval date:

- https://openai.com/enterprise-privacy/
- https://openai.com/business-data/
- https://platform.openai.com/docs/guides/your-data

## Decision

- [ ] NOT APPROVED — synthetic only
- [ ] APPROVED FOR SHADOW (no data sent to provider)
- [ ] APPROVED FOR PSEUDONYMISED REAL-MANDATE WORKFLOW: ____________________

Reviewer(s): ____________________  Date: __________
Conditions / expiry / re-review date: ______________________________________
