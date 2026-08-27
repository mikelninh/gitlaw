#!/usr/bin/env python3
"""Analyze complementarity and oracle ceilings from retrieval tournament JSON.

This does not choose per-query winners in production. The oracle union is diagnostic:
it shows how much of the miss rate is potentially recoverable by routing/fusion among
already-run methods versus requiring a new retriever/corpus/label treatment.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('result', type=Path)
    ap.add_argument('--json-out', type=Path)
    args = ap.parse_args()

    data = json.loads(args.result.read_text(encoding='utf-8'))
    methods = data.get('methods', {})
    if not methods:
        raise SystemExit('result has no methods')

    row_maps: dict[str, dict[str, dict]] = {}
    for name, payload in methods.items():
        rows = payload.get('rows') or []
        mapping = {}
        for idx, row in enumerate(rows):
            key = str(row.get('question_index', row.get('question', idx)))
            mapping[key] = row
        if mapping:
            row_maps[name] = mapping
    if len(row_maps) < 2:
        raise SystemExit('need at least two methods with failure-level rows')

    common = set.intersection(*(set(m) for m in row_maps.values()))
    n = len(common)
    if not n:
        raise SystemExit('methods have no common rows')

    def hit(row: dict, k: int) -> bool:
        rank = row.get('rank')
        if rank is not None:
            return int(rank) <= k
        first = row.get('first_relevant_rank')
        if first is not None:
            return int(first) <= k
        gold = set(map(str, row.get('gold_paragraph_ids', [])))
        retrieved = list(map(str, row.get('top10_paragraph_ids', row.get('top10_passage_ids', []))))
        return bool(gold.intersection(retrieved[:k]))

    per_method = {}
    hit_sets = {}
    for name, mapping in row_maps.items():
        hs = {q for q in common if hit(mapping[q], 10)}
        hit_sets[name] = hs
        per_method[name] = {'hit_at_10': len(hs) / n, 'hits': len(hs)}

    oracle = set().union(*hit_sets.values())
    all_miss = common - oracle
    unique = {name: len(hs - set().union(*(other for n2, other in hit_sets.items() if n2 != name))) for name, hs in hit_sets.items()}

    pairwise = []
    names = sorted(hit_sets)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            union = hit_sets[a] | hit_sets[b]
            pairwise.append({
                'a': a,
                'b': b,
                'oracle_union_hit_at_10': len(union) / n,
                'a_recovers_b_misses': len(hit_sets[a] - hit_sets[b]),
                'b_recovers_a_misses': len(hit_sets[b] - hit_sets[a]),
            })
    pairwise.sort(key=lambda x: x['oracle_union_hit_at_10'], reverse=True)

    best_observed = max(per_method, key=lambda x: per_method[x]['hit_at_10'])
    best_rate = per_method[best_observed]['hit_at_10']
    out = {
        'schema_version': '1.0',
        'status': 'DIAGNOSTIC_ORACLE_COMPLEMENTARITY_NOT_PRODUCTION_ROUTING',
        'benchmark': data.get('benchmark'),
        'n_common_queries': n,
        'per_method': per_method,
        'unique_top10_hits': unique,
        'best_observed_method': best_observed,
        'best_observed_hit_at_10': best_rate,
        'oracle_union_hit_at_10': len(oracle) / n,
        'recoverable_headroom_if_perfect_router_existed': len(oracle) / n - best_rate,
        'queries_missed_by_every_current_method': len(all_miss),
        'all_current_methods_miss_rate': len(all_miss) / n,
        'best_pairs': pairwise[:10],
        'claim_boundary': (
            'Oracle union uses test outcomes after the fact and is therefore only a diagnostic upper bound. '
            'It must not be reported as deployable retrieval accuracy or used to select per-query methods on the same holdout.'
        ),
    }
    rendered = json.dumps(out, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(rendered + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
