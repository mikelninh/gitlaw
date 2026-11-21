# Readiness Review — 2026-07-15

## What already exists

GitLaw Pro is beyond a visual mock-up:

- tenant-scoped cases and signed Pro sessions;
- a migration-law document-review agent for bulk pre-OCR documents;
- a Behörden correspondence agent that extracts metadata, classifies letters,
  lists demanded documents, extracts deadlines, and drafts both sides of the
  correspondence;
- human-review-only design: proposals and drafts, not automatic sends;
- audit logs, role controls, cost traces, and citation tooling;
- a real closed-beta pilot described in the repository.

## What is not yet proven

The code and smoke tests do not yet establish production accuracy on a
representative customer set. In particular:

- PDF ingestion still needs a reliable scanned-document OCR path;
- the generic document-to-outcome promise is currently strongest for migration
  authority letters, not arbitrary legal documents;
- deadline extraction needs a gold-labelled benchmark for explicit, relative,
  multiple, and service-date-based deadlines;
- human approval exists as a design principle, but must be exercised end-to-end
  in the production workflow;
- integrations into the customer's real DMS, inbox, calendar, and task system
  still need one concrete adapter;
- an external GDPR/security review has not yet been completed.

## Immediate deployment blocker found

The current public Vercel alias is serving the last successful deployment from
2026-06-06. Newer production deployments fail because the project exceeds the
Hobby plan's serverless-function count limit. The repository currently produces
dozens of functions.

Before a paid demo, choose one:

1. **Fastest:** upgrade the Vercel project temporarily.
2. **Better architecture:** consolidate the API into one or a few catch-all
   functions.
3. **Recommended product architecture:** keep the frontend on Vercel and move
   the API/agents to one EU-hosted container service. This also suits OCR,
   background jobs, and longer-running workflows better.

Until fixed, do not claim that the latest `main` branch is what the public demo
is running.

## Smallest credible proof

1. Fix deployment.
2. Import the n8n workflow.
3. Connect one review channel and one downstream task/draft adapter.
4. Label 20 synthetic/anonymised letters with a lawyer.
5. Run the benchmark.
6. Record a five-minute demo with the original, extracted facts, risk gates,
   approval, and created outcome on one screen.
7. Use the same evidence for the first paid pilot and the n8n application.
