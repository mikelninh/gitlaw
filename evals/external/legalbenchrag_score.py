#!/usr/bin/env python3
"""Score retrieval output using LegalBench-RAG's character-span precision/recall definition.

This is an adapter/scorer, not a copy of the upstream dataset. It expects:
- benchmark JSON: {"tests":[{"query":...,"snippets":[{"file_path":...,"span":[start,end]}]}]}
- retrieval JSONL: one row per test in order, with
  {"retrieved_snippets":[{"file_path":...,"span":[start,end],"score":optional}]}

The overlap math mirrors the pinned upstream LegalBench-RAG scorer.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def overlap_len(a: list[int], b: list[int]) -> int:
    lo = max(a[0], b[0])
    hi = min(a[1], b[1])
    return max(0, hi - lo)


def score_case(gt: dict[str, Any], pred: dict[str, Any]) -> tuple[float, float]:
    gt_snips = gt.get("snippets", [])
    ret_snips = pred.get("retrieved_snippets", [])

    total_relevant = sum(s["span"][1] - s["span"][0] for s in gt_snips)
    total_retrieved = sum(s["span"][1] - s["span"][0] for s in ret_snips)
    relevant_retrieved = 0

    for ret in ret_snips:
        for gold in gt_snips:
            if ret["file_path"] == gold["file_path"]:
                relevant_retrieved += overlap_len(ret["span"], gold["span"])

    recall = relevant_retrieved / total_relevant if total_relevant else 0.0
    precision = relevant_retrieved / total_retrieved if total_retrieved else 0.0
    return precision, recall


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("benchmark", type=Path)
    ap.add_argument("retrieval_jsonl", type=Path)
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()

    benchmark = json.loads(args.benchmark.read_text(encoding="utf-8"))
    tests = benchmark.get("tests", [])
    preds = [json.loads(x) for x in args.retrieval_jsonl.read_text(encoding="utf-8").splitlines() if x.strip()]
    if len(tests) != len(preds):
        raise ValueError(f"benchmark has {len(tests)} tests but retrieval output has {len(preds)} rows")
    if not tests:
        raise ValueError("benchmark contains no tests")

    rows = []
    for i, (gt, pred) in enumerate(zip(tests, preds)):
        precision, recall = score_case(gt, pred)
        rows.append({"index": i, "query": gt.get("query"), "precision": precision, "recall": recall})

    out = {
        "schema_version": "1.0",
        "scoring_contract": "LEGALBENCH_RAG_CHARACTER_SPAN_OVERLAP",
        "n": len(rows),
        "avg_precision": sum(r["precision"] for r in rows) / len(rows),
        "avg_recall": sum(r["recall"] for r in rows) / len(rows),
        "rows": rows,
        "claim_boundary": "This adapter scores retrieval output only; it does not establish German-law legal accuracy."
    }
    rendered = json.dumps(out, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
