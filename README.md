# GitLaw ⚖️

**Verified legal AI for citizens and law firms — grounded in 5,936 German federal laws.**

GitLaw combines hybrid retrieval, a citation graph, local source verification and human review. The goal is not to make legal AI sound confident. The goal is to make useful answers inspectable.

[![Citation eval: 53/53](https://img.shields.io/badge/citation_eval-53%2F53-brightgreen)](gitlaw_mcp/tests/cases.json)
[![MCP CI](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml/badge.svg)](https://github.com/mikelninh/gitlaw/actions/workflows/mcp-ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

| Explore | Link |
| --- | --- |
| **Citizen app** | [gitlaw-xi.vercel.app](https://gitlaw-xi.vercel.app/) · [GitHub Pages](https://mikelninh.github.io/gitlaw/) |
| **GitLaw Pro** | Closed beta workflow tier for law firms |
| **Recruiter map** | [`portfolio.html`](portfolio.html) — capabilities mapped to code paths |
| **Technical docs** | [Architecture](wiki/Architecture.md) · [Features](wiki/Features.md) · [Privacy](wiki/Legal-and-Privacy.md) · [Development](wiki/Development.md) |

> Solo-built by [Mikel Ninh](https://github.com/mikelninh) in Berlin. Open source where it improves trust; closed-beta workflows are being tested with a Berlin migration-law firm.

---

## The problem

German law is public, but it is not easy to navigate. Search is fragmented, references point across thousands of statutes, and generated answers can create dangerous certainty when a paragraph is missing, repealed or misquoted.

GitLaw treats **evidence and failure states as product features**:

- exact paragraph lookup before a citation is accepted
- BM25 for legal terms and paragraph references
- semantic retrieval for natural-language questions
- graph traversal across cited and related provisions
- explicit `verified`, `unknown` and `superseded` states
- human review before professional outputs are used

---

## What works today

| Surface | Current capability | Status |
| --- | --- | --- |
| **Citizen research** | Search and navigate 5,936 federal laws with hybrid retrieval and related-paragraph graph links | Live |
| **Verified explanations** | Plain-language answers whose legal citations are checked against the local corpus | Live |
| **MCP server** | Six legal research and verification tools over stdio and HTTP/SSE | Live |
| **GitLaw Pro** | Case workflows, mandate checklists, deadlines, multilingual status templates, reviewable exports and audit trails | Closed beta / pilot |
| **Cloud multi-tenancy** | Signed sessions, role boundaries and Frankfurt-hosted workflow data | Pilot architecture |
| **Scaled production use** | External security review, penetration testing and operational hardening | Not complete |

This distinction is deliberate: **live**, **pilot** and **not yet production-ready** are not treated as the same thing.

---

## Proof at a glance

| | |
| --- | --- |
| Federal laws indexed | **5,936** |
| Legal paragraphs / graph nodes | **94,178** |
| Cross-references | **200,464** |
| FAISS vectors | **98,367** |
| Citation evaluation | **53/53 hand-labelled cases passing in CI** |
| Curated high-court principles | **40** |
| Searchable decisions | **150K+** via OpenLegalData |
| Citizen UI languages | **6** |
| Pro intake languages | **5** |

Metrics are useful only when they support a real workflow. The central question remains: **can a user reach the right source, understand what is known and notice when the system is unsure?**

---

## One end-to-end workflow

A professional workflow can move through GitLaw like this:

1. **Open or import a matter**
2. **Classify the mandate type** and load the relevant required-document checklist
3. **Upload a document** and extract its text or OCR a scan
4. **Research the legal issue** with hybrid retrieval and graph navigation
5. **Verify every cited paragraph** against the local corpus
6. **Generate a reviewable status update or document**
7. **Require human approval** before external use
8. **Record the action and evidence** in the audit trail

This is the product boundary: GitLaw assists research and preparation. It does not make final legal decisions or communicate externally without review.

---

## Architecture

```text
German federal laws + case-law sources
               │
               ▼
       ingestion + normalization
               │
       ┌───────┴────────┐
       ▼                ▼
 BM25 / exact      FAISS vectors
 retrieval         semantic search
       └───────┬────────┘
               ▼
        hybrid ranker
               │
       citation graph lookup
               │
               ▼
      local citation verifier
               │
       ┌───────┴────────┐
       ▼                ▼
 citizen interface   Pro workflows
 React / TypeScript  case tools / exports
       │                │
       └───────┬────────┘
               ▼
       MCP tools + APIs + audit
```

### Core design choices

- **Retrieval is separated from generation.** Search can be inspected without trusting the model.
- **Citation verification is local and deterministic.** A generated citation must resolve against the corpus.
- **Structured outputs constrain legal workflow states.** Invalid enum values fail instead of becoming plausible text.
- **Professional actions remain bounded.** No automatic court or authority communication.
- **Failures stay visible.** Missing paragraphs, provider errors and schema mismatches are represented differently.

---

## What I personally owned

I took GitLaw from an open-ended problem to a live, testable system and made the main product and engineering decisions across:

- product scope for citizens and the law-firm pilot
- statute ingestion and paragraph-level normalization
- BM25 + FAISS hybrid retrieval
- citation graph construction and navigation
- deterministic citation verification
- MCP tool contracts and transports
- FastAPI / serverless API boundaries
- React and TypeScript workflows
- evaluation cases and CI checks
- signed sessions, auditability and privacy boundaries
- Vercel, Fly.io and AWS deployment paths

I have not yet led a large engineering team or a mature enterprise rollout. GitLaw demonstrates **end-to-end ownership of a substantial product**, while the remaining production gaps are documented rather than disguised.

---

## Trust and evaluation

A generated legal answer is useful only when the underlying evidence can be checked.

```python
# Example MCP result
verify_citation("§ 999 StGB")

{
    "verified": False,
    "reason": "paragraph_not_found",
    "law": {
        "name": "Strafgesetzbuch",
        "abbreviation": "StGB"
    },
    "hint": "StGB exists, but § 999 was not found."
}
```

The evaluation suite includes valid citations, missing paragraphs, repealed ranges and ambiguous forms. **53/53 hand-labelled cases currently pass in CI.**

Additional reliability measures include:

- JSON-schema validation for model outputs
- retries with exponential backoff and jitter
- separate validation errors and provider failures
- token, cost, latency and request logging
- PII minimization before model calls
- role and human-review boundaries for professional workflows

---

## GitLaw Pro

GitLaw Pro extends research into a case-bound workflow for law firms. The current beta includes:

- mandate-specific checklists and required documents
- deadline and status tracking
- multilingual intake and status templates
- OCR-assisted document handling
- verified research inside a client matter
- editable Word and branded PDF exports
- role-based access and signed sessions
- audit trails and privacy controls

The complete feature inventory lives in [wiki/Features.md](wiki/Features.md). Keeping it there makes this README a product and engineering overview rather than a catalogue.

---

## MCP server

The legal corpus and verification layer are exposed as Model Context Protocol tools:

- `search_laws`
- `hybrid_search`
- `verify_citation`
- `lookup_paragraph`
- `find_related_paragraphs`
- `list_laws`

Supported paths:

- local `stdio`
- HTTP/SSE deployment
- AWS ECS/Fargate reference deployment with Terraform

Run the API-key-free demonstration:

```bash
python -m gitlaw_mcp.demo
```

See [gitlaw_mcp/README.md](gitlaw_mcp/README.md) for setup and tool schemas.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 · TypeScript · Vite · Tailwind |
| Retrieval | BM25 · FAISS · OpenAI embeddings |
| Backend | FastAPI · Vercel serverless functions · Upstash Redis |
| Agent interfaces | MCP · structured tool schemas |
| Validation | Pydantic / JSON Schema · Zod |
| Knowledge graph | 94K paragraph nodes · 200K references |
| Deployment | GitHub Pages · Vercel · Fly.io · AWS ECS/Fargate · Terraform |
| Reliability | CI evals · structured logs · retry policy · cost and latency tracking |

---

## Run locally

```bash
# Citizen interface
cd viewer
npm install
npm run dev

# API and Pro workflows
npx vercel dev

# MCP demonstration without an API key
python -m gitlaw_mcp.demo
```

Full instructions: [wiki/Development.md](wiki/Development.md)

---

## Production boundaries

Before broader professional deployment, GitLaw still requires:

- external security and privacy review
- penetration testing
- hardened multi-tenant authorization tests
- operational monitoring and incident procedures
- further user evaluation with legal professionals
- clear contractual and data-processing agreements

GitLaw is a research and workflow tool. **It does not replace legal advice.** Professional outputs require review by a qualified lawyer.

---

## Documentation

- [Architecture](wiki/Architecture.md)
- [Feature reference](wiki/Features.md)
- [Privacy and legal boundaries](wiki/Legal-and-Privacy.md)
- [Development guide](wiki/Development.md)
- [Roadmap](wiki/Roadmap.md)
- [Changelog](CHANGELOG.md)

## License

[AGPL-3.0](LICENSE)
