# Trust statement — what GitLaw MCP guarantees, what it doesn't, and how to verify

This document exists because *"verified by AI"* is not a claim — it's a promise.
A promise that's only worth what the evidence behind it is worth. So here's the
evidence, the honest scope of what's currently provable, and the roadmap for
closing the gaps.

If anything in this document drifts from the code, **the code wins** — file a
GitHub issue and we'll update.

---

## What we guarantee today (verifiable now)

### 1. Every served paragraph has a public source URL

For each of the **~5,940 laws** in our corpus, the manifest records the URL on
gesetze-im-internet.de that the law originated from. Call `verify_law_provenance(abbr)`
on the MCP server, or open `gitlaw_mcp/freshness/manifest.json` in the repo —
you get the source URL for every single law.

### 2. The corpus has a public, single-number integrity hash

`manifest.json` contains an `aggregate_sha256` — one hex string that's the
SHA-256 over all per-law content hashes. If any law in the corpus changes by
even one byte, this hash changes. Two consumers running the same commit see
the same hash. Drift is impossible to hide.

Verify yourself:

```bash
git clone https://github.com/mikelninh/gitlaw
cd gitlaw
python -m gitlaw_mcp.freshness.build_manifest --check
# exit 0 == corpus matches the committed manifest
# exit 1 == drift detected, with a precise diff in the error output
```

### 3. The git history is the audit log

Every change to a law file is a git commit. `git log --follow laws/bgb.md`
shows the entire history of edits to the BGB. We don't rewrite history; we
don't force-push to main. Provenance is the git tree.

### 4. Every § citation an MCP-driven LLM emits is corpus-verified

`verify_citation()` does not return `verified: true` unless the cited paragraph
exists in the corpus *at this exact commit*. The eval harness in `eval/` measures
this empirically: on the latest committed run, hallucination rate is 0%.

---

## What we do NOT yet guarantee (honest gaps)

### 1. Byte-equivalence with gesetze-im-internet.de today

Our corpus is markdown derived from upstream XML at some point in the past.
There is **no automated re-fetch** running yet. If a law changed at the
source last week, our copy may still be the older version. We know this is
a gap; it's the next item on the freshness roadmap below.

### 2. Per-paragraph "in force since" dates

We track *when our file was last modified in git*, not *when the §
became effective in German law*. For Lebenslagen-style answers ("can I
file?") this rarely matters — but for time-sensitive disputes
("which version of § 558 BGB applied in Q2 2024?") it does.

### 3. Landesrecht and EU regulations

The current corpus is **federal German law only** (Bundesrecht). Landesrecht
(state law, e.g. Berliner Schulgesetz) and EU regulations (e.g. EU261, DSGVO
in its EU form) are not yet indexed.

### 4. Subsection-level deep parsing

The corpus is paragraph-indexed. We parse `§ 573 BGB` accurately, but
`§ 573 Abs. 2 Nr. 2 BGB` falls back to flat lookup — the nested Abs./Nr. is
on the parser roadmap.

---

## Roadmap to closing the gaps

Items here are intentionally specific so they're testable as "done" vs "promised".

### Phase 1 — Daily sync (planned, ~1 weekend of work)

A scheduled GitHub Action runs `python -m gitlaw_mcp.freshness.sync` daily.
For each law, it:

1. Fetches the official XML from gesetze-im-internet.de
2. Parses it through the same normaliser our corpus uses
3. Diffs against the local markdown
4. If different: writes the new markdown, updates the manifest, opens a PR
   with a human-readable diff (one PR per drift day, automatically labelled)
5. Logs to `freshness/sync_log.md` (committed, public)

Result: maximum staleness is 24 hours. Anyone can see "last sync ran at X,
N laws changed, here's the PR with the diff."

### Phase 2 — In-force tracking (~2 weekends)

Per-paragraph metadata: `in_force_since`, `in_force_until` parsed from
gesetze-im-internet.de's "in der Fassung von …" annotations. Enables
historical queries.

### Phase 3 — Landesrecht + EU (~1 month per layer)

Each Bundesland publishes its own gesetze-portal (Hamburg, Bayern, Berlin,
…). Pattern is identical to federal sync — just more data sources to
register.

### Phase 4 — Notarised manifest snapshots

Weekly Hugging Face Datasets release of the corpus + manifest, with a
detached signature. Anyone can pin to a specific snapshot for
reproducibility ("we use gitlaw-corpus-2026-W21").

---

## How a careful reader can audit any single answer today

Suppose an LLM connected to this server tells you: *"§ 574 BGB gives you a
right to object to an Eigenbedarf eviction within two months of notice."*

To audit:

1. Call `verify_citation("§ 574 BGB")` → must return `verified: true` with the
   actual paragraph text. **If it doesn't, the LLM hallucinated and the MCP
   correctly refused to confirm.**
2. Call `verify_law_provenance("BGB")` → returns the source URL, the file
   path in the repo, and the corpus hash. **Click the URL — read the BGB
   yourself.**
3. Open `gitlaw_mcp/freshness/manifest.json` in the repo, search for `"BGB"`
   → confirm the same hash. **The number on your screen and the number in
   the repo match, or they don't.**
4. `git log laws/bgb.md` → see every edit ever made. **No mysterious changes.**

That's the trust chain. Four steps, all public, all reproducible from any
machine.

---

## One thing we will never do

We will not silently mark something `verified: true` based on a model's
confidence, a heuristic, or a vendor's claim. `verified: true` means "this
exact paragraph is in the corpus at this exact commit, and you can
re-hash the file to prove it." Anything weaker than that gets a
`verified: false` with a structured reason.

That's the floor. We can always raise it. We won't lower it.

---

## License

This document and the underlying scaffolding are MIT-licensed. The corpus
itself is public domain (German federal law has no copyright per § 5
UrhG).
