#!/usr/bin/env python3
"""Run a deterministic BM25 retrieval diagnostic on Legal RAG Bench.

This fetches the public `corpus.jsonl` and `qa.jsonl` from a pinned Hugging Face
dataset commit. It does not vendor the dataset into GitLaw.

Scope: external lexical-retrieval diagnostic only.
It is NOT GitLaw hybrid retrieval, NOT an end-to-end Legal RAG Bench score,
and NOT evidence of German-law accuracy.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path
from typing import Any

from rank_bm25 import BM25Okapi

DATASET = "isaacus/legal-rag-bench"
DATASET_REVISION = "db0b31dc6d195ce9916897e1ac5e4e6209736c8a"
RAW_BASE = f"https://huggingface.co/datasets/{DATASET}/resolve/{DATASET_REVISION}"
TOKEN_RE = re.compile(r"\b\w+\b", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def fetch_jsonl(filename: str, *, retries: int = 3) -> list[dict[str, Any]]:
    url = f"{RAW_BASE}/{filename}"
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GitLaw-Eval-Lab/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read().decode("utf-8")
            rows = [json.loads(line) for line in raw.splitlines() if line.strip()]
            if not rows:
                raise RuntimeError(f"{filename} contained no rows")
            return rows
        except Exception as exc:
            last_error = exc
            if attempt == retries:
                raise RuntimeError(f"failed to fetch pinned {filename}: {exc}") from exc
            time.sleep(attempt * 2)
    raise RuntimeError(last_error)  # pragma: no cover


def evaluate(corpus: list[dict[str, Any]], qa: list[dict[str, Any]], k_values=(1, 5, 10)) -> dict[str, Any]:
    if len(corpus) != 4876:
        raise ValueError(f"expected 4,876 Legal RAG Bench passages, got {len(corpus)}")
    if len(qa) != 100:
        raise ValueError(f"expected 100 Legal RAG Bench questions, got {len(qa)}")

    corpus_ids = [str(r["id"]) for r in corpus]
    texts = [str(r.get("text", "")) for r in corpus]
    tokenized = [tokenize(text) for text in texts]
    bm25 = BM25Okapi(tokenized)
    max_k = max(k_values)

    hits = {k: 0 for k in k_values}
    reciprocal_rank = 0.0
    rows = []

    for item in qa:
        question = str(item["question"])
        gold = str(item["relevant_passage_id"])
        scores = bm25.get_scores(tokenize(question))
        ranking = sorted(range(len(scores)), key=lambda i: float(scores[i]), reverse=True)
        ranked_ids = [corpus_ids[i] for i in ranking[:max_k]]
        rank = next((i + 1 for i, j in enumerate(ranking) if corpus_ids[j] == gold), None)

        for k in k_values:
            if gold in ranked_ids[:k]:
                hits[k] += 1
        if rank:
            reciprocal_rank += 1.0 / rank

        rows.append({
            "id": str(item["id"]),
            "gold_passage_id": gold,
            "rank": rank,
            "top10_passage_ids": ranked_ids,
        })

    n = len(qa)
    return {
        "schema_version": "1.1",
        "benchmark": "Legal RAG Bench",
        "dataset": DATASET,
        "dataset_revision": DATASET_REVISION,
        "run_type": "EXTERNAL_BM25_RETRIEVAL_DIAGNOSTIC",
        "n_questions": n,
        "n_passages": len(corpus),
        "metrics": {
            **{f"hit_at_{k}": hits[k] / n for k in k_values},
            "mrr": reciprocal_rank / n,
        },
        "rows": rows,
        "claim_boundary": (
            "Measured on a pinned public Legal RAG Bench dataset revision. This is a lexical BM25 component diagnostic, "
            "not GitLaw hybrid retrieval, not the benchmark's full end-to-end RAG score, and not German-law accuracy."
        ),
        "license_note": (
            "The Hugging Face structured metadata at the pinned snapshot identifies cc-by-nc-sa-4.0. "
            "GitLaw does not vendor the dataset and treats commercial reuse as blocked pending license clarification."
        ),
        "attribution": "Legal RAG Bench — Abdur-Rahman Butler and Umar Butler (2026), arXiv:2603.01710; dataset isaacus/legal-rag-bench.",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()

    corpus = fetch_jsonl("corpus.jsonl")
    qa = fetch_jsonl("qa.jsonl")
    result = evaluate(corpus, qa)
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False, indent=2))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
