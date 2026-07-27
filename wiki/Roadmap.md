# GitLaw Roadmap

**Last updated: July 2026**

GitLaw already has a live citizen research surface, a working legal-retrieval and citation-verification layer, MCP tools and a closed-beta professional workflow. The roadmap is therefore not “add more AI.” It is to prove usefulness with legal professionals and harden the system before broader production use.

## Current baseline

### Live and testable

- public citizen search across 5,936 German federal laws;
- BM25, semantic and paragraph-reference retrieval;
- citation graph and deterministic paragraph resolution;
- six MCP search and verification tools;
- CI evaluation with 53/53 hand-labelled citation-resolution cases passing;
- closed-beta case workflow with checklists, documents, deadlines, templates and exports;
- multilingual citizen and intake surfaces;
- audit-oriented and human-review boundaries.

### Not yet proven or production-complete

- the 53/53 suite is not a complete benchmark of legal-answer correctness;
- the professional workflow has not been validated at scale across firms or legal domains;
- external privacy/security review and penetration testing are not complete;
- tenant isolation, incident response, backups and deletion processes require broader operational testing;
- there is no claim of security certification or mature enterprise rollout.

## Milestone 1 — Pilot evidence

**Goal:** establish whether GitLaw improves a real legal workflow rather than merely looking capable.

- define 3–5 high-frequency pilot tasks;
- test with anonymized or synthetic matters before any real client data;
- measure source-finding success, time-to-answer, correction rate and reviewer confidence;
- record failures and disputed answers as evaluation cases;
- verify Vietnamese and German workflow templates with the pilot practice;
- document which features are genuinely used and which should be removed.

### Exit gate

- qualified reviewers complete the selected tasks;
- material errors and uncertainty are captured visibly;
- the pilot produces a prioritized, evidence-backed product decision.

## Milestone 2 — Authorization and privacy hardening

- expand tenant-isolation tests;
- test every role boundary and privilege transition;
- add explicit data-retention and deletion workflows;
- validate document-access logs and export logs;
- complete data-processing agreements before handling real client data;
- run structured privacy and threat-model review.

### Exit gate

- no cross-tenant access in automated and manual tests;
- documented retention, deletion, backup and recovery behavior;
- qualified review of privacy and professional-use boundaries.

## Milestone 3 — Reliability and operations

- production monitoring and alerting;
- request, tool, model and prompt version tracing;
- latency and cost budgets;
- retry, idempotency and provider-failure behavior;
- backup restoration test;
- incident runbook and responsible owner;
- background processing for large documents.

### Exit gate

- operational failures are observable;
- recovery procedures have been exercised;
- critical workflows have documented fallbacks.

## Milestone 4 — Broader evaluation

- expand beyond citation resolution into retrieval relevance and answer support;
- add adversarial and outdated-source cases;
- test across multiple legal domains;
- compare model-assisted and non-model workflows;
- publish evaluation definitions and limitations.

### Exit gate

- agreed thresholds for citation precision, retrieval relevance and unsupported claims;
- results reproducible in CI;
- failure cases remain visible in the product.

## Milestone 5 — Independent go-live review

- external security review;
- penetration test;
- legal/privacy review of professional workflows;
- contractual and data-processing documents;
- controlled rollout with named support and incident responsibilities.

Only after these gates should GitLaw Pro be described as production-ready for broader professional use.

## Citizen tier

The citizen interface remains free and public-interest oriented.

Priorities:

- keep the federal-law corpus current;
- improve plain-language explanations without hiding the source;
- expand accessibility and multilingual quality;
- make unknown, changed and superseded material easier to recognize;
- grow public evaluation cases and feedback loops.

## Longer-term direction

GitLaw can become an open reference implementation for inspectable German legal AI:

- public legal research for citizens;
- reviewable workflows for legal professionals;
- reusable MCP tools for other trustworthy products;
- shared source and verification infrastructure for projects such as PrüfPilot and Path to Peace.

The product earns trust through evidence, boundaries and correction—not through the number of features listed in a roadmap.
