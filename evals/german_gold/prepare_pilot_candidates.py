#!/usr/bin/env python3
"""Prepare the historical 20-question GitLaw QA set as German Gold *candidates*.

The source set contains retrieval expectations, not lawyer-approved legal truth.
This script therefore creates frozen candidate packets only. Every packet is
`candidate_unreviewed`, has zero reviewers, and must pass independent lawyer
review before any promotion in the German Gold process.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

DEFAULT_SOURCE = Path("evals/gitlaw_qa_set.json")


def build_candidate(row: dict, as_of: str) -> dict:
    authorities = []
    for expected in row.get("expected", []):
        abbr = str(expected["abbr"]).strip()
        paragraph = str(expected["paragraph"]).strip()
        authorities.append({
            "source_id": f"{abbr} § {paragraph}",
            "critical": True,
            "acceptable_alternatives": [],
            "reason": "Unreviewed retrieval expectation inherited from the historical GitLaw QA seed; lawyer validation required.",
        })
    if not authorities:
        raise ValueError(f"{row.get('id')}: no expected authorities")
    notes = str(row.get("notes", "")).strip() or "LAWYER_REVIEW_REQUIRED: identify the material legal issues."
    return {
        "case_id": f"DE-PILOT-{str(row['id']).upper()}",
        "task_family": str(row.get("category", "unclassified")).strip(),
        "practice_area": str(row.get("category", "unclassified")).strip(),
        "jurisdiction": "DE",
        "temporal_scope": {
            "as_of": as_of,
            "notes": "Pilot candidate snapshot date only. Current-law validity and temporal scope require lawyer review.",
        },
        "facts": [str(row["question"]).strip()],
        "fact_conflicts": [],
        "task": "Prüfe die aufgeworfene Rechtsfrage. Benenne relevante Rechtsgrundlagen, entscheidungserhebliche fehlende Tatsachen, Unsicherheiten und Grenzen einer belastbaren Antwort.",
        "critical_issues": [notes],
        "critical_authorities": authorities,
        "irrelevant_or_misleading_authorities": [],
        "missing_critical_facts": [
            "LAWYER_REVIEW_REQUIRED: Missing-fact labels have not yet been established for this candidate."
        ],
        "expected_abstention": True,
        "gold_claims": [],
        "review": {
            "status": "candidate_unreviewed",
            "reviewers": [],
            "frozen_holdout": False,
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--as-of", default="2026-08-26")
    args = ap.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8"))
    rows = source.get("questions", [])
    if len(rows) != 20:
        raise ValueError(f"pilot source cardinality drift: expected 20, got {len(rows)}")
    ids = [str(r.get("id", "")) for r in rows]
    if len(set(ids)) != len(ids) or any(not x for x in ids):
        raise ValueError("pilot source contains missing/duplicate ids")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": "1.0",
        "status": "FROZEN_UNREVIEWED_PILOT_CANDIDATES",
        "source": str(args.source),
        "as_of": args.as_of,
        "candidate_count": len(rows),
        "approved_gold_count": 0,
        "claim_boundary": "Historical retrieval expectations were transformed into reviewer packets. They are not lawyer-approved authorities, missing-fact labels, answer keys, or product gold.",
        "cases": [],
    }
    for row in rows:
        candidate = build_candidate(row, args.as_of)
        path = args.out_dir / f"{candidate['case_id']}.json"
        path.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest["cases"].append({
            "case_id": candidate["case_id"],
            "task_family": candidate["task_family"],
            "path": path.name,
            "review_status": "candidate_unreviewed",
        })
    (args.out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
