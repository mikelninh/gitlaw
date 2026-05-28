# GitLaw MCP — outcome eval

This directory is the **public, reproducible eval harness** for GitLaw MCP. It
measures the answer-quality difference between an LLM answering legal questions
*without* tools versus *with* the GitLaw MCP tools available.

The whole point: claims about anti-hallucination need data, not vibes. This is
the data.

---

## How to read the headline number

Run produces two metrics that matter:

- **Hallucination rate** — fraction of cited paragraphs that don't exist in the
  German Bundesrecht corpus. Lower is better. The MCP is designed to drive this
  to zero, because every cited § goes through `verify_citation` before the model
  uses it.
- **Expected-hit rate** — fraction of questions where the answer cited at least
  one of the paragraphs a competent legal answer would mention. Higher is better.

A useful third number: **citations per answer**. Treatment is usually lower than
baseline because the model becomes more conservative (only cites what it
verified). That's by design — but worth watching, because over-conservatism can
cost hit-rate.

## Run it yourself

```bash
cd /path/to/gitlaw
source .env.local                       # OPENAI_API_KEY
python -m gitlaw_mcp.eval.run --limit 5     # cheap smoke (~30s, ~$0.005)
python -m gitlaw_mcp.eval.run               # full 25 questions (~2 min, ~$0.05)
python -m gitlaw_mcp.eval.run --model gpt-4o   # bigger model
```

Output:
- `eval_report_<utc-timestamp>.json` — full per-question detail (input, both
  answers, every citation, verification result for each)
- `eval_summary.md` — the markdown summary that gets committed to the repo

## Question set (`questions.json`)

25 hand-labelled questions across Miete, Arbeit, Strafrecht, Erbrecht,
Familie, Grundgesetz, Zivilrecht, Datenschutz. Each comes with
`expected_paragraphs` — the canonical citation(s) we hand-verified against
gesetze-im-internet.de.

The set is intentionally biased toward **realistic Lebenslagen** a citizen,
tenant, employee, or harassment victim would actually ask — not law-school
exam questions. Adding harder long-tail questions (less-common statutes
where the baseline model is more likely to invent) is on the roadmap; those
will widen the gap further.

## Latest run (committed)

See [`eval_summary.md`](./eval_summary.md). It's regenerated on every run and
the most recent committed version is the public record. Past runs sit in git
history.

## What the eval cannot show

Honest limits:

- **One language only (German).** A multilingual eval would need a multilingual
  question set + ground truth in each language.
- **One model class.** We test `gpt-4o-mini` by default. The gap widens with
  weaker models (e.g. `gpt-3.5-turbo`) and narrows with stronger ones
  (`gpt-4o`, Claude Opus). The `--model` flag lets you check.
- **Hit-rate is binary per question.** We don't yet score "partial hit"
  (cited a related but adjacent §).
- **Citation extraction is regex-based.** Models sometimes phrase citations
  in ways our regex misses — that under-counts citations for both conditions
  equally, but distorts absolute hit-rate downward.

These are known. Patches welcome.

## License

Same as the rest of GitLaw MCP — MIT.
