#!/usr/bin/env python3
"""Guard against benchmark-score inflation masquerading as product quality."""
import json
from pathlib import Path

POLICY = Path('docs/ypog/BENCHMARK_OPTIMIZATION_POLICY.md')
GERMAN_LEDGER = Path('evals/german_public/evidence_ledger.json')
EXTERNAL_LEDGER = Path('evals/external/evidence_ledger.json')

text = POLICY.read_text(encoding='utf-8')
assert 'Never tune on final holdout' in text
assert '100% required' in text
assert 'evidence of benchmark fit' in text

german = json.loads(GERMAN_LEDGER.read_text(encoding='utf-8'))
gerlay = german['benchmarks']['gerlayqa']
assert gerlay['execution'] == 'EXECUTED_AND_INTEGRITY_VERIFIED', gerlay
assert gerlay['frozen_result']['github_actions_run_id'] == 32968628053, gerlay['frozen_result']
assert gerlay['frozen_result']['winner_metrics']['hit_at_10'] == 0.24021739130434783, gerlay['frozen_result']
assert gerlay['counts_as_product_gold'] is False, gerlay

external = json.loads(EXTERNAL_LEDGER.read_text(encoding='utf-8'))
lrb = external['benchmarks']['legal-rag-bench']
runs = lrb['component_runs']
tournament = next(x for x in runs if x['type'] == 'GENERAL_SEMANTIC_RETRIEVAL_TOURNAMENT')
assert tournament['github_actions_run_id'] == 32968627859, tournament
assert tournament['winner'] == 'hybrid_general_rrf', tournament
assert tournament['winner_metrics']['hit_at_10'] == 0.43, tournament
assert tournament['rejected_default'] == 'hybrid_general_reranked', tournament
assert tournament['rejected_metrics']['hit_at_10'] == 0.32, tournament
assert lrb['full_run'] == 'PENDING_GENERATIVE_AND_ORACLE_EXECUTION', lrb

print('BENCHMARK_OPTIMIZATION_POLICY=PASS')
print('FROZEN_EVIDENCE_LEDGER_CONTRACT=PASS')
