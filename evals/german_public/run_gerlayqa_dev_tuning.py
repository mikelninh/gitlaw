#!/usr/bin/env python3
"""Tune GerLayQA query sanitation and BM25/dense fusion on DEV ONLY.

This script never fetches bgb_eval.json. It exists to choose one deterministic
retrieval recipe using the upstream development split, after which that recipe can
be frozen and evaluated once on the separate evaluation split.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from huggingface_hub import HfApi
from sentence_transformers import SentenceTransformer

from run_gerlayqa_retrieval import (
    CORPUS_PATH,
    UPSTREAM_COMMIT,
    UPSTREAM_REPO,
    evaluate_method,
    gold_ids,
    load_json,
    normalize_id,
    question_text,
    rank_bm25,
)

DEV_PATH = "data/bgb_dev.json"
MODEL_ID = "PM-AI/bi-encoder_msmarco_bert-base_german"
RRF_K = 60
RRF_DEPTH = 200
WEIGHTS = (0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0)


def fetch_dev() -> tuple[list[dict[str, Any]], str]:
    # Reuse the same pinned raw-GitHub policy as the frozen runner without ever
    # naming or touching the evaluation split.
    raw_base = f"https://raw.githubusercontent.com/{UPSTREAM_REPO}/{UPSTREAM_COMMIT}"
    req = urllib.request.Request(f"{raw_base}/{DEV_PATH}", headers={"User-Agent": "GitLaw-Eval-Lab/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        raw = response.read()
    import hashlib
    return json.loads(raw.decode("utf-8")), hashlib.sha256(raw).hexdigest()


def clean_lay_query(text: str) -> str:
    """Generic forum-text sanitation; no legal labels or gold ids are consulted."""
    value = html.unescape(text)
    value = re.sub(r"https?://\S+", " ", value)
    value = re.sub(r"a\s+href=\"[^\"]+\"[^>]*>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"/?a>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"<!--.*?-->", " ", value, flags=re.DOTALL)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def resolve_revision() -> str:
    revision = str(HfApi().model_info(MODEL_ID).sha)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError(f"model revision is not immutable SHA: {revision}")
    return revision


def dense_rankings(model: SentenceTransformer, corpus_embeddings: np.ndarray, questions: list[str], batch_size: int) -> list[list[int]]:
    q = model.encode(
        questions,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    scores = np.asarray(q, dtype=np.float32) @ np.asarray(corpus_embeddings, dtype=np.float32).T
    return np.argsort(-scores, axis=1, kind="stable").tolist()


def weighted_rrf(a: list[int], b: list[int], weight_a: float, weight_b: float = 1.0) -> list[int]:
    scores: dict[int, float] = defaultdict(float)
    if weight_a:
        for rank, idx in enumerate(a[:RRF_DEPTH], start=1):
            scores[idx] += weight_a / (RRF_K + rank)
    if weight_b:
        for rank, idx in enumerate(b[:RRF_DEPTH], start=1):
            scores[idx] += weight_b / (RRF_K + rank)
    return [idx for idx, _ in sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:RRF_DEPTH]]


def compact(result: dict[str, Any]) -> dict[str, float]:
    return dict(result["metrics"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path, required=True)
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    corpus, corpus_sha = load_json(CORPUS_PATH)
    dev_raw, dev_sha = fetch_dev()
    corpus_ids = [normalize_id(row["id"]) for row in corpus]
    corpus_texts = [str(row.get("content", "")) for row in corpus]
    rows = [row for row in dev_raw if len(question_text(row).split()) <= 300 and gold_ids(row)]
    raw_questions = [question_text(row) for row in rows]
    clean_questions = [clean_lay_query(text) for text in raw_questions]
    if any(not q for q in clean_questions):
        raise RuntimeError("query sanitation produced an empty question")

    known = set(corpus_ids)
    all_gold_missing = sum(1 for row in rows if all(g not in known for g in gold_ids(row)))

    started = time.perf_counter()
    bm25_raw = rank_bm25(corpus_texts, raw_questions)
    bm25_clean = rank_bm25(corpus_texts, clean_questions)

    revision = resolve_revision()
    model = SentenceTransformer(MODEL_ID, revision=revision, trust_remote_code=False, device="cpu")
    corpus_embeddings = model.encode(
        corpus_texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    dense_raw = dense_rankings(model, corpus_embeddings, raw_questions, args.batch_size)
    dense_clean = dense_rankings(model, corpus_embeddings, clean_questions, args.batch_size)

    candidates: list[dict[str, Any]] = []
    base_rankings = {
        "bm25_raw": bm25_raw,
        "bm25_clean": bm25_clean,
        "dense_raw": dense_raw,
        "dense_clean": dense_clean,
    }
    for name, rankings in base_rankings.items():
        result = evaluate_method(name, rankings, corpus_ids, rows)
        candidates.append({"recipe": {"type": name}, "metrics": compact(result)})

    for dense_name, dense in (("dense_raw", dense_raw), ("dense_clean", dense_clean)):
        for bm25_name, bm25 in (("bm25_raw", bm25_raw), ("bm25_clean", bm25_clean)):
            for bm25_weight in WEIGHTS:
                rankings = [weighted_rrf(a, b, bm25_weight, 1.0) for a, b in zip(bm25, dense)]
                name = f"weighted_rrf:{bm25_name}:{dense_name}:bm25={bm25_weight:g}:dense=1"
                result = evaluate_method(name, rankings, corpus_ids, rows)
                candidates.append({
                    "recipe": {
                        "type": "weighted_rrf",
                        "bm25_variant": bm25_name,
                        "dense_variant": dense_name,
                        "bm25_weight": bm25_weight,
                        "dense_weight": 1.0,
                        "rrf_k": RRF_K,
                        "depth": RRF_DEPTH,
                    },
                    "metrics": compact(result),
                })

    candidates.sort(
        key=lambda item: (
            item["metrics"]["hit_at_10"],
            item["metrics"]["mrr_at_10"],
            item["metrics"]["recall_at_10"],
        ),
        reverse=True,
    )
    selected = candidates[0]
    result = {
        "schema_version": "1.0",
        "status": "GERLAYQA_DEV_ONLY_RETRIEVAL_RECIPE_SELECTION",
        "upstream_commit": UPSTREAM_COMMIT,
        "split": "bgb_dev.json_ONLY",
        "evaluation_split_accessed": False,
        "source_files": {
            CORPUS_PATH: {"sha256": corpus_sha, "rows": len(corpus)},
            DEV_PATH: {"sha256": dev_sha, "raw_rows": len(dev_raw)},
        },
        "question_contract": {
            "evaluated_dev_questions": len(rows),
            "excluded_over_300_or_without_gold": len(dev_raw) - len(rows),
            "questions_with_all_gold_ids_absent_from_corpus": all_gold_missing,
        },
        "model": {"model_id": MODEL_ID, "model_revision": revision},
        "query_sanitation": {
            "name": "generic_html_url_whitespace_cleanup",
            "uses_gold_labels": False,
        },
        "selection_metric_order": ["hit_at_10", "mrr_at_10", "recall_at_10"],
        "selected_recipe": selected,
        "top_candidates": candidates[:12],
        "search_space": {
            "bm25_variants": ["raw", "clean"],
            "dense_variants": ["raw", "clean"],
            "bm25_weights": list(WEIGHTS),
            "dense_weight": 1.0,
            "rrf_k": RRF_K,
            "depth": RRF_DEPTH,
        },
        "runtime": {"seconds_including_model_load": time.perf_counter() - started},
        "promotion_rule": (
            "Freeze selected_recipe before any evaluation-split execution. The dev winner may be evaluated exactly as specified on the separate eval split; "
            "eval outcomes must not be used to retune this recipe."
        ),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
