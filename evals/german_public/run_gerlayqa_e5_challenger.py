#!/usr/bin/env python3
"""Evaluate multilingual-E5-small as a frozen GerLayQA retriever challenger.

This runner reuses GitLaw's pinned GerLayQA data/evaluation contract while keeping
the challenger isolated from the frozen baseline runner. E5 retrieval prefixes are
applied exactly once to queries/passages. The result is diagnostic benchmark evidence,
not product gold and not permission to tune against the published holdout afterwards.
"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import numpy as np
from huggingface_hub import HfApi
from sentence_transformers import SentenceTransformer

from run_gerlayqa_retrieval import (
    CORPUS_PATH,
    EVAL_PATH,
    EXPECTED_EVAL_QUESTIONS,
    UPSTREAM_COMMIT,
    evaluate_method,
    gold_ids,
    load_json,
    normalize_id,
    question_text,
)

MODEL_ID = "intfloat/multilingual-e5-small"
METHOD = "dense_e5_small"
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "


def resolve_revision() -> str:
    revision = str(HfApi().model_info(MODEL_ID).sha)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError(f"model did not resolve to immutable SHA: {revision}")
    return revision


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", required=True, type=Path)
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    corpus, corpus_sha = load_json(CORPUS_PATH)
    eval_rows_raw, eval_sha = load_json(EVAL_PATH)
    if len(eval_rows_raw) != EXPECTED_EVAL_QUESTIONS:
        raise RuntimeError(f"expected {EXPECTED_EVAL_QUESTIONS} GerLayQA eval rows, got {len(eval_rows_raw)}")

    corpus_ids = [normalize_id(row["id"]) for row in corpus]
    corpus_texts = [str(row.get("content", "")) for row in corpus]
    if len(set(corpus_ids)) != len(corpus_ids):
        raise RuntimeError("duplicate paragraph ids in pinned GerLayQA corpus")

    excluded_long = [row for row in eval_rows_raw if len(question_text(row).split()) > 300]
    excluded_no_gold = [row for row in eval_rows_raw if not gold_ids(row)]
    rows = [row for row in eval_rows_raw if len(question_text(row).split()) <= 300 and gold_ids(row)]
    questions = [question_text(row) for row in rows]

    known_ids = set(corpus_ids)
    missing_gold = sorted({g for row in rows for g in gold_ids(row) if g not in known_ids})
    all_gold_missing_rows = [
        row for row in rows if gold_ids(row) and all(g not in known_ids for g in gold_ids(row))
    ]

    revision = resolve_revision()
    started = time.perf_counter()
    model = SentenceTransformer(MODEL_ID, revision=revision, trust_remote_code=False, device="cpu")
    docs = model.encode(
        [PASSAGE_PREFIX + text for text in corpus_texts],
        batch_size=args.batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=True,
    )
    query_embeddings = model.encode(
        [QUERY_PREFIX + text for text in questions],
        batch_size=args.batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    scores = np.asarray(query_embeddings, dtype=np.float32) @ np.asarray(docs, dtype=np.float32).T
    rankings = np.argsort(-scores, axis=1, kind="stable").tolist()
    evaluated = evaluate_method(METHOD, rankings, corpus_ids, rows)

    result = {
        "schema_version": "1.0",
        "status": "OBSERVED_GERMAN_PUBLIC_RETRIEVER_CHALLENGER",
        "benchmark": "GerLayQA",
        "upstream_commit": UPSTREAM_COMMIT,
        "source_files": {
            CORPUS_PATH: {"sha256": corpus_sha, "n_rows": len(corpus)},
            EVAL_PATH: {"sha256": eval_sha, "n_rows": len(eval_rows_raw)},
        },
        "question_contract": {
            "raw_eval_questions": len(eval_rows_raw),
            "evaluated_questions": len(rows),
            "excluded_over_300_words": len(excluded_long),
            "excluded_without_gold": len(excluded_no_gold),
            "missing_gold_id_count": len(missing_gold),
            "questions_with_all_gold_ids_absent_from_corpus": len(all_gold_missing_rows),
        },
        "method": METHOD,
        "model": {
            "model_id": MODEL_ID,
            "model_revision": revision,
            "license_expected_from_model_card": "MIT",
            "query_prefix": QUERY_PREFIX,
            "passage_prefix": PASSAGE_PREFIX,
            "normalize_embeddings": True,
            "max_seq_length": int(getattr(model, "max_seq_length", 0) or 0),
        },
        "metrics": evaluated["metrics"],
        "rows": evaluated["rows"],
        "runtime": {"seconds_including_model_load": time.perf_counter() - started},
        "counts_as_product_gold": False,
        "claim_boundary": (
            "This is a predeclared retrieval-model challenger on the pinned historical GerLayQA holdout. "
            "It may be compared with the already frozen baseline, but the observed holdout outcomes must not be "
            "used to hand-tune query-specific rules or claimed as current German-law/lawyer-grade quality."
        ),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    printable = dict(result)
    printable.pop("rows")
    print(json.dumps(printable, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
