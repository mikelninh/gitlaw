# CI orchestration contract

For proof/evaluation workflows on an open pull request:

- `pull_request` is the single source of PR validation.
- `push` validation is reserved for `main` release verification.
- Heavy benchmark workflows use concurrency with `cancel-in-progress: true` so stale commits do not consume benchmark compute.
- A cancelled stale run is not a failed benchmark and must not be counted as evidence.
- Only the newest successful run on the exact reviewed commit may be frozen into an evidence ledger.

This contract exists to reduce duplicate compute without weakening any evaluation gate.
