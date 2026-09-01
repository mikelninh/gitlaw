<!-- paos:reviewed=2026-09-01 -->
# Product specification

## Product promise

GitLaw Pro is a legal preparation and research workbench: **matter → evidence → sources → draft → lawyer review → audit**.

The interface should make the state of that chain clearer than a general-purpose chat window.

## Core workflow 1 — Matter + research

Bao opens a matter, sees the known facts/task, identifies what is missing, searches the legal corpus, opens relevant provisions and saves source-grounded research back to the matter.

### Acceptance criteria

- relevant source passages are inspectable separately from generated explanation;
- citations resolve deterministically or fail visibly;
- missing facts and uncertainty remain visible;
- unsupported legal claims do not appear as verified research;
- the user can move from a matter to its saved research without rebuilding context manually.

## Core workflow 2 — Document review

Bao reviews a case document in the context of the matter and uses the system to surface relevant content, questions or issues without treating extraction/generation as established fact.

### Acceptance criteria

- document context remains bound to the correct matter;
- unsupported or malformed files fail clearly;
- source/document evidence is distinguishable from model interpretation;
- duplicate, incomplete or contradictory information is surfaced rather than silently collapsed;
- sensitive identifiers or secrets are handled according to the authenticated pilot boundary.

## Core workflow 3 — Draft + lawyer gate

Bao turns matter facts, documents and research into a draft. The draft may be edited and reviewed, but release remains blocked until an authorised lawyer explicitly resolves the review gate.

### Acceptance criteria

- the draft preserves links to supporting research/sources where applicable;
- consequential release cannot occur while review requirements are unresolved;
- a non-lawyer cannot silently become the final reviewer;
- explicit human resolution is recorded;
- the resulting action/release state is audit-reviewable;
- no model capability implies authority to file, send or make a final legal decision unless a separately approved execution boundary exists.

## Feedback loop

Bao's feedback is part of the product system, not an afterthought:

`pilot use → atomic feedback → P0/P1/P2 backlog → product/spec change → regression/golden-case update → pilot retest`

Feedback may contain confidential context. Public case studies use consented, anonymised or aggregate evidence only.

## Failure states that matter most

- invented or broken legal citation;
- matter/document cross-contamination;
- hidden missing facts;
- confidential data exposed outside the authenticated pilot boundary;
- final legal authority attributed to the assistant;
- release before required lawyer review;
- an impressive synthetic demo being presented as real pilot success.

## Public vs pilot surfaces

The public GitLaw Pro playground should prove the workflow with synthetic matters. The authenticated Bao pilot may exercise the same product contract under stricter privacy and authority boundaries.

The public product architecture proof may describe those boundaries and the existence of the pilot, but it must not expose private matter content to make the story more persuasive.
