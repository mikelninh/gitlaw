<!-- paos:reviewed=2026-09-01 -->
# Golden cases

These three cases are the flagship product proof for GitLaw Pro. The public playground may exercise synthetic equivalents; the authenticated Bao pilot supplies stronger evidence only when it can be reported without exposing confidential matter content.

## Golden case 1 — Matter → source-grounded research

### Starting situation

Bao opens a matter with facts, a concrete legal task and some missing information.

### Expected outcome

He can identify the relevant legal issue, search the federal-law corpus, inspect exact source passages, distinguish missing facts from known facts and save a concise research result back to the matter.

### Evidence required

- inspectable source links/passages;
- deterministic citation resolution;
- visible uncertainty / missing facts;
- a traceable matter → research workflow;
- regression coverage for discovered citation or retrieval failures.

### Failure conditions

- broken/invented citation presented as valid;
- unsupported legal claim presented as verified;
- missing fact silently assumed;
- research saved to the wrong matter;
- source trail hidden inside generated prose.

### Authority rule

Research assistance may be automated inside the workspace. The result is preparation, not final legal judgement.

### Current proof

**E2E / PILOT TARGET.** Existing public Pro E2E covers search/filter, source review and research in synthetic matters. Bao is an active real pilot user, but this case is not labelled `verified-in-pilot` until suitable anonymised/aggregate evidence is recorded.

---

## Golden case 2 — Case document → evidence-aware review

### Starting situation

Bao opens or uploads a document belonging to a matter and needs to understand what matters for the legal task without losing the distinction between document evidence and assistant interpretation.

### Expected outcome

GitLaw Pro keeps the document bound to the correct matter, surfaces relevant content/questions, connects the review to legal sources where appropriate and makes unsupported, malformed, duplicate or incomplete inputs visible.

### Evidence required

- document-review workflow through the Pro UI;
- file/input validation;
- matter isolation checks;
- source/document provenance visible to the reviewer;
- edge cases for unsupported office files, duplicates, PII/secrets and incomplete review state.

### Failure conditions

- cross-matter contamination;
- interpretation displayed as if quoted from the document;
- malformed/unsupported input silently accepted;
- sensitive content escaping the authenticated boundary;
- contradictory or duplicate evidence silently collapsed.

### Authority rule

The assistant may organise and flag material. The lawyer determines legal relevance and conclusions.

### Current proof

**E2E / PILOT TARGET.** The public Pro browser E2E includes document review and source review; law-firm pilot CI includes document-ground-truth and edge-case contracts. Real-world effectiveness remains a pilot question.

---

## Golden case 3 — Grounded work → draft → explicit lawyer release

### Starting situation

Bao has matter facts, document context and saved research and wants a draft suitable for lawyer review.

### Expected outcome

GitLaw Pro prepares a draft, keeps its support inspectable, blocks release while required review is unresolved, accepts an explicit authorised-lawyer resolution and records the resulting release/audit state.

### Evidence required

- draft workflow linked to matter/research context;
- blocked review gate;
- explicit human resolution;
- authorised reviewer requirement;
- release/audit replay;
- tests for consequential-action requests and missing approval/consent.

### Failure conditions

- draft released before required review;
- non-lawyer silently becomes final reviewer;
- unsupported claim survives as verified legal basis;
- model directly sends/files/submits outside an approved execution boundary;
- audit cannot reconstruct the review/release state.

### Authority rule

**RED boundary:** final legal judgement and consequential release remain with the authorised lawyer.

### Current proof

**E2E / PILOT TARGET.** The public Pro E2E already exercises draft → blocked review gate → explicit human resolution → local release → audit with synthetic matters. The next stronger proof is Bao completing the equivalent workflow under real pilot boundaries with non-confidential outcome evidence.

---

## Product release rule

GitLaw Pro should not be presented as a mature law-firm product merely because these synthetic flows pass. Stronger positioning requires repeated pilot use, failure capture, corrections turned into regressions and evidence that the workflows save meaningful lawyer time without weakening source integrity or professional authority.
