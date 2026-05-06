# GitLaw Pro Production Gap Sheet

## Purpose

This document defines what still blocks GitLaw Pro from becoming a safe paid pilot product.

## Current strengths

- strong beta workflow
- multilingual intake
- research + verification
- drafting flow
- visible onboarding
- document / OCR groundwork
- compliance thinking already visible

## Current gaps

### 1. Authentication

Current:

- beta / invite / local-flow foundations

Needed for pilots:

- stable login
- reset flow
- session expiry / logout certainty

Risk if missing:

- weak trust, weak account safety

### 2. Tenant isolation

Current:

- conceptual and partial client-side foundations

Needed for pilots:

- all core objects tenant-safe server-side
- zero accidental cross-firm leakage

Risk if missing:

- absolute blocker for real legal usage

### 3. Server-side RBAC

Current:

- route/UI foundations exist

Needed for pilots:

- server-enforced partner / lawyer / assistenz / read-only access
- export and sensitive actions role-checked

Risk if missing:

- weak trust and bad delegation story

### 4. Secure document storage

Current:

- local/beta document flow and metadata path

Needed for pilots:

- EU storage
- clear upload/download path
- file access control
- retention/deletion model

Risk if missing:

- document workflow cannot become real moat

### 5. OCR / translation production path

Current:

- queue / scaffold / beta flow

Needed for pilots:

- reliable OCR provider
- machine translation with review marker
- failure states and retry path

Risk if missing:

- biggest wedge stays half-finished

### 6. Audit hardening

Current:

- audit model and integrity work exists

Needed for pilots:

- critical actions fully logged
- exportable review trail
- actor / role / tenant consistency

Risk if missing:

- weaker trust and weaker "safe AI" pitch

### 7. Product analytics

Current:

- partial local/product-level signals

Needed for pilots:

- intake-to-draft funnel visibility
- feature usage per firm
- approval / save / export rates

Risk if missing:

- no way to prove ROI clearly

## Priority order

### P0 blockers

- tenant isolation
- server-side RBAC
- secure auth
- secure storage

### P1 wedge unlocks

- OCR + translation production path
- document timeline and review UI
- better funnel analytics

### P2 retention / moat

- memory and retrieval
- practice-specific playbooks
- workflow recommendation agent

## Killer demo flow

This is the flow that should never break:

1. Vietnamese or multilingual intake arrives
2. files are renamed and triaged
3. case is created
4. OCR / translation is triggered
5. research answer is generated and verified
6. draft letter is produced
7. lawyer approves and exports

If this flow is weak, the company story is weak.

## Immediate execution checklist

- [ ] auth decision locked
- [ ] storage decision locked
- [ ] tenant model checked on all core entities
- [ ] role matrix written down
- [ ] demo flow tested start to finish
- [ ] OCR provider shortlist chosen
- [ ] pilot metrics instrumentation defined

## Founder's interpretation

Do not ask "what feature next?"

Ask:

`What is the smallest set of gaps we must close before a firm can trust us with a real matter?`
