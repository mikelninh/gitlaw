#!/usr/bin/env python3
"""Run a pinned GerDaLIRSmall German case-law retrieval tournament.

The standardized MTEB-small snapshot is fetched at runtime from Hugging Face and
is not vendored into GitLaw. This runner intentionally keeps the evaluation
claim narrow: German case-law retrieval on the pinned historical task only.

Memory contract:
- Keep only the top RRF_DEPTH ranking positions per query.
- Score dense queries in chunks instead of materializing the full
  12,234 x 9,969 score matrix.
- Preserve every positive qrel from the pinned dataset.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from datasets import load_dataset
from huggingface_hub import HfApi
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

DATASET_ID = "mteb/GerDaLIRSmall"
DATASET_REVISION = "48327de6ee192e9610f3069789719788957c7abd"
EXPECTED_CORPUS = 9969
EXPECTED_QUERIES = 12234
EXPECTED_QRELS = 14320
RRF_K = 60
RRF_DEPTH = 200
TOKEN_RE = re.compile(r"\b\w+\b", re.UNICODE)

MODEL_IDS = {
    "dense_general": "sentence-transformers/all-MiniLM-L6-v2",
    "dense_german": "PM-AI/bi-encoder_msmarco_bert-base_german",
}


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def package_versions() -> dict[str, str]:
    packages = (
        "numpy",
        "rank-bm25",
        "sentence-transformers",
        "huggingface-hub",
        "datasets",
        "transformers",
        "torch",
    )
    versions: dict[str, str] = {}
    for package in packages:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = "NOT_INSTALLED"
    return versions


def resolve_model(model_id: str) -> tuple[str, str]:
    info = HfApi().model_info(model_id)
    revision = str(info.sha)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError(f"model {model_id} did not resolve to a 40-char commit SHA: {revision}")
    return model_id, revision


def load_task() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    corpus_ds = load_dataset(DATASET_ID, "corpus", split="corpus", revision=DATASET_REVISION)
    queries_ds = load_dataset(DATASET_ID, "queries", split="queries", revision=DATASET_REVISION)
    qrels_ds = load_dataset(DATASET_ID, "default", split="test", revision=DATASET_REVISION)
    corpus = [dict(row) for row in corpus_ds]
    queries = [dict(row) for row in queries_ds]
    qrels = [dict(row) for row in qrels_ds]
    return corpus, queries, qrels


def validate_task(
    corpus: list[dict[str, Any]],
    queries: list[dict[str, Any]],
    qrels: list[dict[str, Any]],
) -> tuple[list[str], list[str], list[str], list[str], dict[str, set[str]]]:
    if len(corpus) != EXPECTED_CORPUS:
        raise RuntimeError(f"expected {EXPECTED_CORPUS} GerDaLIRSmall corpus rows, got {len(corpus)}")
    if len(queries) != EXPECTED_QUERIES:
        raise RuntimeError(f"expected {EXPECTED_QUERIES} GerDaLIRSmall queries, got {len(queries)}")
    if len(qrels) != EXPECTED_QRELS:
        raise RuntimeError(f"expected {EXPECTED_QRELS} GerDaLIRSmall qrels, got {len(qrels)}")

    corpus_ids = [str(r["_id"]) for r in corpus]
    query_ids = [str(r["_id"]) for r in queries]
    if len(set(corpus_ids)) != len(corpus_ids):
        raise RuntimeError("duplicate corpus ids in pinned GerDaLIRSmall snapshot")
    if len(set(query_ids)) != len(query_ids):
        raise RuntimeError("duplicate query ids in pinned GerDaLIRSmall snapshot")

    corpus_texts = [f"{str(r.get('title', '')).strip()} {str(r.get('text', '')).strip()}".strip() for r in corpus]
    query_texts = [str(r.get("text", "")).strip() for r in queries]
    if any(not text for text in corpus_texts):
        raise RuntimeError("empty corpus text in pinned GerDaLIRSmall snapshot")
    if any(not text for text in query_texts):
        raise RuntimeError("empty query text in pinned GerDaLIRSmall snapshot")

    corpus_set = set(corpus_ids)
    query_set = set(query_ids)
    relevant: dict[str, set[str]] = defaultdict(set)
    for row in qrels:
        qid = str(row["query-id"])
        did = str(row["corpus-id"])
        score = float(row.get("score", 0))
        if qid not in query_set:
            raise RuntimeError(f"qrel references unknown query id: {qid}")
        if did not in corpus_set:
            raise RuntimeError(f"qrel references unknown corpus id: {did}")
        if score > 0:
            relevant[qid].add(did)

    missing_relevance = [qid for qid in query_ids if not relevant.get(qid)]
    if missing_relevance:
        raise RuntimeError(f"queries without positive qrels: {missing_relevance[:20]}")
    if sum(len(v) for v in relevant.values()) != EXPECTED_QRELS:
        raise RuntimeError("positive qrel accounting drifted from pinned snapshot")

    return corpus_ids, corpus_texts, query_ids, query_texts, relevant


def top_indices(scores: np.ndarray, depth: int) -> list[int]:
    depth = min(depth, scores.shape[0])
    if depth == scores.shape[0]:
        return np.argsort(scores)[::-1].tolist()
    idx = np.argpartition(scores, -depth)[-depth:]
    idx = idx[np.argsort(scores[idx])[::-1]]
    return idx.tolist()


def build_bm25_postings(
    model: BM25Okapi,
) -> tuple[dict[str, tuple[np.ndarray, np.ndarray]], np.ndarray]:
    doc_length_norm = model.k1 * (
        1.0
        - model.b
        + model.b * np.asarray(model.doc_len, dtype=np.float64) / float(model.avgdl)
    )
    posting_doc_ids: dict[str, list[int]] = defaultdict(list)
    posting_tfs: dict[str, list[float]] = defaultdict(list)
    for doc_idx, frequencies in enumerate(model.doc_freqs):
        for token, tf in frequencies.items():
            posting_doc_ids[token].append(doc_idx)
            posting_tfs[token].append(float(tf))

    postings = {
        token: (
            np.asarray(posting_doc_ids[token], dtype=np.int32),
            np.asarray(posting_tfs[token], dtype=np.float64),
        )
        for token in posting_doc_ids
    }
    return postings, doc_length_norm


def bm25_postings_scores(
    model: BM25Okapi,
    postings: dict[str, tuple[np.ndarray, np.ndarray]],
    doc_length_norm: np.ndarray,
    query_tokens: list[str],
) -> np.ndarray:
    scores = np.zeros(model.corpus_size, dtype=np.float64)
    for token in query_tokens:
        posting = postings.get(token)
        if posting is None:
            continue
        doc_idx, tf = posting
        idf = float(model.idf.get(token, 0.0))
        scores[doc_idx] += idf * (
            tf * (model.k1 + 1.0) / (tf + doc_length_norm[doc_idx])
        )
    return scores


def verify_bm25_equivalence() -> None:
    synthetic_corpus = [
        ["alpha", "beta", "beta", "law"],
        ["beta", "gamma", "court"],
        ["alpha", "delta", "delta", "delta"],
        ["court", "law", "law", "epsilon"],
        ["zeta"],
    ]
    model = BM25Okapi(synthetic_corpus)
    postings, doc_length_norm = build_bm25_postings(model)
    synthetic_queries = [
        ["alpha", "beta"],
        ["missing", "law"],
        ["beta", "beta", "gamma"],
        ["court", "epsilon", "alpha"],
        [],
    ]
    for query_tokens in synthetic_queries:
        expected = np.asarray(model.get_scores(query_tokens), dtype=np.float64)
        actual = bm25_postings_scores(model, postings, doc_length_norm, query_tokens)
        if not np.allclose(actual, expected, rtol=1e-12, atol=1e-12):
            delta = float(np.max(np.abs(actual - expected)))
            raise RuntimeError(
                f"inverted-postings BM25 diverged from rank_bm25 reference; max_abs_delta={delta}"
            )


def rank_bm25(corpus_texts: list[str], query_texts: list[str], depth: int) -> tuple[list[list[int]], dict[str, Any]]:
    started = time.perf_counter()
    verify_bm25_equivalence()
    tokenized_corpus = [tokenize(text) for text in corpus_texts]
    model = BM25Okapi(tokenized_corpus)
    postings, doc_length_norm = build_bm25_postings(model)
    actual_query_checks = min(8, len(query_texts))
    for query in query_texts[:actual_query_checks]:
        query_tokens = tokenize(query)
        expected = np.asarray(model.get_scores(query_tokens), dtype=np.float64)
        actual = bm25_postings_scores(model, postings, doc_length_norm, query_tokens)
        if not np.allclose(actual, expected, rtol=1e-12, atol=1e-12):
            delta = float(np.max(np.abs(actual - expected)))
            raise RuntimeError(
                f"inverted-postings BM25 diverged on pinned corpus; max_abs_delta={delta}"
            )
    rankings: list[list[int]] = []
    for query in query_texts:
        scores = bm25_postings_scores(model, postings, doc_length_norm, tokenize(query))
        rankings.append(top_indices(scores, depth))
    elapsed = time.perf_counter() - started
    return rankings, {
        "implementation": "inverted_postings_rank_bm25_equivalent",
        "equivalence_self_check": True,
        "equivalence_actual_query_checks": actual_query_checks,
        "rank_bm25_parameters": {
            "k1": float(model.k1),
            "b": float(model.b),
            "epsilon": float(model.epsilon),
        },
        "indexed_terms": len(postings),
        "postings_entries": int(sum(len(doc_ids) for doc_ids, _ in postings.values())),
        "seconds": elapsed,
        "seconds_per_query_including_index_build": elapsed / max(len(query_texts), 1),
        "retained_depth": depth,
    }


def rank_dense(
    corpus_texts: list[str],
    query_texts: list[str],
    model_id: str,
    revision: str,
    batch_size: int,
    query_chunk_size: int,
    depth: int,
) -> tuple[list[list[int]], dict[str, Any]]:
    started = time.perf_counter()
    model = SentenceTransformer(model_id, revision=revision, trust_remote_code=False)
    corpus_embeddings = model.encode(
        corpus_texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    query_embeddings = model.encode(
        query_texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    rankings: list[list[int]] = []
    for start in range(0, len(query_texts), query_chunk_size):
        q = query_embeddings[start : start + query_chunk_size]
        scores = np.matmul(q, corpus_embeddings.T)
        depth_eff = min(depth, scores.shape[1])
        candidate_idx = np.argpartition(scores, -depth_eff, axis=1)[:, -depth_eff:]
        candidate_scores = np.take_along_axis(scores, candidate_idx, axis=1)
        order = np.argsort(candidate_scores, axis=1)[:, ::-1]
        sorted_idx = np.take_along_axis(candidate_idx, order, axis=1)
        rankings.extend(sorted_idx.tolist())

    elapsed = time.perf_counter() - started
    return rankings, {
        "model_id": model_id,
        "model_revision": revision,
        "normalize_embeddings": True,
        "seconds": elapsed,
        "seconds_per_query_including_corpus_embedding": elapsed / max(len(query_texts), 1),
        "query_chunk_size": query_chunk_size,
        "retained_depth": depth,
    }


def rrf_rank(a: list[int], b: list[int], *, k: int = RRF_K, depth: int = RRF_DEPTH) -> list[int]:
    scores: dict[int, float] = defaultdict(float)
    for ranking in (a[:depth], b[:depth]):
        for rank, idx in enumerate(ranking, start=1):
            scores[idx] += 1.0 / (k + rank)
    return [idx for idx, _ in sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:depth]]


def evaluate(
    name: str,
    rankings: list[list[int]],
    corpus_ids: list[str],
    query_ids: list[str],
    relevant: dict[str, set[str]],
    k: int = 10,
) -> dict[str, Any]:
    ps: list[float] = []
    rs: list[float] = []
    f1s: list[float] = []
    rrs: list[float] = []
    aps: list[float] = []
    hits = {1: 0, 5: 0, 10: 0}
    details: list[dict[str, Any]] = []

    for qid, ranking in zip(query_ids, rankings):
        expected = relevant[qid]
        retrieved = [corpus_ids[i] for i in ranking[:k]]
        found = set(retrieved) & expected
        p = len(found) / k
        r = len(found) / len(expected)
        f1 = 0.0 if p + r == 0 else 2 * p * r / (p + r)
        rr = 0.0
        ap_hits = 0
        ap_sum = 0.0
        seen: set[str] = set()
        for rank, did in enumerate(retrieved, start=1):
            if did in expected:
                if rr == 0.0:
                    rr = 1.0 / rank
                if did not in seen:
                    ap_hits += 1
                    seen.add(did)
                    ap_sum += ap_hits / rank
        ap = ap_sum / len(expected)
        for cutoff in hits:
            if set(retrieved[:cutoff]) & expected:
                hits[cutoff] += 1
        ps.append(p)
        rs.append(r)
        f1s.append(f1)
        rrs.append(rr)
        aps.append(ap)
        details.append({
            "query_id": qid,
            "gold_document_ids": sorted(expected),
            "top10_document_ids": retrieved,
            "first_relevant_rank": int(round(1 / rr)) if rr else None,
        })

    n = len(query_ids)
    return {
        "name": name,
        "n_queries": n,
        "metrics": {
            "precision_at_10": float(np.mean(ps)),
            "recall_at_10": float(np.mean(rs)),
            "f1_at_10": float(np.mean(f1s)),
            "mrr_at_10": float(np.mean(rrs)),
            "map_at_10": float(np.mean(aps)),
            "hit_at_1": hits[1] / n,
            "hit_at_5": hits[5] / n,
            "hit_at_10": hits[10] / n,
        },
        "rows": details,
    }


def write_checkpoint(
    path: Path,
    base_result: dict[str, Any],
    methods: dict[str, dict[str, Any]],
    model_meta: dict[str, Any],
    selected: set[str],
) -> None:
    scoreboard = sorted(
        ({"method": name, **payload["metrics"]} for name, payload in methods.items()),
        key=lambda row: (row["mrr_at_10"], row["recall_at_10"], row["hit_at_10"]),
        reverse=True,
    )
    payload = {
        **base_result,
        "status": "PARTIAL_GERMAN_PUBLIC_RETRIEVAL_EVIDENCE",
        "completed_methods": sorted(methods),
        "selected_methods": sorted(selected),
        "models": model_meta,
        "scoreboard": scoreboard,
        "methods": methods,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path, required=True)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--query-chunk-size", type=int, default=128)
    ap.add_argument("--preflight-only", action="store_true")
    ap.add_argument(
        "--methods",
        default="bm25,dense_general,dense_german,hybrid_german_rrf",
        help="comma-separated: bm25,dense_general,dense_german,hybrid_german_rrf",
    )
    args = ap.parse_args()
    selected = {m.strip() for m in args.methods.split(",") if m.strip()}
    allowed = {"bm25", "dense_general", "dense_german", "hybrid_german_rrf"}
    unknown = selected - allowed
    if unknown:
        raise SystemExit(f"unknown methods: {sorted(unknown)}")

    loaded_at = time.perf_counter()
    corpus, queries, qrels = load_task()
    corpus_ids, corpus_texts, query_ids, query_texts, relevant = validate_task(corpus, queries, qrels)
    load_seconds = time.perf_counter() - loaded_at

    base_result: dict[str, Any] = {
        "schema_version": "1.1",
        "benchmark": "GerDaLIRSmall",
        "dataset_id": DATASET_ID,
        "dataset_revision": DATASET_REVISION,
        "dataset_license": "MIT",
        "data_vendored": False,
        "counts": {
            "documents": len(corpus_ids),
            "queries": len(query_ids),
            "positive_relevance_labels": sum(len(v) for v in relevant.values()),
        },
        "runtime": {
            "dataset_load_and_validation_seconds": load_seconds,
            "package_versions": package_versions(),
        },
        "memory_contract": {
            "retained_ranking_depth": RRF_DEPTH,
            "dense_query_chunk_size": args.query_chunk_size,
            "full_query_document_score_matrix_persisted": False,
        },
        "claim_boundary": (
            "German case-law retrieval capability on the pinned MTEB GerDaLIRSmall test task only. "
            "It is not legal answer accuracy, current-law validation, lawyer approval, or product readiness."
        ),
    }

    if args.preflight_only:
        base_result["status"] = "GERDALIR_SMALL_PREFLIGHT_PASS"
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(base_result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(base_result, ensure_ascii=False, indent=2))
        return

    rankings: dict[str, list[list[int]]] = {}
    methods: dict[str, dict[str, Any]] = {}
    model_meta: dict[str, Any] = {}

    need_bm25 = "bm25" in selected or "hybrid_german_rrf" in selected
    if need_bm25:
        ranked, runtime = rank_bm25(corpus_texts, query_texts, RRF_DEPTH)
        rankings["bm25"] = ranked
        methods["bm25"] = evaluate("bm25", ranked, corpus_ids, query_ids, relevant)
        methods["bm25"]["runtime"] = runtime
        write_checkpoint(args.json_out, base_result, methods, model_meta, selected)

    for method in ("dense_general", "dense_german"):
        need = method in selected or (method == "dense_german" and "hybrid_german_rrf" in selected)
        if not need:
            continue
        model_id, revision = resolve_model(MODEL_IDS[method])
        ranked, runtime = rank_dense(
            corpus_texts,
            query_texts,
            model_id,
            revision,
            args.batch_size,
            args.query_chunk_size,
            RRF_DEPTH,
        )
        rankings[method] = ranked
        model_meta[method] = runtime
        methods[method] = evaluate(method, ranked, corpus_ids, query_ids, relevant)
        methods[method]["runtime"] = runtime
        write_checkpoint(args.json_out, base_result, methods, model_meta, selected)

    if "hybrid_german_rrf" in selected:
        fused = [rrf_rank(a, b) for a, b in zip(rankings["bm25"], rankings["dense_german"])]
        rankings["hybrid_german_rrf"] = fused
        methods["hybrid_german_rrf"] = evaluate("hybrid_german_rrf", fused, corpus_ids, query_ids, relevant)
        methods["hybrid_german_rrf"]["fusion"] = {
            "type": "reciprocal_rank_fusion",
            "rrf_k": RRF_K,
            "input_depth": RRF_DEPTH,
        }
        write_checkpoint(args.json_out, base_result, methods, model_meta, selected)

    scoreboard = sorted(
        ({"method": name, **payload["metrics"]} for name, payload in methods.items()),
        key=lambda row: (row["mrr_at_10"], row["recall_at_10"], row["hit_at_10"]),
        reverse=True,
    )
    base_result.update({
        "status": "OBSERVED_GERMAN_PUBLIC_RETRIEVAL_EVIDENCE",
        "completed_methods": sorted(methods),
        "selected_methods": sorted(selected),
        "models": model_meta,
        "scoreboard": scoreboard,
        "methods": methods,
    })
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(base_result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in base_result.items() if k != "methods"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
