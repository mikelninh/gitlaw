#!/usr/bin/env python3
"""Guard against benchmark-score inflation masquerading as product quality."""
import json
from pathlib import Path

POLICY = Path('docs/ypog/BENCHMARK_OPTIMIZATION_POLICY.md')
GERLAY = Path('evals/german_public/results/gerlayqa_20260826.json')
EXTERNAL = Path('evals/external/results/legal_rag_bench_tournament_20260826.json')

text = POLICY.read_text(encoding='utf-8')
assert 'Never tune on final holdout' in text
assert '100% required' in text
assert 'evidence of benchmark fit' in text

for path in (GERLAY, EXTERNAL):
    data = json.loads(path.read_text(encoding='utf-8'))
    rendered = json.dumps(data)
    assert 'OBSERVED' in rendered, path

print('BENCHMARK_OPTIMIZATION_POLICY=PASS')
