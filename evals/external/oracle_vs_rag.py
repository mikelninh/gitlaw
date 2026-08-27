#!/usr/bin/env python3
"""Deterministic retrieval-vs-reasoning error decomposition.

Input: JSONL rows with at least
  id, retrieval_hit, rag_correct, oracle_correct
Optional:
  rag_grounded, oracle_grounded, benchmark_id, model, retriever

This runner does not judge legal correctness. It decomposes already-scored benchmark
outcomes so that a retrieval miss is not mislabeled as a reasoning hallucination.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


def classify(row: dict[str, Any]) -> str:
    retrieval_hit = bool(row["retrieval_hit"])
    rag_correct = bool(row["rag_correct"])
    oracle_correct = bool(row["oracle_correct"])

    if rag_correct and not retrieval_hit:
        return "correct_without_gold_retrieval_needs_review"
    if rag_correct:
        return "pass"
    if not oracle_correct:
        return "reasoning_or_task_ceiling"
    if not retrieval_hit:
        return "retrieval_failure"
    return "reasoning_or_context_use_failure"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        row = json.loads(raw)
        for key in ("id", "retrieval_hit", "rag_correct", "oracle_correct"):
            if key not in row:
                raise ValueError(f"{path}:{line_no} missing required field {key!r}")
        rows.append(row)
    if not rows:
        raise ValueError("input contains no rows")
    return rows


def report(rows: list[dict[str, Any]]) -> dict[str, Any]:
    classified = [{**row, "failure_class": classify(row)} for row in rows]
    counts = Counter(r["failure_class"] for r in classified)
    n = len(classified)
    retrieval_hits = sum(bool(r["retrieval_hit"]) for r in classified)
    rag_correct = sum(bool(r["rag_correct"]) for r in classified)
    oracle_correct = sum(bool(r["oracle_correct"]) for r in classified)
    return {
        "schema_version": "1.0",
        "status": "MEASURED_FROM_PRE_SCORED_ROWS",
        "n": n,
        "metrics": {
            "retrieval_hit_rate": retrieval_hits / n,
            "rag_correct_rate": rag_correct / n,
            "oracle_correct_rate": oracle_correct / n,
            "oracle_minus_rag_correctness_gap": (oracle_correct - rag_correct) / n,
        },
        "failure_classes": dict(sorted(counts.items())),
        "rows": classified,
        "claim_boundary": (
            "This runner attributes failures from already-scored outcomes; it does not itself "
            "establish legal correctness or German-law production readiness."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args()

    out = report(load_jsonl(args.input))
    rendered = json.dumps(out, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
