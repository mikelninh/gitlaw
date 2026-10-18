"""Deterministic claim-release guard. NOT wired to the public GitLaw API yet.

The supported-claim ledger must be created by an independent source verifier
or qualified reviewer, never by the answer-generating LLM.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Sequence

REFUSAL = ("Diese Rechtsaussage kann ich anhand der geprüften Fundstellen nicht belegen. "
           "Ich gebe sie nicht als gesicherte Rechtslage aus. "
           "Bitte prüfen Sie die Primärquelle oder lassen Sie den Fall fachlich prüfen.")


@dataclass(frozen=True)
class Claim:
    id: str
    text: str
    evidence_ids: tuple[str, ...]


@dataclass(frozen=True)
class VerifiedEvidence:
    id: str
    source_id: str
    source_version: str
    locator: str
    excerpt: str
    independently_verified: bool
    supported_claim_ids: frozenset[str]


def review_claims(claims: Sequence[Claim], evidence: Sequence[VerifiedEvidence]) -> dict:
    """Fail closed if a claim lacks independently verified, adjudicated support.

    Semantic entailment is an upstream independent verification *input*;
    this module does not assert it can establish legal truth from string matching.
    """
    evidence_by_id = {item.id: item for item in evidence}
    released = []
    rejected = []
    for claim in claims:
        supporting = [
            evidence_by_id[eid]
            for eid in claim.evidence_ids
            if eid in evidence_by_id
            and evidence_by_id[eid].independently_verified
            and claim.id in evidence_by_id[eid].supported_claim_ids
            and all((
                evidence_by_id[eid].source_id.strip(),
                evidence_by_id[eid].source_version.strip(),
                evidence_by_id[eid].locator.strip(),
                evidence_by_id[eid].excerpt.strip(),
            ))
        ]
        if not claim.text.strip() or not supporting:
            rejected.append({"claim_id": claim.id,
                             "status": "REJECTED_UNSUPPORTED",
                             "message": REFUSAL})
        else:
            released.append({"claim_id": claim.id, "text": claim.text,
                             "verified_evidence_ids": [item.id for item in supporting]})
    return {
        "status": "REVIEW_REQUIRED" if rejected else "GROUNDED_FOR_HUMAN_REVIEW",
        "released": released,
        "rejected": rejected,
        "human_review_required": True,
        "limitation": "Claim support must be independently adjudicated; not legal accuracy certification.",
    }
