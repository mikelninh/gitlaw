"""Offline retrieval benchmark for GitLaw.

Uses the production BM25 tokenizer/index builder and the existing 20-question
QA set. No LLM, embeddings API, or external service is required.

This is an engineering reproducibility check and a sparse-retrieval measurement,
not a substitute for the hybrid production retrieval or lawyer-reviewed legal
quality benchmark.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from rag.build_bm25 import BM25_PATH, build
from rag.query import _bm25_search

EVAL_SET = ROOT / "evals" / "gitlaw_qa_set.json"
PARAGRAPH_RE = re.compile(r"§\s*([0-9]+[a-z]?)")


def normalize_paragraph(section: str) -> str | None:
    m = PARAGRAPH_RE.search(section or "")
    return m.group(1) if m else None


def hit_at_k(retrieved: list[dict], expected: list[dict], k: int) -> int:
    exp = {(e["abbr"].lower(), e["paragraph"].lower()) for e in expected}
    for item in retrieved[:k]:
        para = item.get("paragraph")
        if para and (item.get("abbr", "").lower(), para.lower()) in exp:
            return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--json-out", default=None)
    args = parser.parse_args()

    if args.rebuild or not BM25_PATH.exists():
        build()

    payload = json.loads(EVAL_SET.read_text(encoding="utf-8"))
    questions = payload["questions"][: args.limit] if args.limit else payload["questions"]
    results = []

    for q in questions:
        docs = _bm25_search(q["question"], k=10)
        retrieved = [
            {
                "abbr": d.metadata.get("abbreviation", ""),
                "section": d.metadata.get("section", ""),
                "paragraph": normalize_paragraph(d.metadata.get("section", "")),
            }
            for d in docs
        ]
        results.append(
            {
                "id": q["id"],
                "category": q["category"],
                "hit@1": hit_at_k(retrieved, q["expected"], 1),
                "hit@3": hit_at_k(retrieved, q["expected"], 3),
                "hit@5": hit_at_k(retrieved, q["expected"], 5),
                "hit@10": hit_at_k(retrieved, q["expected"], 10),
                "retrieved_top10": [
                    {"abbr": r["abbr"], "section": r["section"]} for r in retrieved
                ],
            }
        )

    n = len(results)
    if n != len(questions):
        raise RuntimeError("Not all benchmark cases produced a result")

    def avg(key: str) -> float:
        return round(sum(r[key] for r in results) / n, 3) if n else 0.0

    cats: dict[str, list] = defaultdict(list)
    for result in results:
        cats[result["category"]].append(result)

    report = {
        "benchmark": "offline_bm25_existing_qa_set",
        "status": "MEASURED_NOT_RELEASE_GATE",
        "n_questions": n,
        "retrieval@1": avg("hit@1"),
        "retrieval@3": avg("hit@3"),
        "retrieval@5": avg("hit@5"),
        "retrieval@10": avg("hit@10"),
        "per_category": {
            name: {
                "n": len(items),
                "retrieval@5": round(sum(i["hit@5"] for i in items) / len(items), 3),
            }
            for name, items in sorted(cats.items())
        },
        "claim_boundary": (
            "Deterministic sparse-retrieval measurement on the existing 20-question seed set. "
            "It does not measure hybrid retrieval, answer correctness, groundedness, or lawyer-grade legal quality."
        ),
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.json_out:
        Path(args.json_out).write_text(
            json.dumps({"summary": report, "results": results}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
