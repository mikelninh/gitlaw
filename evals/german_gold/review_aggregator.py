#!/usr/bin/env python3
"""Aggregate independent lawyer review JSON without creating or promoting product gold.

The aggregator is deliberately conservative: it measures the review instrument,
correction/safety labels and reviewer disagreement. It never decides that a case
is legally correct and never mutates German Gold case status. New integrity-bound
reviews remain backward-compatible with the original schema 1.0 core fields.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
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
HEX64 = re.compile(r"^[0-9a-f]{64}$")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def verify_integrity(review: dict[str, Any]) -> bool:
    integrity = review.get("integrity")
    if integrity is None:
        return False
    if not isinstance(integrity, dict):
        raise ValueError("integrity must be an object")
    if integrity.get("algorithm") != "SHA-256" or integrity.get("canonicalization") != "sorted-json-v1":
        raise ValueError("unsupported review integrity contract")
    expected = str(integrity.get("payload_sha256", ""))
    if not HEX64.fullmatch(expected):
        raise ValueError("invalid integrity.payload_sha256")
    payload = copy.deepcopy(review)
    payload.pop("integrity", None)
    observed = hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()
    if observed != expected:
        raise ValueError(f"review integrity mismatch: expected {expected}, observed {observed}")
    return True


def validate_review(review: dict[str, Any], source: str = "review") -> None:
    if review.get("schema_version") != "1.0":
        raise ValueError(f"{source}: unsupported schema_version")
    if review.get("terminal_label") not in TERMINAL:
        raise ValueError(f"{source}: invalid terminal_label")
    reviewer = review.get("reviewer") or {}
    snapshot = review.get("system_snapshot") or {}
    for key in ("case_id", "reviewed_at"):
        if not str(review.get(key, "")).strip():
            raise ValueError(f"{source}: missing {key}")
    for key in ("reviewer_id", "role"):
        if not str(reviewer.get(key, "")).strip():
            raise ValueError(f"{source}: missing reviewer.{key}")
    if not isinstance(reviewer.get("independent"), bool):
        raise ValueError(f"{source}: reviewer.independent must be boolean")
    for key in ("system_version", "corpus_snapshot"):
        if not str(snapshot.get(key, "")).strip():
            raise ValueError(f"{source}: missing system_snapshot.{key}")
    scores = review.get("scores") or {}
    for key in SCORE_KEYS:
        value = scores.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 5:
            raise ValueError(f"{source}: scores.{key} must be integer 1..5")
    for key in ("case_snapshot_sha256", "run_snapshot_sha256"):
        if key in review and not HEX64.fullmatch(str(review[key])):
            raise ValueError(f"{source}: {key} must be lowercase SHA-256")
    try:
        verify_integrity(review)
    except ValueError as exc:
        raise ValueError(f"{source}: {exc}") from exc


def load_reviews(paths: list[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for path in paths:
        review = json.loads(path.read_text(encoding="utf-8"))
        validate_review(review, str(path))
        reviewer = review["reviewer"]
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
    if not reviews:
        raise ValueError("no reviews supplied")
    for index, review in enumerate(reviews):
        validate_review(review, f"review[{index}]")

    by_case: dict[str, list[dict[str, Any]]] = defaultdict(list)
    terminal = Counter()
    reviewers: set[str] = set()
    independent_reviewers: set[str] = set()
    blinded = 0
    integrity_bound = 0
    case_hash_bound = 0
    run_hash_bound = 0
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
        integrity_bound += int(review.get("integrity") is not None)
        case_hash_bound += int(HEX64.fullmatch(str(review.get("case_snapshot_sha256", ""))) is not None)
        run_hash_bound += int(HEX64.fullmatch(str(review.get("run_snapshot_sha256", ""))) is not None)
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
    case_hash_mismatch_cases: list[str] = []
    run_hash_mismatch_cases: list[str] = []
    for case_id, case_reviews in sorted(by_case.items()):
        labels = {str(r["terminal_label"]) for r in case_reviews}
        snapshots = {
            (str(r["system_snapshot"]["system_version"]), str(r["system_snapshot"]["corpus_snapshot"]))
            for r in case_reviews
        }
        case_hashes = {str(r["case_snapshot_sha256"]) for r in case_reviews if r.get("case_snapshot_sha256")}
        run_hashes = {str(r["run_snapshot_sha256"]) for r in case_reviews if r.get("run_snapshot_sha256")}
        if len(snapshots) > 1:
            snapshot_mismatch_cases.append(case_id)
        if len(case_hashes) > 1:
            case_hash_mismatch_cases.append(case_id)
        if len(run_hashes) > 1:
            run_hash_mismatch_cases.append(case_id)
        if len(labels) > 1:
            disagreement_cases.append({"case_id": case_id, "terminal_labels": sorted(labels), "n_reviews": len(case_reviews)})
        for a, b in combinations(case_reviews, 2):
            pair_total += 1
            pair_agree += int(a["terminal_label"] == b["terminal_label"])

    n = len(reviews)
    material_or_worse = terminal["MATERIAL_CORRECTION_REQUIRED"] + terminal["UNSAFE_OR_MISLEADING"]
    acceptable_no_material = terminal["ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION"]
    return {
        "schema_version": "1.1",
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
            "integrity_bound_review_rate": rate(integrity_bound, n),
            "case_snapshot_hash_bound_rate": rate(case_hash_bound, n),
            "run_snapshot_hash_bound_rate": rate(run_hash_bound, n),
            "pairwise_terminal_label_exact_agreement": rate(pair_agree, pair_total),
            "mean_scores": {key: score_totals[key] / n for key in SCORE_KEYS},
        },
        "diagnostics": {
            "terminal_label_disagreement_cases": disagreement_cases,
            "snapshot_mismatch_cases": snapshot_mismatch_cases,
            "case_snapshot_hash_mismatch_cases": case_hash_mismatch_cases,
            "run_snapshot_hash_mismatch_cases": run_hash_mismatch_cases,
            "pairwise_terminal_comparisons": pair_total,
            "abstention_reviews_scored": abstention_scored,
        },
        "release_boundary": (
            "These are review-instrument measurements only. Integrity proves record immutability, not legal correctness. "
            "The aggregator never promotes candidate cases, never adjudicates legal truth, and does not satisfy German Gold "
            "or production release criteria without the required governed independent lawyer-review process."
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
