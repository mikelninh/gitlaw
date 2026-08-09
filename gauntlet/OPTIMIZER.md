# GitLaw Gauntlet Optimizer

Optimize GitLaw as a **legal-research system**, not as a prose generator.

## Loop

1. Run the frozen legal-research task suite and record source/citation metrics.
2. Inspect each miss: retrieval miss, ranking miss, tool-choice miss, synthesis error or uncertainty error.
3. Choose the highest-leverage general failure mode.
4. Form one falsifiable hypothesis.
5. Change one coherent surface only.
6. Rerun the complete suite, including adversarial and coverage-gap cases.
7. Compare against baseline.
8. Any fabricated citation, hidden coverage gap or lost human-review boundary => `REVERT`.
9. Otherwise `KEEP` only if citation validity and source recall do not fall and held-out fitness improves.
10. Log the experiment in Git.

## Priority order

1. Correct primary source.
2. Valid citation.
3. Useful ranking/context.
4. Calibrated uncertainty.
5. Clear explanation.
6. Latency/cost.

Never trade a higher subjective answer-quality score for weaker source correctness. Never edit the benchmark to make a mutation pass.
