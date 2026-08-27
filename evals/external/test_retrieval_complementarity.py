#!/usr/bin/env python3
import json
import subprocess
import tempfile
from pathlib import Path

fixture = Path('evals/external/fixtures/retrieval_complementarity.sample.json')
with tempfile.TemporaryDirectory() as td:
    out = Path(td) / 'out.json'
    subprocess.run([
        'python', 'evals/external/analyze_retrieval_complementarity.py',
        str(fixture), '--json-out', str(out)
    ], check=True)
    r = json.loads(out.read_text(encoding='utf-8'))
    assert r['n_common_queries'] == 4, r
    assert r['best_observed_hit_at_10'] == 0.5, r
    assert r['oracle_union_hit_at_10'] == 0.75, r
    assert r['recoverable_headroom_if_perfect_router_existed'] == 0.25, r
    assert r['queries_missed_by_every_current_method'] == 1, r
    assert r['unique_top10_hits']['a'] == 1, r
    assert r['unique_top10_hits']['b'] == 1, r
print('RETRIEVAL_COMPLEMENTARITY_CONTRACT=PASS')
