#!/usr/bin/env python3
"""Hermetic GitLaw retrieval Gauntlet over the frozen 20-question eval snapshot.

This does not call an LLM or touch the live vector store. It replays the latest
recorded retrieval results and evaluates one post-retrieval mutation at a time.
The gold set is read-only and never exposed to the mutation.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOLD = ROOT / "evals" / "gitlaw_qa_set.json"
BASELINE = ROOT / "evals" / "results" / "rag_eval_20260518_205023.json"
PARA_RE = re.compile(r"§\s*([0-9]+[a-z]?)", re.I)

# Hypothesis: for broad citizen-law questions, core codices should beat niche
# administrative lookalikes when both are already in the retrieved candidate set.
# This is a post-retrieval ranking policy; it never sees expected citations.
CORE_LAWS = {"BGB", "StGB", "KSchG", "ArbZG", "StVG", "BDSG"}
LEGACY_OR_NICHE = {"AGB DDR"}


def paragraph(section: str) -> str | None:
    m = PARA_RE.search(section or "")
    return m.group(1).lower() if m else None


def key(doc: dict) -> tuple[str, str | None]:
    return (str(doc.get("abbr", "")).lower(), paragraph(str(doc.get("section", ""))))


def rerank_core_law_prior(docs: list[dict]) -> list[dict]:
    """Stable rerank; only changes order of already retrieved documents."""
    def score(item: tuple[int, dict]) -> tuple[float, int]:
        idx, doc = item
        abbr = str(doc.get("abbr", ""))
        boost = 1.0 if abbr in CORE_LAWS else 0.0
        penalty = 1.0 if abbr in LEGACY_OR_NICHE else 0.0
        return (boost - penalty, -idx)
    return [d for _, d in sorted(enumerate(docs), key=score, reverse=True)]


def metrics(rows: list[dict], gold_by_id: dict[str, dict], mutate: bool) -> dict:
    hits = {1: 0, 3: 0, 5: 0}
    reciprocal = 0.0
    for row in rows:
        docs = list(row["retrieved_top5"])
        if mutate:
            docs = rerank_core_law_prior(docs)
        expected = {
            (e["abbr"].lower(), str(e["paragraph"]).lower())
            for e in gold_by_id[row["id"]]["expected"]
        }
        match_rank = None
        for i, doc in enumerate(docs, 1):
            if key(doc) in expected:
                match_rank = i
                break
        for k in hits:
            hits[k] += int(match_rank is not None and match_rank <= k)
        if match_rank:
            reciprocal += 1.0 / match_rank
    n = len(rows)
    return {
        "n": n,
        "hit@1": round(hits[1] / n, 3),
        "hit@3": round(hits[3] / n, 3),
        "hit@5": round(hits[5] / n, 3),
        "mrr@5": round(reciprocal / n, 3),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mutation", choices=["core-law-prior"], default=None)
    args = ap.parse_args()

    gold = json.loads(GOLD.read_text(encoding="utf-8"))["questions"]
    gold_by_id = {q["id"]: q for q in gold}
    archived = json.loads(BASELINE.read_text(encoding="utf-8"))["results"]

    # Integrity gate: the replay snapshot must cover the frozen gold suite exactly.
    assert set(gold_by_id) == {r["id"] for r in archived}, "frozen-suite/replay mismatch"

    baseline = metrics(archived, gold_by_id, mutate=False)
    out = {"benchmark": "gitlaw-rag-v1", "baseline": baseline, "mutation": args.mutation}
    if not args.mutation:
        out["decision"] = "BASELINE_ONLY"
    else:
        candidate = metrics(archived, gold_by_id, mutate=True)
        # Hard gate: never lose source recall@5. Then require better first-source
        # quality (hit@1) and non-decreasing MRR.
        if candidate["hit@5"] < baseline["hit@5"]:
            decision = "REVERT"
            reason = "hard_gate: source recall@5 regressed"
        elif candidate["hit@1"] > baseline["hit@1"] and candidate["mrr@5"] >= baseline["mrr@5"]:
            decision = "KEEP"
            reason = "primary-source ranking improved without recall regression"
        else:
            decision = "REVERT"
            reason = "no strict ranking improvement"
        out.update({"candidate": candidate, "decision": decision, "reason": reason})

    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
