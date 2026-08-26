#!/usr/bin/env python3
"""Verify that reported benchmark ceilings are arithmetic consequences of frozen evidence."""
import json
from pathlib import Path

ledger = json.loads(Path('evals/german_public/evidence_ledger.json').read_text(encoding='utf-8'))
g = ledger['benchmarks']['gerlayqa']['frozen_result']
assert g['evaluated_questions'] == 1840, g
assert g['questions_with_all_gold_ids_absent_from_corpus'] == 2, g
analysis = g['benchmark_ceiling_analysis']
expected = (g['evaluated_questions'] - g['questions_with_all_gold_ids_absent_from_corpus']) / g['evaluated_questions']
assert abs(analysis['ceiling_if_every_retrievable_question_were_solved'] - expected) < 1e-15, analysis
unavoidable = 1.0 - expected
assert abs(analysis['unavoidable_gap_from_two_all-gold-missing_rows'] - unavoidable) < 1e-15, analysis
observed = g['winner_metrics']['hit_at_10']
assert abs(analysis['observed_winner_to_corpus_ceiling_gap'] - (expected - observed)) < 1e-15, analysis
assert observed < expected, (observed, expected)
print(f"GERLAYQA_CORPUS_HIT10_CEILING={expected:.12f}")
print(f"GERLAYQA_OBSERVED_HIT10={observed:.12f}")
print('BENCHMARK_CEILING_ACCOUNTING=PASS')
