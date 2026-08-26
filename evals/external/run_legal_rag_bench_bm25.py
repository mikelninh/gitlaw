#!/usr/bin/env python3
"""Run a deterministic BM25 retrieval diagnostic on Legal RAG Bench.

This fetches the public `corpus` and `qa` test subsets at runtime from the
Hugging Face datasets server. It does not vendor the dataset into GitLaw.

Scope: external lexical-retrieval diagnostic only.
It is NOT GitLaw hybrid retrieval, NOT an end-to-end Legal RAG Bench score,
and NOT evidence of German-law accuracy.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from rank_bm25 import BM25Okapi

DATASET = "isaacus/legal-rag-bench"
DATASET_SERVER = "https://datasets-server.huggingface.co/rows"
TOKEN_RE = re.compile(r"\b\w+\b", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def fetch_subset(config: str, *, batch: int = 100, retries: int = 3) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    total: int | None = None
    while total is None or offset < total:
        params = urllib.parse.urlencode({
            "dataset": DATASET,
            "config": config,
            "split": "test",
            "offset": offset,
            "length": batch,
        })
        url = f"{DATASET_SERVER}?{params}"
        last_error: Exception | None = None
        for attempt in range(1, retries + 1):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "GitLaw-Eval-Lab/1.0"})
                with urllib.request.urlopen(req, timeout=30) as response:
                    payload = json.load(response)
                break
            except Exception as exc:  # network diagnostic: retry, then fail visibly
                last_error = exc
                if attempt == retries:
                    raise RuntimeError(f"failed to fetch {config} at offset {offset}: {exc}") from exc
                time.sleep(attempt * 2)
        else:  # pragma: no cover
            raise RuntimeError(last_error)

        total = int(payload.get("num_rows_total", 0))
        page = [entry["row"] for entry in payload.get("rows", [])]
        if not page and offset < total:
            raise RuntimeError(f"empty page before dataset end: config={config} offset={offset} total={total}")
        rows.extend(page)
        offset += len(page)
        if not page:
            break
    return rows


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
        try:
            rank = next(i + 1 for i, doc_id in enumerate(corpus_ids[j] for j in ranking) if doc_id == gold)
        except StopIteration:
            rank = None

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
        "schema_version": "1.0",
        "benchmark": "Legal RAG Bench",
        "dataset": DATASET,
        "run_type": "EXTERNAL_BM25_RETRIEVAL_DIAGNOSTIC",
        "n_questions": n,
        "n_passages": len(corpus),
        "metrics": {
            **{f"hit_at_{k}": hits[k] / n for k in k_values},
            "mrr": reciprocal_rank / n,
        },
        "rows": rows,
        "claim_boundary": (
            "Measured on public Legal RAG Bench ground truth. This is a lexical BM25 component diagnostic, "
            "not GitLaw hybrid retrieval, not the benchmark's full end-to-end RAG score, and not German-law accuracy."
        ),
        "attribution": "Legal RAG Bench — Abdur-Rahman Butler and Umar Butler (2026), arXiv:2603.01710; dataset isaacus/legal-rag-bench.",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()

    corpus = fetch_subset("corpus")
    qa = fetch_subset("qa")
    result = evaluate(corpus, qa)
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False, indent=2))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
