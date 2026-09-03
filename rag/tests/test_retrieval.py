"""Fast, offline contract tests for the canonical retrieval layer."""

import inspect
import unittest

from langchain_core.documents import Document

from rag.retrieval import reciprocal_rank_fusion, retrieve


def doc(law_id: str, section: str, text: str = "text") -> Document:
    return Document(
        page_content=text,
        metadata={"law_id": law_id, "section": section, "abbreviation": law_id.upper()},
    )


class RetrievalContractTests(unittest.TestCase):
    def test_hybrid_is_the_explicit_default(self):
        signature = inspect.signature(retrieve)
        self.assertIs(signature.parameters["hybrid"].default, True)

    def test_empty_query_never_touches_external_retrieval(self):
        self.assertEqual(retrieve("   "), [])

    def test_rrf_deduplicates_and_rewards_cross_retriever_agreement(self):
        shared = doc("bgb", "§ 433")
        dense_only = doc("gg", "Art 5")
        sparse_only = doc("stgb", "§ 185")

        fused = reciprocal_rank_fusion(
            [([shared, dense_only], 1.0), ([shared, sparse_only], 0.5)],
            k_top=3,
        )

        self.assertEqual(fused[0].metadata["section"], "§ 433")
        self.assertEqual(len(fused), 3)
        self.assertEqual(
            len({(d.metadata["law_id"], d.metadata["section"]) for d in fused}),
            3,
        )


if __name__ == "__main__":
    unittest.main()
