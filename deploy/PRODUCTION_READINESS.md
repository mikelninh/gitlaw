# GitLaw — Controlled Production Operations Gate

A deployable Terraform stack is not the same as an operated production service. This document defines the minimum engineering evidence required before GitLaw may be described as a **controlled production deployment** for a bounded pilot.

It does not grant legal authority and does not prove legal-answer accuracy.

## Release gates

All gates must be explicit and evidenced for the target environment:

- [ ] authenticated pilot identity and role boundary enabled;
- [ ] tenant/matter scope isolation tested;
- [ ] production secrets stored outside source control;
- [ ] Terraform `fmt` + `validate` green for the AWS stack;
- [ ] TLS/WAF/load-balancer health checks configured;
- [ ] structured logs reach the production log sink;
- [ ] alert route and named on-call owner recorded;
- [ ] backup snapshot completed;
- [ ] restore drill completed against non-production data;
- [ ] rollback to previous known-good image exercised;
- [ ] retention/deletion policy configured for matter data and logs;
- [ ] law-firm-specific security/privacy review accepted;
- [ ] bounded real-user evaluation completed on anonymised matters.

A missing box keeps the environment at `CONTROLLED_PILOT_READY`; it must not be marketed as production-ready.

## Initial SLOs for a bounded pilot

These are **targets until measured**, not historical claims:

| Signal | Pilot target | Release meaning |
|---|---:|---|
| API availability | 99.5% monthly | target, not observed SLA |
| p95 API latency excluding model generation | < 1.5 s | target |
| citation-verifier internal error rate | < 0.5% | target |
| unauthorised consequential execution | 0 | hard safety invariant |
| cross-tenant/matter data exposure | 0 | hard safety invariant |
| restore recovery objective | < 4 h | target until drill evidence exists |
| data-loss recovery point | < 24 h | target until backup policy is implemented |

Do not publish an SLA until there is measured operating evidence and a support/incident commitment.

## Incident severity

### SEV-1 — stop the service

Examples:
- suspected cross-tenant/matter data exposure;
- secret compromise;
- authority bypass or unapproved consequential action;
- corrupted citation/source state that can materially mislead reviewers.

Response:
1. disable affected write/execution capability;
2. preserve audit evidence;
3. rotate/revoke affected credentials;
4. identify blast radius;
5. notify the authorised pilot owner under the agreed incident process;
6. restore only after root cause and regression test exist.

### SEV-2 — degraded but bounded

Examples:
- retrieval/provider outage;
- elevated latency;
- individual integration failure with no authority/privacy breach.

Response: fail closed or degrade to source/research-only workflow, record incident, recover, then verify before normal operation.

## Backup / restore contract

The current AWS design uses EFS for durable retrieval/graph artefacts. A controlled production environment must additionally define the authoritative store for pilot case state and audit evidence.

Required evidence:

1. automated backup/snapshot policy enabled for every durable store;
2. encrypted backup location and retention documented;
3. monthly restore drill into an isolated non-production environment;
4. restored corpus/vector/graph versions are checksum/version verified;
5. application startup fails closed if restored artefact versions are incompatible;
6. drill records date, duration, operator and outcome.

A configured backup without a successful restore drill does **not** satisfy this gate.

## Rollback contract

- every deployment uses an immutable image tag or digest;
- keep the previous known-good image reference;
- rollback procedure must not depend on rebuilding source;
- database/schema changes require a backwards-compatibility or rollback plan;
- post-rollback smoke checks include auth, source lookup, citation verification and approval gates.

## Telemetry minimum

For each request/workflow, production telemetry should carry only the metadata required to operate safely:

- request/trace ID;
- tenant/matter scope identifier in a privacy-safe representation;
- capability/tool invoked;
- result status and latency;
- source/citation verification status;
- human approval state when consequential;
- model/provider and prompt/workflow version;
- error class.

Do not log full legal matter text, secrets or unnecessary personal data merely for observability.

## External evidence gates that code cannot close

Even if every engineering checkbox above is green, GitLaw still needs:

- evaluation with qualified legal professionals on anonymised matters;
- law-firm-specific privacy/security acceptance;
- evidence that the target DMS/case-management integrations behave reliably;
- measured operating data before any reliability/SLA claim;
- professional responsibility remaining with the authorised lawyer.

**Production engineering can be automated. Professional trust must be earned in the real workflow.**
