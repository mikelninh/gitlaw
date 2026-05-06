# wiki/

Source for the GitHub Wiki at <https://github.com/mikelninh/gitlaw/wiki>.

## How to publish to GitHub Wiki

GitHub stores wikis as a separate `.wiki` git repo per project. To sync the markdown files in this folder:

```bash
# First time only — initialize the wiki by creating a Home page in the GitHub UI
# Visit https://github.com/mikelninh/gitlaw/wiki and click "Create the first page"
# (any content, will be overwritten by sync below)

# Then clone the wiki repo
cd ..
git clone https://github.com/mikelninh/gitlaw.wiki.git

# Copy markdown files
cp gitlaw/wiki/*.md gitlaw.wiki/

# Push to GitHub Wiki
cd gitlaw.wiki
git add -A
git commit -m "Sync wiki from main repo"
git push
```

## Pages

- [Home](Home.md) — overview, status, navigation
- [Architecture](Architecture.md) — tech stack, RAG pipeline, MCP server, deployment
- [Features](Features.md) — what's shipped, what's beta, what's wartend
- [Legal-and-Privacy](Legal-and-Privacy.md) — AGPL-3.0, DSGVO, OpenAI handling, AVV
- [Development](Development.md) — local setup, tests, deploy, conventions
- [Roadmap](Roadmap.md) — current sprint, next sprints, year-out vision
