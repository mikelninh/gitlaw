# Kanzlei Autopilot — implementation status

## Built in this V1 branch

- fail-closed ALLOW / APPROVAL / BLOCK authority core
- conditional routine-communication authority
- duplicate document-chase suppression
- synthetic workload target + measured-baseline-only value calculator
- authenticated Bao Today exception desk
- one-minute idempotent safe runner
- OCR queue preparation
- missing-document task generation
- lawyer deadline-review task generation
- per-case work packet compiler
- DE/VI factual missing-document message preparation
- recent-change timeline from existing case state
- research/citation/draft summary
- public Bao Autopilot invitation with no case-store access
- dedicated Autopilot CI contract
- Week 01 workload measurement protocol

## Deliberately not automated yet

- sending substantive legal advice
- confirming binding deadlines
- accepting mandates
- beA submission
- invoice send
- bank-detail changes
- authority expansion
- final legal decisions

## Production integrations still required for maximum time return

1. approved real OCR/document-processing provider or local processing path;
2. Kanzlei-controlled inbound email/channel ingestion;
3. approved routine-message provider for factual template-bound communication;
4. production deadline source/evidence extraction;
5. automatic GitLaw research/draft trigger after structured facts are ready;
6. beA package connector with exact lawyer approval for submission;
7. billing/accounting integration;
8. measured value ledger using Bao-confirmed before/after minutes;
9. confirmed real-client confidentiality/data-processing gate before productive mandate data.

The intended direction is **maximum preparation automation, minimum lawyer interruption** — not maximum autonomous legal authority.
