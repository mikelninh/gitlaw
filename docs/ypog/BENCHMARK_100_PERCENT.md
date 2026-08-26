# 100% policy — short version

**Yes, pursue 100% where 100% is meaningful.**

Safety, authorization, benchmark integrity, provenance and gold-label governance are hard invariants: one known violation is unacceptable.

Accuracy-style metrics are different. We maximize them on training/dev, freeze choices, then measure untouched holdouts. A published benchmark score is not allowed to become a target after we have seen its labels. If it reaches 100%, we immediately challenge it with unseen variants and an independent holdout rather than declaring the problem solved.
