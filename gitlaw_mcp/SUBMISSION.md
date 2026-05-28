# Anthropic MCP Directory — Submission Draft

This file is the working draft for submitting **gitlaw-mcp** to the official
Model Context Protocol servers list. The canonical registry lives at:

  https://github.com/modelcontextprotocol/servers

The standard submission path is a pull request that adds a row to the README
table (community servers section). Use the body below as your PR description.

---

## PR title

```
docs(community): add gitlaw-mcp — German federal law lookup, search, and citation verification
```

## README row to add

In `README.md` under the community servers list:

```markdown
- **[GitLaw](https://github.com/mikelninh/gitlaw/tree/main/gitlaw_mcp)** —
  German federal law (Bundesrecht) lookup, semantic search across 5,936
  statutes, and anti-hallucination citation verification. Returns real
  paragraph text or a structured "not found" reason — built for legal
  agents that need to ground every § they cite.
```

(Keep the row to one entry — the upstream README is alphabetised and tight.)

## PR description (paste into the PR body)

> **What is GitLaw?**
> A Model Context Protocol server that exposes the entirety of German
> federal law (5,936 statutes, ~107,000 paragraph-level chunks) as tools any
> MCP client can call. It's the first German-language legal MCP server in
> the directory.
>
> **Why it matters.**
> LLMs hallucinate German law confidently — invented paragraphs, swapped
> statutes, fabricated subsection text. GitLaw exposes a `verify_citation`
> tool that returns either the *actual* paragraph text or a structured
> `verified: false` with one of three reasons (`paragraph_not_found`,
> `law_not_found`, `could_not_parse`). Agents get a hard signal on every
> § they cite.
>
> **Tools exposed (6):**
> - `search_laws(query, limit)` — semantic search via FAISS + OpenAI embeddings
> - `verify_citation(citation)` — anti-hallucination verification
> - `lookup_paragraph(abbreviation, number)` — direct lookup
> - `list_laws(filter, limit)` — enumerate the 5,936 indexed statutes
> - `find_related_paragraphs(citation)` — citation-graph traversal (94k nodes / 200k edges)
> - `hybrid_search(query, limit, expand)` — semantic + 1-hop graph expansion
>
> Plus one resource: `gitlaw://law/{abbreviation}` → full markdown of any law.
>
> **Quality signals:**
> - 118/118 eval tests passing (`pytest gitlaw_mcp/tests/`)
> - Covers citation parsing, hallucination rejection, content correctness,
>   graph edges, semantic search across 10 real Lebenslagen, adversarial
>   inputs, latency budget
> - Honest about limits: nested `Abs. X Nr. Y` parsing on roadmap
>
> **Transport:** stdio (default) and SSE for hosted deployments.
> **Install:** `pip install -e gitlaw_mcp` + Claude Desktop JSON config — see README.
>
> **Data source:** publicly available federal German law corpus, parsed to
> markdown with paragraph-level granularity. No proprietary content.
>
> **License:** MIT.

## Checklist before opening the PR

- [ ] All 118 tests passing on a fresh clone: `pytest gitlaw_mcp/tests/`
- [ ] README `Quickstart` block copy-pastes cleanly into Claude Desktop config
- [ ] GitHub repo public, README is the landing page
- [ ] Repo has a license file (MIT)
- [ ] Repo has `topics`: `mcp`, `mcp-server`, `claude`, `german-law`, `legal-tech`, `rag`, `faiss`
- [ ] Demo screenshot or short GIF in README (helps reviewers)
- [ ] One sample tool call shown end-to-end in the README

## Tags to apply (GitHub repo settings → About)

```
mcp-server  claude  mcp  llm-tools  german-law  legal-tech
rag  faiss  openai  anti-hallucination  citation-verification
```

## After the PR is merged

1. Pin the repo on your GitHub profile.
2. Post the announcement (see `BLOGPOST.md` outline).
3. Cross-post to:
   - r/LocalLLaMA (the dev crowd)
   - r/MachineLearning (academic crowd, weekend self-promo thread)
   - X/Twitter — tag `@AnthropicAI` and the German legal-tech community
   - LinkedIn — your network specifically
   - News.ycombinator.com — `Show HN: GitLaw MCP — German law for LLM agents`
4. Submit to Awesome MCP lists:
   - https://github.com/punkpeye/awesome-mcp-servers
   - https://github.com/wong2/awesome-mcp-servers
