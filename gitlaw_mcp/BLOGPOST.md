# Blogpost Outline — "I taught Claude German law (and made it admit when it doesn't know)"

Working title. Pick a tighter one once the draft is done.

Audience: technical-curious people interested in MCP, German legal-tech folks,
recruiters for AI engineering / Forward-Deployed Engineer roles. Voice: same
as the rest of the repo — direct, warm, no marketing-Deutsch.

Target length: 800–1,200 words. One scroll on a phone. No hero animations.

---

## Hook (≈ 80 words)

Open with the failure mode everyone has seen but few have named.

> Ask ChatGPT to cite a German law and roughly one in four answers will be
> confidently wrong. Made-up paragraph numbers. Swapped statutes. Paragraph
> titles that don't exist. The model is not lying — it's pattern-matching.
> When you build with LLMs in a regulated domain, this is the wall.
>
> Last weekend I shipped a small thing that puts a hand on that wall.
> It's called GitLaw MCP.

## What it is (≈ 120 words)

- One Python process. ~700 lines.
- Exposes German federal law to any MCP client (Claude Desktop, Cursor, custom agents).
- 5,936 statutes indexed. 107k paragraph-level chunks. 94k-node citation graph.
- Six tools, one resource.
- The killer tool is `verify_citation`: returns either the *actual paragraph
  text* or a structured `verified: false` with a reason.

Embed a short code block showing the JSON shape of a verified vs. rejected citation.

## Why anti-hallucination is the actual feature (≈ 200 words)

This is the section that earns trust with legal-tech readers.

- LLMs are great at language, bad at deference.
- "I don't know" is the rarest token in the training distribution.
- A grounded tool gives the LLM a way to say "I checked — that one's fake."
- This shifts the failure mode from confident-wrong to honest-uncertain. Which is
  the only failure mode a lawyer can work with.

Quote one or two of the hallucination tests from the eval suite verbatim. Show
that the rejection is structured, not just an apology.

## What I learned building this (≈ 250 words)

This is the section recruiters and FDE-interested readers actually read.
Three honest takes:

1. **MCP is closer to a protocol than a framework.** The hard part isn't the
   `@mcp.tool()` decorator. It's deciding what the tool's surface area should
   be — small enough that an LLM can compose with it, big enough that it
   doesn't have to chain ten calls for one answer.
2. **Tests-as-data beat tests-as-code in eval-heavy domains.** All 118 cases
   live in JSON. Adding a new edge case is a one-line PR, not a code change.
   This is the pattern I'd carry into any future agent system.
3. **Distribution is the work.** The code was ready in a weekend. Making it
   genuinely installable in two minutes — that was the actual project. The
   moment I stopped optimising the FAISS index and started writing the
   `Quickstart` block, it became real.

## Try it (≈ 150 words)

- One paragraph: clone, `pip install -e`, build the vectorstore, paste a JSON
  block into Claude Desktop config, restart, ask a legal question.
- Link to the repo. Link to a 30-second screen recording (gif) of the
  install-to-first-query loop.
- Two example queries that show the range:
  - "Verifiziere § 573 Abs. 2 BGB" → real text returned
  - "Verifiziere § 999 StGB" → `verified: false, reason: paragraph_not_found`

## Roadmap (≈ 100 words)

Stay honest about limits.
- Nested `Abs. X Nr. Y` parsing — known gap, on the list.
- Landesrecht — currently federal-only.
- Live deployment with SSE for hosted agents (Fly.io Frankfurt) — wired in
  code, parked behind a billing decision.
- Two sibling projects in the same shape: SafeVoice (digital-harassment
  tooling for victims), GrailSense (collector intelligence over Blockscout).
  Same MCP pattern, different domains — the playbook is the actual asset.

## Closing (≈ 60 words)

End the way you started — small, direct, no theatrical framing.

> The interesting question for the next year isn't *which model is smarter.*
> It's *whose tools the models will reach for.* Building one of those tools,
> in a domain that matters, is the cheapest way I know to find out whether
> you actually like this work. Turns out I do.

---

## Where to publish

Priority order:
1. **Personal blog** (own domain, full control, anchors the canonical URL)
2. **LinkedIn article** — the audience you want for FDE roles is here
3. **dev.to / Hashnode** — cross-post a week later for SEO long-tail
4. **X/Twitter** — thread with the punch lines, link back
5. **Newsletter pitch** — TLDR AI, Pragmatic Engineer (long shot), Deutsche AI-Newsletter

## What to attach

- 30-second GIF of install + first query (record once, reuse everywhere)
- Repo link, pinned on GitHub profile
- Eval report (`tests/eval_report.json`) screenshot — proves the 118/118
- One soul-card / one citation card for visual interest

## Don't do

- Don't lead with the model used or the framework. The story is the *workflow
  agent-readable*, not the tool used to express it.
- Don't post until the directory PR is merged. The blogpost converts; the
  directory entry validates.
- Don't list every tool in the body — that's what the README is for.
