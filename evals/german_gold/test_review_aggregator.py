#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("review_aggregator.py")
spec = importlib.util.spec_from_file_location("review_aggregator", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def review(case_id: str, reviewer_id: str, label: str, *, unsafe: bool = False, independent: bool = True) -> dict:
    return {
        "schema_version": "1.0",
        "case_id": case_id,
        "reviewer": {
            "reviewer_id": reviewer_id,
            "role": "synthetic-test-reviewer",
            "independent": independent,
            "model_identity_blinded": True,
        },
        "system_snapshot": {"system_version": "test@abc", "corpus_snapshot": "test-corpus@2026-08-26"},
        "scores": {
            "issue_spotting": 4,
            "legal_correctness": 4,
            "completeness": 4,
            "evidence_presentation": 4,
            "missing_facts_uncertainty": 4,
            "lawyer_usefulness": 4,
        },
        "terminal_label": label,
        "critical_authority_omitted": False,
        "unsupported_material_claim": unsafe,
        "contradicted_material_claim": False,
        "correct_abstention": True,
        "error_tags": ["unsupported_inference"] if unsafe else [],
        "notes": "synthetic unit-test fixture only",
        "reviewed_at": f"2026-08-26T12:00:0{reviewer_id[-1]}Z",
    }


def main() -> None:
    rows = [
        review("case-a", "reviewer-1", "ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION"),
        review("case-a", "reviewer-2", "ACCEPTABLE_WITH_MINOR_CORRECTION"),
        review("case-b", "reviewer-1", "UNSAFE_OR_MISLEADING", unsafe=True),
    ]
    out = module.summarize(rows)
    assert out["status"] == "MEASURED_REVIEW_INSTRUMENT_OUTPUT_NOT_PRODUCT_GOLD"
    assert out["counts"] == {
        "reviews": 3,
        "cases": 2,
        "reviewers": 2,
        "independent_reviewers": 2,
        "multi_review_cases": 1,
    }
    assert out["metrics"]["unsafe_or_misleading_rate"] == 1 / 3
    assert out["metrics"]["unsupported_material_claim_review_rate"] == 1 / 3
    assert out["metrics"]["correct_abstention_rate_when_scored"] == 1.0
    assert out["metrics"]["pairwise_terminal_label_exact_agreement"] == 0.0
    assert out["diagnostics"]["terminal_label_disagreement_cases"] == [
        {"case_id": "case-a", "terminal_labels": ["ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION", "ACCEPTABLE_WITH_MINOR_CORRECTION"], "n_reviews": 2}
    ]
    assert out["diagnostics"]["snapshot_mismatch_cases"] == []
    print("LAWYER_REVIEW_AGGREGATOR_TEST=PASS")


if __name__ == "__main__":
    main()
