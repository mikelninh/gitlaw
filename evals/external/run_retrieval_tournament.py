#!/usr/bin/env python3
"""Run a reproducible retrieval tournament on pinned Legal RAG Bench data.

Methods:
- BM25 lexical baseline
- generic dense embeddings
- BM25 + dense reciprocal-rank fusion (RRF)
- hybrid + cross-encoder reranking
- open legal-domain dense embeddings
- BM25 + legal dense RRF
- legal hybrid + cross-encoder reranking

The benchmark is external Australian-law retrieval evidence. It is not German-law
accuracy and not an end-to-end legal-answer benchmark.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path
from typing import Any

import numpy as np
from huggingface_hub import HfApi
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

DATASET = "isaacus/legal-rag-bench"
DATASET_REVISION = "db0b31dc6d195ce9916897e1ac5e4e6209736c8a"
RAW_BASE = f"https://huggingface.co/datasets/{DATASET}/resolve/{DATASET_REVISION}"
TOKEN_RE = re.compile(r"\b\w+\b", re.UNICODE)

GENERAL_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LEGAL_MODEL = "Hanno-Labs/dinghy-law-0.6b-v1"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L6-v2"


def fetch_jsonl(filename: str, retries: int = 3) -> list[dict[str, Any]]:
    url = f"{RAW_BASE}/{filename}"
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GitLaw-Eval-Lab/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                rows = [json.loads(line) for line in response.read().decode("utf-8").splitlines() if line.strip()]
            if not rows:
                raise RuntimeError(f"{filename} contained no rows")
            return rows
        except Exception:
            if attempt == retries:
                raise
            time.sleep(attempt * 2)
    raise RuntimeError("unreachable")


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def resolve_revision(model_id: str) -> str:
    sha = HfApi().model_info(model_id).sha
    if not sha or len(sha) < 12:
        raise RuntimeError(f"Could not resolve immutable model revision for {model_id}")
    return sha


def bm25_rankings(texts: list[str], questions: list[str]) -> tuple[np.ndarray, float]:
    started = time.perf_counter()
    bm25 = BM25Okapi([tokenize(t) for t in texts])
    rows = []
    for question in questions:
        scores = np.asarray(bm25.get_scores(tokenize(question)), dtype=np.float32)
        rows.append(np.argsort(-scores, kind="stable"))
    return np.vstack(rows), time.perf_counter() - started


def encode_model(model_id: str, revision: str, texts: list[str], questions: list[str], *, legal: bool) -> tuple[np.ndarray, float, int]:
    started = time.perf_counter()
    model = SentenceTransformer(model_id, revision=revision, device="cpu", trust_remote_code=True)
    if legal and hasattr(model, "encode_document") and hasattr(model, "encode_query"):
        doc = model.encode_document(texts, batch_size=16, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=True)
        qry = model.encode_query(questions, batch_size=16, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    else:
        doc = model.encode(texts, batch_size=64, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=True)
        qry = model.encode(questions, batch_size=64, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    sims = np.asarray(qry, dtype=np.float32) @ np.asarray(doc, dtype=np.float32).T
    rankings = np.argsort(-sims, axis=1, kind="stable")
    elapsed = time.perf_counter() - started
    return rankings, elapsed, int(getattr(model, "max_seq_length", 0) or 0)


def rrf(a: np.ndarray, b: np.ndarray, *, rrf_k: int = 60) -> np.ndarray:
    out = np.empty_like(a)
    n_docs = a.shape[1]
    for qi in range(a.shape[0]):
        rank_a = np.empty(n_docs, dtype=np.int32)
        rank_b = np.empty(n_docs, dtype=np.int32)
        rank_a[a[qi]] = np.arange(1, n_docs + 1)
        rank_b[b[qi]] = np.arange(1, n_docs + 1)
        score = 1.0 / (rrf_k + rank_a) + 1.0 / (rrf_k + rank_b)
        out[qi] = np.argsort(-score, kind="stable")
    return out


def rerank(base: np.ndarray, questions: list[str], texts: list[str], model_id: str, revision: str, *, top_n: int = 50) -> tuple[np.ndarray, float]:
    started = time.perf_counter()
    model = CrossEncoder(model_id, revision=revision, device="cpu")
    out = base.copy()
    for qi, question in enumerate(questions):
        candidates = base[qi, :top_n]
        pairs = [(question, texts[int(idx)]) for idx in candidates]
        scores = np.asarray(model.predict(pairs, batch_size=64, show_progress_bar=False)).reshape(-1)
        order = np.argsort(-scores, kind="stable")
        out[qi, :top_n] = candidates[order]
    return out, time.perf_counter() - started


def metrics(rankings: np.ndarray, corpus_ids: list[str], gold_ids: list[str]) -> dict[str, Any]:
    hits = {1: 0, 5: 0, 10: 0}
    rr = 0.0
    rows = []
    for qi, ranking in enumerate(rankings):
        gold = gold_ids[qi]
        rank = next((i + 1 for i, idx in enumerate(ranking) if corpus_ids[int(idx)] == gold), None)
        if rank:
            rr += 1.0 / rank
            for k in hits:
                if rank <= k:
                    hits[k] += 1
        rows.append({
            "question_index": qi,
            "gold_passage_id": gold,
            "rank": rank,
            "top10_passage_ids": [corpus_ids[int(i)] for i in ranking[:10]],
        })
    n = len(gold_ids)
    return {
        "hit_at_1": hits[1] / n,
        "hit_at_5": hits[5] / n,
        "hit_at_10": hits[10] / n,
        "mrr": rr / n,
        "missed_top_10": n - hits[10],
        "rows": rows,
    }


def compact(result: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in result.items() if k != "rows"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path)
    ap.add_argument("--skip-legal", action="store_true", help="Run only the small general model path")
    ap.add_argument("--rerank-top-n", type=int, default=50)
    args = ap.parse_args()

    corpus = fetch_jsonl("corpus.jsonl")
    qa = fetch_jsonl("qa.jsonl")
    if len(corpus) != 4876 or len(qa) != 100:
        raise RuntimeError(f"Pinned dataset cardinality drift: corpus={len(corpus)} qa={len(qa)}")

    corpus_ids = [str(x["id"]) for x in corpus]
    texts = [str(x["text"]) for x in corpus]
    questions = [str(x["question"]) for x in qa]
    gold_ids = [str(x["relevant_passage_id"]) for x in qa]

    general_rev = resolve_revision(GENERAL_MODEL)
    reranker_rev = resolve_revision(RERANKER_MODEL)
    legal_rev = None if args.skip_legal else resolve_revision(LEGAL_MODEL)

    bm25, bm25_seconds = bm25_rankings(texts, questions)
    general, general_seconds, general_max_seq = encode_model(GENERAL_MODEL, general_rev, texts, questions, legal=False)
    general_hybrid = rrf(bm25, general)
    general_reranked, general_rerank_seconds = rerank(general_hybrid, questions, texts, RERANKER_MODEL, reranker_rev, top_n=args.rerank_top_n)

    method_rankings: dict[str, np.ndarray] = {
        "bm25": bm25,
        "dense_general": general,
        "hybrid_general_rrf": general_hybrid,
        "hybrid_general_reranked": general_reranked,
    }
    timings = {
        "bm25_seconds": bm25_seconds,
        "dense_general_seconds_including_model_load": general_seconds,
        "rerank_general_seconds_including_model_load": general_rerank_seconds,
    }
    sequence_limits = {"dense_general_max_seq_length": general_max_seq}

    if not args.skip_legal and legal_rev:
        legal, legal_seconds, legal_max_seq = encode_model(LEGAL_MODEL, legal_rev, texts, questions, legal=True)
        legal_hybrid = rrf(bm25, legal)
        legal_reranked, legal_rerank_seconds = rerank(legal_hybrid, questions, texts, RERANKER_MODEL, reranker_rev, top_n=args.rerank_top_n)
        method_rankings.update({
            "dense_legal": legal,
            "hybrid_legal_rrf": legal_hybrid,
            "hybrid_legal_reranked": legal_reranked,
        })
        timings.update({
            "dense_legal_seconds_including_model_load": legal_seconds,
            "rerank_legal_seconds_including_model_load": legal_rerank_seconds,
        })
        sequence_limits["dense_legal_max_seq_length"] = legal_max_seq

    results = {name: metrics(ranking, corpus_ids, gold_ids) for name, ranking in method_rankings.items()}
    winner = max(results, key=lambda name: (results[name]["hit_at_10"], results[name]["mrr"]))

    output = {
        "schema_version": "1.0",
        "status": "OBSERVED_EXTERNAL_RETRIEVAL_TOURNAMENT",
        "benchmark": "Legal RAG Bench",
        "dataset": DATASET,
        "dataset_revision": DATASET_REVISION,
        "n_questions": len(questions),
        "n_passages": len(texts),
        "model_revisions": {
            "dense_general": {"model": GENERAL_MODEL, "revision": general_rev},
            "reranker": {"model": RERANKER_MODEL, "revision": reranker_rev},
            "dense_legal": None if legal_rev is None else {"model": LEGAL_MODEL, "revision": legal_rev},
        },
        "configuration": {"rrf_k": 60, "rerank_top_n": args.rerank_top_n},
        "sequence_limits": sequence_limits,
        "timings": timings,
        "methods": results,
        "winner_by_hit_at_10_then_mrr": winner,
        "claim_boundary": (
            "This compares retrieval components on pinned Australian-law external ground truth. "
            "It is not an end-to-end answer-quality score and not evidence of German-law accuracy."
        ),
        "license_boundary": (
            "Source benchmark text is fetched at runtime and not vendored. Legal RAG Bench dataset licensing remains non-commercial/clarification-gated in GitLaw's manifest. "
            "Model licenses are recorded separately; the two open embedding/reranking candidates used here are Apache-2.0 per their model cards."
        ),
    }

    printable = dict(output)
    printable["methods"] = {name: compact(value) for name, value in results.items()}
    print(json.dumps(printable, ensure_ascii=False, indent=2))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
