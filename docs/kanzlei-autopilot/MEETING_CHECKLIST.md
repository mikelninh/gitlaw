# Next-Week Bao Meeting — Readiness Checklist

## Product — must be ready before meeting

- [ ] PR #34 branch builds cleanly
- [ ] Kanzlei Autopilot CI green
- [ ] Viewer CI green
- [ ] existing law-firm pilot tests green
- [ ] authenticated Bao Today works
- [ ] per-case work packet works
- [ ] secure research route active
- [ ] Privacy Proof Center active
- [ ] zero-egress safety gauntlet passes
- [ ] encrypted vault tests pass
- [ ] plaintext real-mandate sync blocked
- [ ] Advoware read/write authority tests pass
- [ ] no browser AI API key fallback
- [ ] no real-mandate external provider failover
- [ ] all consequential actions remain approval/block as designed
- [ ] exact deployed commit recorded

## Bring / prepare with Bao

### Safe test data

- [ ] synthetic golden case (already in GitLaw)
- [ ] Bao selects 1–3 ordinary real matters for **Shadow Mode**
- [ ] avoid emergency/deadline-critical matter as first live shadow case

### Device

- [ ] Bao's intended work laptop/browser
- [ ] full-disk encryption confirmed
- [ ] screen lock enabled
- [ ] OS/browser updated
- [ ] no unknown browser extensions with broad page access

### Advoware — only if connecting live

Bring securely; **do not paste secrets into GitHub/docs/chat**:

- [ ] Kanzlei identifier/config needed by Advoware discovery
- [ ] authorised API App-ID
- [ ] API key
- [ ] dedicated/appropriate Advoware credentials/role
- [ ] agreement on read-only first workflow

Start with:

- matters read
- new activities read
- delta/morning brief

Do not promote writes during the first test merely for convenience.

### External AI provider evidence — only needed for P2

- [ ] exact provider/legal entity/product
- [ ] DPA/AVV
- [ ] confidentiality / §43e assessment
- [ ] subprocessors + locations
- [ ] international-transfer assessment where relevant
- [ ] account/project-specific retention/ZDR evidence
- [ ] training/data-use evidence
- [ ] security/TOM evidence
- [ ] deletion behavior
- [ ] breach contact/process
- [ ] DPIA/high-risk assessment review

If any are incomplete: **stay in Shadow Mode.**

### Per-matter P2 evidence — only if attempting one privileged AI workflow

- [ ] concrete purpose
- [ ] necessity attested by lawyer
- [ ] consent/approval evidence reviewed where required under Kanzlei assessment
- [ ] evidence reference stored in case
- [ ] pseudonymous case ref generated
- [ ] outgoing facts visibly minimised/pseudonymised
- [ ] no cross-matter memory

## Measurement sheet

For each tested workflow capture actual active minutes:

- [ ] intake reconstruction
- [ ] document/checklist handling
- [ ] missing-document follow-up preparation
- [ ] timeline reconstruction
- [ ] deadline triage
- [ ] legal research
- [ ] first draft
- [ ] routine status preparation
- [ ] billing preparation where relevant

For every claimed saving:

- baseline confirmed by Bao = yes/no
- before minutes
- after minutes
- rework minutes
- useful output = yes/no
- safety issue = yes/no

## Stop conditions

Stop the relevant automation immediately if:

- cross-matter ambiguity appears
- a raw identifier reaches privileged AI egress gate unexpectedly
- provider-call proof says a blocked request called a provider
- a write executes without exact approval
- deadline output is presented as binding without Bao confirmation
- audit/receipt integrity breaks
- retention/provider assumptions cannot be proven

## Success condition

Meeting PASS does **not** require P2 privileged AI.

PASS means:

1. safety gauntlet holds;
2. synthetic end-to-end works;
3. at least one real matter runs safely in Shadow Mode;
4. Bao confirms at least one real time saving;
5. no confidentiality/authority invariant is violated;
6. the next bounded automation is selected from measured burden.
