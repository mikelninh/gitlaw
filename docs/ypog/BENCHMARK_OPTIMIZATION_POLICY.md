# Benchmark optimization policy

GitLaw does not optimize for a cosmetic 100% score on published benchmark test sets.

## Targets

- **100% required:** deterministic safety/integrity invariants such as tenant isolation, authorization boundaries, no silent benchmark drift, no automatic lawyer-gold promotion, and zero known unsupported critical-source release paths.
- **Maximize with frozen evaluation:** retrieval, ranking, reasoning, groundedness, calibration, abstention, latency and cost on unseen data.
- **Never tune on final holdout:** benchmark test labels are evidence, not training data.

## Why a benchmark may have a ceiling below 100%

Published gold can be incomplete, ambiguous, outdated, missing from the corpus, or permit multiple legally valid authorities while scoring only one. A retrieval system can also return a useful alternative authority that deterministic exact-id scoring marks wrong. These cases must be diagnosed, not silently repaired after seeing the test labels.

A 100% published-test result is acceptable only if it survives leakage checks, untouched holdouts, adversarial variants and independent replication. Otherwise it is evidence of benchmark fit, not production reliability.
