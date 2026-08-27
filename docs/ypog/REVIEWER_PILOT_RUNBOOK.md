# German Gold Reviewer Pilot Runbook

This runbook turns the existing lawyer scorecard into a repeatable evidence workflow without weakening the strict GitLaw release gate.

## Purpose

The first pilot is an **instrument-validation exercise**, not product validation and not a shortcut to 10/10. It tests whether independent lawyers can use the same frozen case, system snapshot and rubric consistently enough for the larger German Gold programme.

## Pilot size

Start with 20 frozen candidate cases across at least 4 task families and 2 independent lawyer reviewers. These counts are intentionally smaller than the release target and **do not count as satisfying** the strict requirements of 500 lawyer-reviewed cases, 200 frozen holdout cases, 12 task families and 5 independent reviewers.

## Before review

1. Freeze the candidate case and evaluated system run under a stable `case_id`.
2. Record the GitLaw system version, trace ID where available and legal corpus snapshot used to produce the evaluated run.
3. Remove model/vendor identity from the reviewer packet where practical.
4. Use only synthetic, public, licensed or appropriately governed matter data. Do not place confidential client data in a public reviewer deployment.
5. Give each reviewer the same case packet, source set and evaluation instructions.
6. Prefer the integrated `/#/review` Lawyer Review Lab. The older `/gitlaw/ypog/review/` static workbench remains a lightweight fallback.

## Review flow

Open the deployed viewer at `/#/review` or serve the viewer locally.

For each case, the reviewer:

- imports the frozen review-case JSON;
- enters a pseudonymous reviewer ID and role;
- confirms independence while model identity remains blinded when practical;
- reviews the exact frozen task, facts, system output and source set;
- records the six core 1–5 scores used by the existing aggregator;
- scores every expected issue 0–2;
- adjudicates each material claim against its provided sources, including relevance, temporal validity and omissions;
- records workflow/agent boundary checks;
- records critical authority omissions and unsupported or contradicted material claims;
- scores abstention when applicable;
- selects one terminal correction/safety label;
- tags failure modes and adds notes;
- finalizes the review, which computes case-snapshot, run-snapshot and canonical payload SHA-256 values;
- exports the immutable review JSON.

The browser workbench has no required backend. Exported files remain local until deliberately placed in the governed evidence store. The **payload SHA-256 proves that the exported review record has not changed; it does not prove that the legal judgment is correct.**

## Integrity and provenance

New integrated-review exports use `sorted-json-v1` canonicalization and SHA-256. The Python aggregator recomputes the canonical payload hash and rejects a modified integrity-bound review. Case and run snapshot hashes let reviewers detect when two purported reviews were actually made against different evidence.

Legacy schema-1.0 reviews without integrity metadata remain readable for backward compatibility, but the strict German Gold programme should prefer integrity-bound reviews and report the integrity-bound review rate explicitly.

## Promotion rules

A candidate is never promoted merely because a JSON review file exists.

- `candidate_unreviewed` → no lawyer decision yet.
- `single_review` → one qualified reviewer completed the rubric.
- `approved_gold` → promotion policy has been satisfied and reviewer provenance is recorded.
- `disputed` → reviewers materially disagree or the candidate/source set is defective.
- `retired` → no longer valid for the intended temporal/task scope.

Disagreements are evidence. Do not average away a safety-relevant disagreement. Adjudicate it and preserve both original reviews.

## Pilot acceptance checks

Before scaling beyond the first 20 cases, inspect:

- reviewer completion rate and missing fields;
- integrity-bound review rate and snapshot-hash mismatch cases;
- disagreement on terminal labels;
- disagreement on critical authority omissions;
- disagreement on unsupported/contradicted material claims;
- task families that generate ambiguous rubrics;
- time per review;
- reviewer comments that indicate the case packet itself is underspecified.

If reviewers cannot apply the instrument consistently, improve the case specification/rubric **before** creating hundreds of labels.

## What this pilot can prove

It can prove that GitLaw has a usable, auditable process for gathering independent German-law human evidence.

It cannot prove lawyer-grade answer quality, production readiness, commercial suitability, or satisfaction of the strict 10/10 release gate until the required scale, holdout discipline, independent reviewers, security evidence and governed shadow matters exist.
