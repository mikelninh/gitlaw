#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("build_review_packet.py")
spec = importlib.util.spec_from_file_location("build_review_packet", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def candidate() -> dict:
    return {
        "case_id": "DE-PILOT-Q03",
        "task_family": "Mietrecht",
        "practice_area": "Mietrecht",
        "facts": ["Mein Vermieter will die Miete um 20 Prozent erhöhen. Ist das erlaubt?"],
        "task": "Prüfe die aufgeworfene Rechtsfrage.",
        "critical_issues": ["Mieterhöhung Kappungsgrenze + Modernisierung"],
        "review": {"status": "candidate_unreviewed", "reviewers": [], "frozen_holdout": False},
    }


def main() -> None:
    fallback = module.build_packet(candidate(), {
        "system_version": "gitlaw@test",
        "corpus_snapshot": "laws@test",
        "trace_id": "trace-1",
        "model_identity": "hidden-model",
        "answer": "Die Erhöhung muss anhand der konkreten gesetzlichen Voraussetzungen geprüft werden.",
        "sources": [{"law": "BGB", "section": "§ 558"}],
    })
    assert fallback["schema_version"] == "1.0"
    assert fallback["case_id"] == "DE-PILOT-Q03"
    assert fallback["blinding"]["hide_model_identity"] is True
    assert fallback["system"]["model_identity"] == "hidden-model"
    assert fallback["claims"] == [{
        "id": "claim-whole-answer",
        "text": "Die Erhöhung muss anhand der konkreten gesetzlichen Voraussetzungen geprüft werden.",
        "sources": [{"id": "source-01", "label": "BGB § 558", "citation": "BGB § 558"}],
    }]

    structured = module.build_packet(candidate(), {
        "system_version": "gitlaw@test",
        "corpus_snapshot": "laws@test",
        "answer": "Structured answer",
        "claims": [{
            "id": "c1",
            "text": "Eine konkrete materielle Aussage.",
            "sources": [{"id": "s1", "label": "BGB § 558", "citation": "§ 558 BGB", "excerpt": "synthetic excerpt"}],
        }],
    })
    assert structured["claims"][0]["id"] == "c1"
    assert structured["claims"][0]["sources"][0]["excerpt"] == "synthetic excerpt"

    approved = candidate()
    approved["review"]["status"] = "approved_gold"
    try:
        module.build_packet(approved, {
            "system_version": "gitlaw@test",
            "corpus_snapshot": "laws@test",
            "answer": "answer",
        })
    except ValueError:
        pass
    else:
        raise AssertionError("approved gold was incorrectly accepted as unreviewed pilot packet")

    print("LAWYER_REVIEW_PACKET_TEST=PASS")
    print("LAWYER_REVIEW_PACKET_NO_CLAIM_INVENTION=PASS")


if __name__ == "__main__":
    main()
