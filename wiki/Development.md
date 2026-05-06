# Development

How to run, test, and contribute.

## Prereqs

- Node 20+ (LTS) — for viewer and api
- Python 3.10+ — for parser, rag, gitlaw_mcp
- An OpenAI API key (for AI features; without it, search-only mode works)

## Local dev

### Citizen viewer

```bash
cd viewer
npm install
npm run dev    # http://localhost:5173
```

### Pro tier

Same as citizen — use `#/pro?invite=DEMO` to bypass beta-token-gate locally.

```bash
cd viewer
npm run dev
# open http://localhost:5173/#/pro?invite=DEMO
```

### API (Vercel functions)

```bash
cd /Users/mikel/gitlaw    # repo root
npx vercel dev             # http://localhost:3000/api/*
```

Requires `OPENAI_API_KEY` in `.env.local` — see `.env.example` for the full list.

### Parser (rebuild law corpus)

```bash
cd parser
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python fetch_laws.py        # ~30 min for full 5,936 laws
python chunk.py             # rebuild paragraph index
```

### RAG (rebuild embeddings)

```bash
cd rag
pip install -r requirements.txt
python build_index.py       # ~15 min for 98K vectors at OpenAI embed rate
```

Index files (`vectorstore/index.faiss` + `index.pkl`) are gitignored — they're regenerated locally and bundled into the app at build-time.

### MCP server

```bash
cd gitlaw_mcp
pip install -r requirements.txt
python -m gitlaw_mcp.server
```

For Claude Desktop integration, add to your Claude config:

```json
{
  "mcpServers": {
    "gitlaw": {
      "command": "python",
      "args": ["-m", "gitlaw_mcp.server"],
      "cwd": "/path/to/gitlaw"
    }
  }
}
```

## Tests

### Citation verifier eval (CI-gated)

```bash
python -m scripts.eval.citation_verifier_eval
```

53 hand-labelled cases. CI fails on any regression.

### Citizen Q&A clarification synthetic tests

```bash
node scripts/test_citizen_clarifications.mjs
```

Tests the citizen RAG pipeline with synthetic legal questions. Pass-rate threshold: 90%.

### Frontend tsc

```bash
cd viewer
npx tsc --noEmit
```

### MCP eval

```bash
cd gitlaw_mcp
pytest tests/
```

## Commit style

Conventional commits with German messages where appropriate (this is a German legal-tech project for German users):

```
feat(pro): Modul B — 8-Stati + Sachstands-Generator
fix(citizen): RAG-Pfad host-aware auf Vercel
docs(bao): §15 Advoware-Integration mit 4-Stufen-Realität
chore: archive outdated planning docs
```

Co-author your commits with the AI assistant who helped:
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## Deploy

### Citizen tier (GitHub Pages)

Auto-deploys on push to `main` via `.github/workflows/deploy.yml`.

### Pro tier + APIs (Vercel)

Auto-deploys on push to `main` (if Vercel-GitHub integration is healthy). Manual fallback:

```bash
vercel --prod --yes
```

Bundle hash check (verify deploy worked):

```bash
curl -sH "Cache-Control: no-cache" "https://gitlaw-xi.vercel.app/?cb=$(date +%s)" | grep -oE 'index-[A-Za-z0-9_-]+\.js'
```

## Project conventions

- See [AGENTS.md](https://github.com/mikelninh/gitlaw/blob/main/AGENTS.md) — repo priorities and collaboration rules
- See [CLAUDE.md](https://github.com/mikelninh/gitlaw/blob/main/CLAUDE.md) — Claude Code conventions for this repo

## Known issues

- **Vercel Functions 10s timeout** affects OCR on PDFs > 10 pages. Mitigation: client-side splitting or background worker (Sprint 3 plan).
- **Cold-start latency** on first request after idle (~1-2s). Acceptable for legal-research use case.
- **localStorage size limits** (~5-10MB per origin) — Pro Cloud-Sync mitigates by pushing to Upstash.

## Contributing

This is a one-developer project (Mikel Ninh, Berlin). External PRs welcome but I review slowly. For substantial changes, open an issue first.

License contributions under AGPL-3.0 or compatible.
