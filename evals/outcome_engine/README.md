# Outcome Engine evaluation

The benchmark deliberately contains easy, ambiguous, and adversarial synthetic
authority letters. It measures engineering reliability, not legal quality.

Current case families:

- explicit deadlines;
- relative deadlines;
- multiple dates;
- missing case references;
- positive/negative decisions;
- poor OCR;
- demanded-document extraction;
- prompt injection inside a document.

Before a paid pilot, a lawyer should add 20–50 anonymised real documents and
sign off the gold labels. Keep a locked holdout set so prompt changes cannot
quietly overfit the demo.
