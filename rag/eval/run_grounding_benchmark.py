"""Run GitLaw's small, inspectable grounding benchmark.

This benchmark measures whether canonical hybrid retrieval surfaces the expected
statutory provision in the top-k source set. It does NOT claim full legal-answer
correctness; semantic answer quality still requires human-labelled evaluation.
"""

from __future__ import annotations

import json
from pathlib import Path

from rag.retrieval import retrieve

CASES = Path(__file__).with_name("grounding_cases.json")


def _matches(doc, expected: dict) -> bool:
    law_id = str(doc.metadata.get("law_id", "")).lower()
    section = str(doc.metadata.get("section", ""))
    return law_id == expected["law_id"].lower() and section.startswith(expected["section_prefix"])


def run(k: int = 6) -> dict:
    cases = json.loads(CASES.read_text(encoding="utf-8"))
    results = []
    for case in cases:
        docs = retrieve(case["question"], k=k, hybrid=True)
        hit = any(_matches(doc, case["expected"]) for doc in docs)
        results.append(
            {
                "id": case["id"],
                "hit": hit,
                "expected": case["expected"],
                "top_sources": [
                    {
                        "law_id": doc.metadata.get("law_id", ""),
                        "section": doc.metadata.get("section", ""),
                    }
                    for doc in docs
                ],
            }
        )

    passed = sum(1 for result in results if result["hit"])
    return {
        "metric": f"expected-source-hit@{k}",
        "total": len(results),
        "passed": passed,
        "failed": len(results) - passed,
        "pass_rate": passed / len(results) if results else 0.0,
        "truth_boundary": (
            "Measures retrieval grounding only; it is not a claim of legal-answer accuracy."
        ),
        "results": results,
    }


if __name__ == "__main__":
    report = run()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["failed"] == 0 else 1)
