#!/usr/bin/env python3
"""Evaluate multilingual-E5-small as a challenger on pinned LegalQuAD.

This runner is deliberately separate from the frozen baseline tournament. It uses
E5's documented retrieval prefixes and records immutable model/data revisions.
The result is challenger evidence only and cannot satisfy the strict third-German-
suite gate while LegalQuAD's upstream rights provenance remains unresolved.
"""
from __future__ import annotations

import argparse
import json
import re
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
from huggingface_hub import HfApi
from sentence_transformers import SentenceTransformer

from run_legalquad_retrieval import (
    CORPUS_PATH,
    DATASET_REVISION,
    EXPECTED_CORPUS,
    EXPECTED_QRELS,
    EXPECTED_QUERIES,
    QRELS_PATH,
    QUERIES_PATH,
    evaluate,
    load_jsonl,
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

    corpus, corpus_sha = load_jsonl(CORPUS_PATH)
    queries, queries_sha = load_jsonl(QUERIES_PATH)
    qrels, qrels_sha = load_jsonl(QRELS_PATH)
    if (len(corpus), len(queries), len(qrels)) != (EXPECTED_CORPUS, EXPECTED_QUERIES, EXPECTED_QRELS):
        raise RuntimeError("pinned LegalQuAD cardinality drift")

    corpus_ids = [str(row["_id"]) for row in corpus]
    corpus_texts = ["\n".join(x for x in (str(row.get("title", "")).strip(), str(row.get("text", "")).strip()) if x) for row in corpus]
    query_ids = [str(row["_id"]) for row in queries]
    questions = [str(row["text"]).strip() for row in queries]

    gold_by_query: dict[str, set[str]] = defaultdict(set)
    for row in qrels:
        if float(row.get("score", 0)) > 0:
            gold_by_query[str(row["query-id"])].add(str(row["corpus-id"]))
    if any(not gold_by_query[qid] for qid in query_ids):
        raise RuntimeError("LegalQuAD query without positive qrel")
    if any(doc not in set(corpus_ids) for docs in gold_by_query.values() for doc in docs):
        raise RuntimeError("LegalQuAD qrel references document outside pinned corpus")
    gold = [gold_by_query[qid] for qid in query_ids]

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
    metrics = evaluate(rankings, corpus_ids, gold)

    result = {
        "schema_version": "1.0",
        "status": "OBSERVED_GERMAN_LEGAL_RETRIEVER_CHALLENGER",
        "benchmark": "LegalQuAD",
        "dataset_revision": DATASET_REVISION,
        "source_files": {
            CORPUS_PATH: {"sha256": corpus_sha, "rows": len(corpus)},
            QUERIES_PATH: {"sha256": queries_sha, "rows": len(queries)},
            QRELS_PATH: {"sha256": qrels_sha, "rows": len(qrels)},
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
        "metrics": metrics,
        "runtime": {"seconds_including_model_load": time.perf_counter() - started},
        "counts_as_strict_third_german_suite": False,
        "counts_as_product_gold": False,
        "claim_boundary": (
            "This is a retrieval-model challenger on the pinned LegalQuAD mirror. It is not a new benchmark, "
            "not lawyer-reviewed product gold, and does not resolve LegalQuAD upstream-rights provenance. "
            "The published test outcome may be used to evaluate this predeclared challenger, but not to hand-tune "
            "query-specific rules on the same holdout."
        ),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    printable = dict(result)
    printable["metrics"] = {k: v for k, v in metrics.items() if k != "rows"}
    print(json.dumps(printable, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
