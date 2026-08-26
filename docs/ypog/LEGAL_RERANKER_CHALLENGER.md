# Legal RAG Bench challenger evidence

The core frozen result remains BM25 + general dense RRF at Hit@10 0.43 / MRR 0.255. The generic MS MARCO cross-encoder reduced Hit@10 to 0.32, so reranking is not assumed to help.

This experiment adds `datgacon/cuad-cross-encoder-v11` as a **challenger only** over the exact same RRF top-50 candidate set. The workflow records its immutable Hugging Face revision and the Hit@10 delta versus plain RRF. It cannot become the product default from model-card semantics alone.

Acceptance requires observed improvement on the pinned external set and later confirmation on an untouched benchmark/frozen holdout. Failure remains publishable evidence.
