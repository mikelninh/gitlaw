<!-- paos:reviewed=2026-09-01 -->
# Constraints

## Professional authority

- GitLaw assists legal research, preparation, review and drafting; it does not become the final legal decision-maker.
- Consequential release stays behind an explicit authorised-lawyer review gate.
- A non-lawyer or model may not silently satisfy the final-review requirement.
- External action capabilities are outside model authority unless separately designed, approved and audited.

## Confidentiality / professional secrecy

The authenticated law-firm pilot must be designed around the confidentiality obligations of legal practice, including **Mandatsgeheimnis / professional secrecy**. This architecture pack is a product constraint, not a claim that every deployment configuration is legally certified.

- real matter data stays inside the intended authenticated pilot boundary;
- public demos use synthetic matters;
- private case content, secrets and identifying pilot feedback are not public portfolio evidence by default;
- integrations that move matter data across a new boundary require explicit review;
- logs/audit should minimise unnecessary sensitive content;
- retention and deletion must be explicit rather than an accidental side effect of tooling.

## Privacy / data protection

- personal data processing must have a defined purpose and access boundary;
- unsupported collection "because it might be useful later" is not acceptable;
- identifiers and secrets must fail closed in tests where required;
- consent/approval requirements in the pilot may not be bypassed for convenience;
- cross-matter contamination is a release-blocking failure.

## Source integrity

- source passages remain inspectable separately from generated text;
- citation resolution failing is visible, not smoothed over with plausible prose;
- complete legal-answer accuracy must not be inferred from a narrower citation-resolution benchmark;
- unsupported claims are a product failure even when the language sounds confident.

## Product truth

Evidence levels stay distinct:

- synthetic fixture ≠ real matter;
- browser E2E ≠ legal correctness across German law;
- active pilot ≠ proven production reliability;
- successful retrieval ≠ final legal advice;
- lawyer acceptance of one workflow ≠ autonomous authority for another.

## Interface

- the lawyer must be able to see matter context, source state, uncertainty and review state without reverse-engineering a chat transcript;
- blocked review/release states must be visually unmistakable;
- mobile convenience must not remove trust information or approval steps;
- inaccessible or broken source links are workflow failures, not cosmetic bugs.

## Architecture changes that always require human review

- authentication / authorisation model;
- matter isolation;
- retention / deletion policy;
- external data processors or integrations;
- final-review authority;
- consequential send/file/submit capability;
- publication of real pilot evidence;
- claims about legal accuracy or compliance scope.
