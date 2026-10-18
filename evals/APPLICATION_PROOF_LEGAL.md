# GitLaw · Capgemini Invent Legal Engineering work sample

**The proof:** A legal assertion has a citation, but the retrieved passage does not support it. GitLaw must explicitly refuse to release it as established law.

Run this **standalone release contract** from the repository root:

```bash
python -m unittest discover -s evals -p 'test_legal_claim_guard.py' -v
```

- Fictional claim: “Eine Behörde muss Anträge immer binnen 48 Stunden genehmigen.”
- Synthetic source span: “Die Behörde bestätigt den Eingang.”
- Expected: `REVIEW_REQUIRED`, `REJECTED_UNSUPPORTED`, no released claim, explicit German refusal.
- Other tests: spoofed/unverified citation; supported claim still reserved for human review.

## The trust boundary

A citation existing is not proof that it semantically entails the claim. The guard requires an independently adjudicated source-to-claim ledger (`supported_claim_ids`) that the answer-generating LLM **cannot set**. This small module enforces that release contract; it does not itself perform legal-semantic adjudication.

## Honest release status

**Existing GitLaw:** hybrid retrieval, paragraph-level citation resolution, visible uncertainty, APIs/MCP and regression suites.

**New:** narrow deterministic claim-release guard and reproducible tests (standalone).

**Not yet integrated:** the independent source/claim adjudicator, adapter into the live answer API, human-labelled legal accuracy benchmark and public-demo runtime enforcement. The existing 53/53 citation-resolution checks are **not** a legal accuracy score.

## Interview story

„Ich wollte nicht nur zeigen, dass Quellen angezeigt werden. Ich wollte einen überprüfbaren Gegenfall: Eine plausible Rechtsaussage hat eine Fundstelle, aber die Quelle trägt die Behauptung nicht. Das System darf sie dann nicht als gesicherte Rechtslage ausgeben. Der semantische Verifikationsschritt darf nicht dem Antwortmodell selbst überlassen werden.“
