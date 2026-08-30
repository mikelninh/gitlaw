# Advoware — Friday setup and fallback

The Friday pilot must work **with or without** live Advoware API credentials.

## Lane A — zero-dependency fallback

Use this if live API credentials are not available.

1. Keep the real matter in Advoware as the authoritative file.
2. Export only the minimum local/CSV data needed for the selected workflow.
3. Import/review locally in GitLaw Pro.
4. Do not enable external AI for the real matter.
5. Use `/pro/friday` only for pseudonymous workflow timing and process feedback.
6. Compare the resulting Bao Today/work packet with Bao's normal process.

This lane is enough to prove:

- document/status compression
- missing-document workflow
- timeline/change workflow
- date-candidate attention
- exception-first review
- measured time returned

## Lane B — live read-only API

Use only if Bao has the Advoware integration values locally.

Required locally:

- Kanzlei/Advoware endpoint context
- third-party App-ID
- API key

Rules:

- credentials never enter source control
- credentials never enter ChatGPT or screenshots
- first session is read-only
- stable Advoware ID wins over file-number matching
- ambiguous/unmatched matter requires human resolution
- cursor failure must fail rather than replay full history silently
- every productive write remains exact-approval-first

The implemented connector tests require that an unapproved write performs **zero provider calls, including authentication/discovery**.

## Initial read scope

Start with only what is needed to create a useful morning delta:

- matters / Akten
- activities / Vorgänge

Then compile:

- what changed since cursor
- exact matched matter
- unmatched/ambiguous exceptions
- Bao Today delta

Do not start Friday by enabling invoice, file-write or Wiedervorlage writes.

## Productive writes — after evidence only

Examples that can later be promoted one by one:

- create Wiedervorlage
- attach prepared file
- create invoice draft
- update bounded matter metadata

Each approval must be bound to the exact:

`operation + params + request body digest`

Approval for one value cannot authorize a changed value.

## If anything fails

If discovery/auth fails, fall back to Lane A immediately. Do not burn the meeting debugging vendor connectivity.

The Friday goal is **measured Bao time returned**, not “API connected at all costs.”
