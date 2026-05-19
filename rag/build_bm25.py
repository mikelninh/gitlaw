"""
Build and cache a BM25Okapi index over the same paragraph chunks used for FAISS.

Re-uses load_and_chunk_laws() so the chunk set stays in sync. The index, the
tokenized corpus and the chunk metadata list are pickled together to
rag/vectorstore/bm25.pkl.

Run: python3 rag/build_bm25.py
"""

import re
import pickle
import time
from pathlib import Path

from rank_bm25 import BM25Okapi

from rag.build_vectorstore import load_and_chunk_laws, LAWS_DIR

BM25_PATH = Path("rag/vectorstore/bm25.pkl")

_TOKEN_RE = re.compile(r"[A-Za-zÄÖÜäöüß0-9§]+")


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def build(laws_dir: Path = LAWS_DIR, out_path: Path = BM25_PATH) -> None:
    docs = load_and_chunk_laws(laws_dir)
    print(f"Tokenizing {len(docs)} chunks...")
    t0 = time.time()
    tokenized = [tokenize(d.page_content) for d in docs]
    print(f"  tokenized in {time.time() - t0:.1f}s")

    print("Building BM25Okapi...")
    t0 = time.time()
    bm25 = BM25Okapi(tokenized)
    print(f"  built in {time.time() - t0:.1f}s")

    payload = {
        "bm25": bm25,
        "chunks": [
            {"page_content": d.page_content, "metadata": d.metadata} for d in docs
        ],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)
    size_mb = out_path.stat().st_size / 1e6
    print(f"Wrote {out_path} ({size_mb:.1f} MB, {len(docs)} chunks)")


if __name__ == "__main__":
    build()
