#!/usr/bin/env python3
"""Outcome Engine benchmark runner.

Calls the existing GitLaw Pro session and Behörden-agent endpoints, compares
structured outputs against synthetic gold labels, and writes a transparent
JSON report. This is a pre-sales engineering benchmark, not a legal-quality
certification.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def post_json(url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {text}") from exc


def normalized_tokens(value: str) -> set[str]:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in value)
    return {token for token in cleaned.split() if len(token) >= 4}


def doc_recall(expected: list[str], actual: list[dict[str, Any]]) -> float:
    if not expected:
        return 1.0 if not actual else 0.0
    actual_text = " ".join(str(item.get("name_de", "")) for item in actual)
    actual_tokens = normalized_tokens(actual_text)
    hits = 0
    for doc in expected:
        expected_tokens = normalized_tokens(doc)
        if expected_tokens and expected_tokens.intersection(actual_tokens):
            hits += 1
    return hits / len(expected)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.getenv("GITLAW_BASE_URL"))
    parser.add_argument("--invite", default=os.getenv("GITLAW_PRO_INVITE"))
    parser.add_argument("--cases", default=str(Path(__file__).with_name("cases.json")))
    parser.add_argument("--out", default=str(Path(__file__).with_name("results.json")))
    parser.add_argument("--sleep", type=float, default=0.5)
    args = parser.parse_args()

    if not args.base_url or not args.invite:
        print("Set GITLAW_BASE_URL and GITLAW_PRO_INVITE, or pass --base-url and --invite.", file=sys.stderr)
        return 2

    base_url = args.base_url.rstrip("/")
    session = post_json(f"{base_url}/api/pro/session", {"invite": args.invite})
    token = session["token"]

    cases = json.loads(Path(args.cases).read_text(encoding="utf-8"))
    results: list[dict[str, Any]] = []

    for index, case in enumerate(cases, start=1):
        started = time.perf_counter()
        try:
            response = post_json(
                f"{base_url}/api/agent/behoerden",
                {"letter_text": case["letter_text"], "kanzlei_name": "Outcome Engine Eval"},
                {"Authorization": f"Bearer {token}"},
            )
            artifacts = response.get("artefacts") or {}
            classification = artifacts.get("classification") or {}
            deadline = artifacts.get("frist") or {}
            required = artifacts.get("required_documents") or []
            gold = case.get("gold") or {}

            checks: dict[str, Any] = {}
            if "letter_type" in gold:
                checks["letter_type"] = classification.get("letter_type") == gold["letter_type"]
            if "urgency" in gold:
                checks["urgency"] = classification.get("urgency") == gold["urgency"]
            if "deadline_iso" in gold:
                checks["deadline"] = deadline.get("deadline_iso") == gold["deadline_iso"]
            if "required_documents" in gold:
                checks["required_documents_recall"] = doc_recall(gold["required_documents"], required)

            results.append(
                {
                    "id": case["id"],
                    "ok": all(v is True or (isinstance(v, float) and v >= 0.8) for v in checks.values()),
                    "latency_seconds": round(time.perf_counter() - started, 3),
                    "cost_usd": response.get("total_cost_usd"),
                    "status": response.get("status"),
                    "checks": checks,
                    "actual": {
                        "classification": classification,
                        "deadline": deadline,
                        "required_documents": required,
                        "matched_case": artifacts.get("matched_case"),
                    },
                    "gold": gold,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "id": case["id"],
                    "ok": False,
                    "latency_seconds": round(time.perf_counter() - started, 3),
                    "error": str(exc),
                    "gold": case.get("gold"),
                }
            )
        print(f"[{index}/{len(cases)}] {case['id']}: {'PASS' if results[-1]['ok'] else 'FAIL'}")
        time.sleep(args.sleep)

    total = len(results)
    passed = sum(1 for item in results if item["ok"])
    deadline_cases = [r for r in results if "deadline" in (r.get("checks") or {})]
    doc_cases = [r for r in results if "required_documents_recall" in (r.get("checks") or {})]
    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": base_url,
        "summary": {
            "cases": total,
            "passed": passed,
            "pass_rate": round(passed / total, 4) if total else 0,
            "deadline_exact_accuracy": (
                round(sum(bool(r["checks"]["deadline"]) for r in deadline_cases) / len(deadline_cases), 4)
                if deadline_cases else None
            ),
            "mean_required_document_recall": (
                round(sum(float(r["checks"]["required_documents_recall"]) for r in doc_cases) / len(doc_cases), 4)
                if doc_cases else None
            ),
            "mean_latency_seconds": round(
                sum(float(r.get("latency_seconds", 0)) for r in results) / total, 3
            ) if total else 0,
            "total_cost_usd": round(
                sum(float(r.get("cost_usd") or 0) for r in results), 6
            ),
        },
        "results": results,
        "disclaimer": "Synthetic engineering benchmark. Human legal review remains mandatory.",
    }
    Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
