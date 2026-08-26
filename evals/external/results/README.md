# External benchmark results

This directory stores **GitLaw-generated evaluation outputs and summaries**, not third-party benchmark corpora.

A result may be committed only when it records enough provenance to reproduce the run:

- benchmark id;
- benchmark/code revision;
- dataset revision/hash when available;
- GitLaw commit or runner version;
- retrieval/model configuration;
- sample count;
- aggregate metrics;
- claim boundary;
- attribution;
- full per-case identifiers/failure classes when redistribution permits it.

Do not commit third-party source text merely to make a benchmark self-contained. Fetch source data from the pinned upstream according to its license and retain the upstream identifiers in the result.

Bad results are retained as baselines. Replacing a weak baseline with a stronger model does not erase the earlier measurement.
