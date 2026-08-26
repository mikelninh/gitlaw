# Legal RAG Bench challenger evidence

The frozen core result remains BM25 + general dense RRF at Hit@10 **0.43** / MRR **0.255**. The generic MS MARCO cross-encoder reduced Hit@10 to **0.32**, so reranking is never assumed to help without observed evidence.

## Legal-contract reranker experiment

`datgacon/cuad-cross-encoder-v11` was predeclared as a challenger over the same RRF top-50 candidate set. GitHub Actions run `32977330197` did **not** produce a model-quality score: `sentence-transformers.CrossEncoder` failed during model loading because the repository does not expose the standard PyTorch/safetensors weight files that loader expects.

Status: `BLOCKED_ONNX_ONLY_STANDARD_CROSSENCODER_LOAD`  
Observed score: **none / null**

This is an integration-format blocker, not evidence that the model is worse than RRF. Standard CPU CI therefore returns to the four proven core methods. An explicit ONNX-runtime adapter may be evaluated later as a separate experiment, but it is lower priority than improving candidate generation because most current retrieval misses occur before reranking.

## Promotion rule

No challenger becomes the default from architecture, model-card language, or domain labels. Promotion requires an observed improvement on a predeclared frozen evaluation and later confirmation on an untouched benchmark or lawyer-reviewed holdout. Failed and blocked experiments remain part of the evidence trail.
