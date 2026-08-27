#!/usr/bin/env python3
"""Verify GitLaw Pro pilot citations against the checked-in German law corpus.

Reads a JSON document from stdin:
  {"rows": [{"case_id": "...", "result": {"zitate": [...]}}]}
Writes verification JSON to stdout. No matter text is logged or persisted.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from typing import Any

# This file is executed directly from pilot/law-firm. Python therefore puts that
# directory, not the repository root, on sys.path. Make the checked-in GitLaw
# package importable deterministically in CI and on the Operations workstation.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from gitlaw_mcp.citations import extract_paragraph, find_law_file, parse_citation


def citation_string(item: dict[str, Any]) -> str:
    paragraph = str(item.get("paragraph", "")).strip()
    law = str(item.get("gesetz", "")).strip()
    if not paragraph or not law:
        return ""
    if paragraph.lower().startswith("art"):
        marker_number = paragraph
    elif paragraph.startswith("§"):
        marker_number = paragraph
    else:
        marker_number = f"§ {paragraph}"
    return f"{marker_number} {law}".strip()


def verify_one(item: dict[str, Any]) -> dict[str, Any]:
    raw = citation_string(item)
    if not raw:
        return {"raw": raw, "verified": False, "reason": "missing_fields"}
    parsed = parse_citation(raw)
    if parsed is None:
        return {"raw": raw, "verified": False, "reason": "could_not_parse"}
    law_path = find_law_file(parsed.abbreviation)
    if law_path is None:
        return {"raw": raw, "verified": False, "reason": "law_not_found"}
    paragraph = extract_paragraph(law_path, parsed.marker, parsed.number)
    if paragraph is None:
        return {"raw": raw, "verified": False, "reason": "paragraph_not_found"}
    combined = f"{paragraph.heading}\n{paragraph.text}".lower()
    if re.search(r"\((?:weggefallen|aufgehoben)\)", combined):
        return {
            "raw": raw,
            "verified": False,
            "reason": "repealed",
            "source_file": law_path.name,
            "heading": paragraph.heading,
        }
    return {
        "raw": raw,
        "verified": True,
        "reason": "verified",
        "source_file": law_path.name,
        "heading": paragraph.heading,
    }


def main() -> int:
    payload = json.load(sys.stdin)
    rows = payload.get("rows", [])
    out_rows = []
    total = 0
    verified = 0
    cases_without_citations = 0
    for row in rows:
        citations = (row.get("result") or {}).get("zitate") or []
        checks = [verify_one(c) for c in citations]
        total += len(checks)
        verified += sum(1 for c in checks if c["verified"])
        if not checks:
            cases_without_citations += 1
        out_rows.append({
            "case_id": row.get("case_id"),
            "citations": checks,
            "citation_gate": bool(checks) and all(c["verified"] for c in checks),
        })
    output = {
        "total": total,
        "verified": verified,
        "failed": total - verified,
        "cases_without_citations": cases_without_citations,
        "all_cases_grounded": bool(rows) and cases_without_citations == 0 and verified == total,
        "rows": out_rows,
    }
    json.dump(output, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
