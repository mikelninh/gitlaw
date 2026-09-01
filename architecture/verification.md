<!-- paos:reviewed=2026-09-01 -->
# Verification

## Evidence ladder

`DECLARED → STATIC → AUTOMATED → E2E → SHADOW → PILOT → PRODUCTION`

GitLaw already has different proof levels across different claims. Keep them separate rather than averaging them into one trust score.

## Existing evidence to preserve

### Corpus / citation integrity

- federal-law corpus and paragraph graph are inspectable separately from generation;
- deterministic citation-resolution regression currently reports 53 / 53 cases;
- that number measures citation resolution, not complete legal-answer accuracy.

### Public Pro workflow

Browser E2E exercises the synthetic Pro workflow:

`search/filter → document review → source review → research → draft → blocked review gate → explicit human resolution → local release → audit`

It also includes a mobile regression for horizontal overflow at 390 px.

### Law-firm pilot boundary

Pilot CI deliberately tests high-risk conditions including:

- duplicate/malformed case data;
- unsupported uploads;
- missing reviewers and non-lawyer final reviewers;
- consent / approval failures;
- PII / secrets;
- consequential action requests;
- retention boundaries;
- incomplete / duplicate reviews;
- unsupported claims and broken citations.

### Real pilot signal

Bao is a real pilot user with a dedicated feedback loop. That proves real-user access and product-learning infrastructure; it does **not** by itself prove time savings, legal accuracy or production reliability.

## Verification checklist for the three golden cases

### GC1 — Matter → research

- [x] synthetic browser workflow covers search/source review/research;
- [x] citation-resolution regression exists;
- [ ] anonymised or aggregate Bao evidence shows the workflow completed under pilot conditions;
- [ ] user corrections are linked to regressions / changed acceptance criteria.

### GC2 — Document review

- [x] synthetic browser workflow covers document review/source review;
- [x] law-firm edge-case suite covers document-ground-truth and unsupported/malformed inputs;
- [ ] anonymised or aggregate Bao evidence shows whether review reduced reconstruction effort;
- [ ] repeated real-document corrections are represented in the golden fixture set.

### GC3 — Draft → lawyer release

- [x] synthetic E2E proves blocked review → explicit human resolution → local release → audit;
- [x] law-firm CI checks reviewer/authority edge cases;
- [ ] Bao completes equivalent workflow under authenticated pilot conditions;
- [ ] suitable non-confidential evidence shows where the assistant saved time and where lawyer correction remained necessary.

## Release bar for stronger public positioning

Before describing GitLaw Pro as a strong real-world law-firm proof rather than a technically strong product + active pilot, capture:

1. repeated completion of the three golden cases by Bao or another lawyer;
2. task-level timing or at least bounded before/after workflow evidence;
3. corrections / failure categories, not only positive feedback;
4. regressions created from those failures;
5. confirmation that authority/privacy boundaries held during the pilot.

## Known gaps — 2026-09-01

- complete legal-answer accuracy across German law is not proven;
- real-world law-firm workflow value is still being validated;
- the authenticated pilot is not equivalent to production across arbitrary firms/vendors;
- public proof must remain separated from confidential pilot matter content;
- autonomous consequential legal action is intentionally not a goal.

## Next proof level

The most valuable next evidence is **three completed Bao golden-case runs with privacy-safe outcome notes and corrections**, not another generic feature.
