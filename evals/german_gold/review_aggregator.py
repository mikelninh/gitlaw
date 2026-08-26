#!/usr/bin/env python3
"""Aggregate independent lawyer review JSON without creating or promoting product gold.

The aggregator is deliberately conservative: it measures the review instrument,
correction/safety labels and reviewer disagreement. It never decides that a case
is legally correct and never mutates German Gold case status.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path
from typing import Any

TERMINAL = {
    "ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION",
    "ACCEPTABLE_WITH_MINOR_CORRECTION",
    "MATERIAL_CORRECTION_REQUIRED",
    "UNSAFE_OR_MISLEADING",
}
SCORE_KEYS = (
    "issue_spotting",
    "legal_correctness",
    "completeness",
    "evidence_presentation",
    "missing_facts_uncertainty",
    "lawyer_usefulness",
)


def load_reviews(paths: list[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for path in paths:
        review = json.loads(path.read_text(encoding="utf-8"))
        if review.get("schema_version") != "1.0":
            raise ValueError(f"{path}: unsupported schema_version")
        if review.get("terminal_label") not in TERMINAL:
            raise ValueError(f"{path}: invalid terminal_label")
        reviewer = review.get("reviewer") or {}
        snapshot = review.get("system_snapshot") or {}
        for key in ("case_id", "reviewed_at"):
            if not str(review.get(key, "")).strip():
                raise ValueError(f"{path}: missing {key}")
        for key in ("reviewer_id", "role"):
            if not str(reviewer.get(key, "")).strip():
                raise ValueError(f"{path}: missing reviewer.{key}")
        if not isinstance(reviewer.get("independent"), bool):
            raise ValueError(f"{path}: reviewer.independent must be boolean")
        for key in ("system_version", "corpus_snapshot"):
            if not str(snapshot.get(key, "")).strip():
                raise ValueError(f"{path}: missing system_snapshot.{key}")
        scores = review.get("scores") or {}
        for key in SCORE_KEYS:
            value = scores.get(key)
            if not isinstance(value, int) or not 1 <= value <= 5:
                raise ValueError(f"{path}: scores.{key} must be integer 1..5")
        identity = (str(review["case_id"]), str(reviewer["reviewer_id"]), str(review["reviewed_at"]))
        if identity in seen:
            raise ValueError(f"{path}: duplicate review identity {identity}")
        seen.add(identity)
        rows.append(review)
    if not rows:
        raise ValueError("no review files supplied")
    return rows


def rate(num: int, den: int) -> float | None:
    return None if den == 0 else num / den


def summarize(reviews: list[dict[str, Any]]) -> dict[str, Any]:
    by_case: dict[str, list[dict[str, Any]]] = defaultdict(list)
    terminal = Counter()
    reviewers: set[str] = set()
    independent_reviewers: set[str] = set()
    blinded = 0
    critical_omission = 0
    unsupported = 0
    contradicted = 0
    abstention_scored = 0
    abstention_correct = 0
    score_totals = Counter()

    for review in reviews:
        by_case[str(review["case_id"])].append(review)
        terminal[str(review["terminal_label"])] += 1
        reviewer = review["reviewer"]
        reviewer_id = str(reviewer["reviewer_id"])
        reviewers.add(reviewer_id)
        if reviewer["independent"]:
            independent_reviewers.add(reviewer_id)
        if reviewer.get("model_identity_blinded") is True:
            blinded += 1
        critical_omission += int(review.get("critical_authority_omitted") is True)
        unsupported += int(review.get("unsupported_material_claim") is True)
        contradicted += int(review.get("contradicted_material_claim") is True)
        abst = review.get("correct_abstention")
        if abst is not None:
            abstention_scored += 1
            abstention_correct += int(abst is True)
        for key in SCORE_KEYS:
            score_totals[key] += int(review["scores"][key])

    pair_total = 0
    pair_agree = 0
    disagreement_cases: list[dict[str, Any]] = []
    snapshot_mismatch_cases: list[str] = []
    for case_id, case_reviews in sorted(by_case.items()):
        labels = {str(r["terminal_label"]) for r in case_reviews}
        snapshots = {
            (str(r["system_snapshot"]["system_version"]), str(r["system_snapshot"]["corpus_snapshot"]))
            for r in case_reviews
        }
        if len(snapshots) > 1:
            snapshot_mismatch_cases.append(case_id)
        if len(labels) > 1:
            disagreement_cases.append({"case_id": case_id, "terminal_labels": sorted(labels), "n_reviews": len(case_reviews)})
        for a, b in combinations(case_reviews, 2):
            pair_total += 1
            pair_agree += int(a["terminal_label"] == b["terminal_label"])

    n = len(reviews)
    material_or_worse = terminal["MATERIAL_CORRECTION_REQUIRED"] + terminal["UNSAFE_OR_MISLEADING"]
    acceptable_no_material = terminal["ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION"]
    return {
        "schema_version": "1.0",
        "status": "MEASURED_REVIEW_INSTRUMENT_OUTPUT_NOT_PRODUCT_GOLD",
        "counts": {
            "reviews": n,
            "cases": len(by_case),
            "reviewers": len(reviewers),
            "independent_reviewers": len(independent_reviewers),
            "multi_review_cases": sum(len(v) >= 2 for v in by_case.values()),
        },
        "terminal_labels": dict(sorted(terminal.items())),
        "metrics": {
            "acceptable_without_material_correction_rate": rate(acceptable_no_material, n),
            "material_correction_or_unsafe_rate": rate(material_or_worse, n),
            "unsafe_or_misleading_rate": rate(terminal["UNSAFE_OR_MISLEADING"], n),
            "critical_authority_omission_rate": rate(critical_omission, n),
            "unsupported_material_claim_review_rate": rate(unsupported, n),
            "contradicted_material_claim_review_rate": rate(contradicted, n),
            "correct_abstention_rate_when_scored": rate(abstention_correct, abstention_scored),
            "blinded_review_rate": rate(blinded, n),
            "pairwise_terminal_label_exact_agreement": rate(pair_agree, pair_total),
            "mean_scores": {key: score_totals[key] / n for key in SCORE_KEYS},
        },
        "diagnostics": {
            "terminal_label_disagreement_cases": disagreement_cases,
            "snapshot_mismatch_cases": snapshot_mismatch_cases,
            "pairwise_terminal_comparisons": pair_total,
            "abstention_reviews_scored": abstention_scored,
        },
        "release_boundary": (
            "These are review-instrument measurements only. The aggregator never promotes candidate cases, never adjudicates legal truth, "
            "and does not satisfy German Gold or production release criteria without the required governed lawyer-review process."
        ),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("reviews", nargs="+", type=Path)
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()
    out = summarize(load_reviews(args.reviews))
    rendered = json.dumps(out, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
