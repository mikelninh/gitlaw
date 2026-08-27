#!/usr/bin/env python3
"""Build one browser-review packet from a frozen German Gold candidate + GitLaw run.

This is packaging only. It never turns candidate expectations into lawyer gold and
never invents legal claims. If a run has no structured claim list, its complete
answer is exposed as one reviewable material claim with the run's actual sources.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected JSON object")
    return value


def nonempty(value: Any, label: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"missing {label}")
    return text


def normalize_source(source: dict[str, Any], index: int) -> dict[str, str]:
    source_id = str(source.get("id") or f"source-{index:02d}").strip()
    law = str(source.get("law") or "").strip()
    section = str(source.get("section") or "").strip()
    label = str(source.get("label") or "").strip()
    citation = str(source.get("citation") or "").strip()
    if not label:
        label = " ".join(part for part in (law, section) if part).strip() or citation or source_id
    if not citation and (law or section):
        citation = " ".join(part for part in (law, section) if part).strip()
    out = {"id": source_id, "label": label}
    for key in ("citation", "excerpt", "url"):
        value = str(source.get(key) or "").strip()
        if value:
            out[key] = value
    if citation:
        out["citation"] = citation
    return out


def normalized_sources(raw: Any) -> list[dict[str, str]]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("run.sources must be an array")
    return [normalize_source(source, i) for i, source in enumerate(raw, start=1) if isinstance(source, dict)]


def build_claims(run: dict[str, Any]) -> list[dict[str, Any]]:
    raw_claims = run.get("claims")
    if raw_claims is not None:
        if not isinstance(raw_claims, list) or not raw_claims:
            raise ValueError("run.claims must be a non-empty array when supplied")
        claims: list[dict[str, Any]] = []
        for index, row in enumerate(raw_claims, start=1):
            if not isinstance(row, dict):
                raise ValueError(f"run.claims[{index - 1}] must be an object")
            claims.append({
                "id": str(row.get("id") or f"claim-{index:02d}"),
                "text": nonempty(row.get("text"), f"run.claims[{index - 1}].text"),
                "sources": normalized_sources(row.get("sources", [])),
            })
        return claims

    answer = nonempty(run.get("answer"), "run.answer")
    return [{
        "id": "claim-whole-answer",
        "text": answer,
        "sources": normalized_sources(run.get("sources", [])),
    }]


def build_packet(candidate: dict[str, Any], run: dict[str, Any]) -> dict[str, Any]:
    review = candidate.get("review") or {}
    if review.get("status") not in {"candidate_unreviewed", "single_review", "disputed"}:
        raise ValueError("candidate must be an unapproved review candidate")
    if review.get("status") == "approved_gold":
        raise ValueError("approved gold must not be repackaged as an unreviewed pilot")

    critical_issues = candidate.get("critical_issues") or []
    if not isinstance(critical_issues, list) or not critical_issues:
        raise ValueError("candidate.critical_issues must be non-empty")
    facts = candidate.get("facts") or []
    if not isinstance(facts, list) or not facts:
        raise ValueError("candidate.facts must be non-empty")

    system_version = nonempty(run.get("system_version"), "run.system_version")
    corpus_snapshot = nonempty(run.get("corpus_snapshot"), "run.corpus_snapshot")
    answer = nonempty(run.get("answer"), "run.answer")
    packet: dict[str, Any] = {
        "schema_version": "1.0",
        "case_id": nonempty(candidate.get("case_id"), "candidate.case_id"),
        "practice_area": nonempty(candidate.get("practice_area") or candidate.get("task_family"), "candidate.practice_area"),
        "task": nonempty(candidate.get("task"), "candidate.task"),
        "facts": [nonempty(fact, "candidate.fact") for fact in facts],
        "expected_issues": [
            {"id": f"issue-{index:02d}", "label": nonempty(issue, f"candidate.critical_issues[{index - 1}]")}
            for index, issue in enumerate(critical_issues, start=1)
        ],
        "claims": build_claims(run),
        "system": {
            "system_version": system_version,
            "corpus_snapshot": corpus_snapshot,
            "output": answer,
        },
        "blinding": {"hide_model_identity": True},
        "notes": (
            f"Packaged from {review.get('status')} candidate. Candidate retrieval expectations and this system run remain "
            "unreviewed until independent lawyers complete the governed review process."
        ),
    }
    for key in ("generated_at", "trace_id", "model_identity"):
        value = str(run.get(key) or "").strip()
        if value:
            packet["system"][key] = value
    return packet


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate", type=Path, required=True)
    ap.add_argument("--run", type=Path, required=True)
    ap.add_argument("--json-out", type=Path, required=True)
    args = ap.parse_args()
    packet = build_packet(load(args.candidate), load(args.run))
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "REVIEW_PACKET_PACKAGED_NOT_GOLD",
        "case_id": packet["case_id"],
        "claims": len(packet["claims"]),
        "expected_issues": len(packet["expected_issues"]),
        "model_identity_blinded": packet["blinding"]["hide_model_identity"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
