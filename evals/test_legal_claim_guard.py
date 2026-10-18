"""Negative legal-claim release contract; stdlib only."""
import unittest
from evals.legal_claim_guard import Claim, VerifiedEvidence, review_claims


class TestLegalClaimGuard(unittest.TestCase):
    def test_rejects_unsubstantiated_legal_statement(self):
        claim = Claim("unfounded", "Eine Behörde muss Anträge immer binnen 48 Stunden genehmigen.", ("span-a",))
        span = VerifiedEvidence("span-a", "fictional-demo-rule", "v1", "Abschnitt 2",
                                "Die Behörde bestätigt den Eingang.", True, frozenset())
        verdict = review_claims([claim], [span])
        self.assertEqual(verdict["status"], "REVIEW_REQUIRED")
        self.assertEqual(verdict["released"], [])
        self.assertEqual(verdict["rejected"][0]["status"], "REJECTED_UNSUPPORTED")
        self.assertIn("nicht belegen", verdict["rejected"][0]["message"])

    def test_fake_citation_does_not_create_support(self):
        claim = Claim("c1", "Eine beliebige Rechtsfolge", ("cited",))
        source = VerifiedEvidence("cited", "demo", "v1", "§ 1", "Nicht validiert",
                                  False, frozenset({"c1"}))
        self.assertEqual(review_claims([claim], [source])["released"], [])

    def test_independently_supported_claim_stays_human_reviewable(self):
        claim = Claim("c2", "Die Demo-Akte enthält einen Eingangsstempel.", ("e2",))
        source = VerifiedEvidence("e2", "demo-akte", "v2", "Seite 1",
                                  "Eingangsstempel vorhanden", True, frozenset({"c2"}))
        result = review_claims([claim], [source])
        self.assertEqual(result["status"], "GROUNDED_FOR_HUMAN_REVIEW")
        self.assertTrue(result["human_review_required"])
        self.assertEqual(len(result["released"]), 1)


if __name__ == "__main__":
    unittest.main()
