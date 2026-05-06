#!/usr/bin/env bash
# Synct die Markdown-Files aus wiki/ ins separate GitHub-Wiki-Repo.
#
# Voraussetzung: GitHub-Wiki muss einmal initialisiert sein (UI: erste Seite
# anlegen via "Create the first page" auf
# https://github.com/mikelninh/gitlaw/wiki).
#
# Danach läuft dieses Script idempotent — ersetzt alle Pages mit dem
# aktuellen Stand aus wiki/.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_SOURCE="$REPO_DIR/wiki"
WIKI_TMP="/tmp/gitlaw.wiki"
WIKI_REMOTE="https://github.com/mikelninh/gitlaw.wiki.git"

echo "→ Klone Wiki-Repo nach $WIKI_TMP …"
rm -rf "$WIKI_TMP"
git clone "$WIKI_REMOTE" "$WIKI_TMP" 2>&1 | tail -3

echo "→ Kopiere Pages aus $WIKI_SOURCE/ …"
cp "$WIKI_SOURCE"/*.md "$WIKI_TMP"/

# wiki/README.md ist nur Meta — gehört nicht in GitHub Wiki
rm -f "$WIKI_TMP/README.md"

cd "$WIKI_TMP"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "→ Keine Änderungen, Wiki ist aktuell."
  exit 0
fi

echo "→ Committe + pushe …"
git add -A
git commit -m "sync wiki from main repo · $(date +%Y-%m-%d)"
git push origin master 2>/dev/null || git push origin main

echo "✓ Wiki synced. Aktuell auf https://github.com/mikelninh/gitlaw/wiki"
