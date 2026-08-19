#!/usr/bin/env bash
#
# Fail if the project logs reappear in this repository.
#
# This repo is public and `public/` ships verbatim into the Vite build and onto
# CloudFront, so a file placed there is served to anyone with the URL — the
# super-admin gate is on the *page* that displays it, never on the file. The logs
# were mirrored here until 2026-08-17, which left IG_project_log.html returning
# HTTP 200 and 2.75 MB unauthenticated on both the stable and dev domains.
#
# They were removed, but ~266 branches predate the removal and still carry them.
# Merging any one of those resurrects the file and the next deploy republishes it,
# silently — which is exactly what this guard exists to prevent.
#
# Run it locally the same way CI does:
#     ./scripts/check-no-published-logs.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0
report() {
  fail=1
  echo "::error file=$1::$2"
  echo "  FORBIDDEN  $1"
  echo "             $2"
}

# 1. The specific files that used to be mirrored here.
for f in IG_project_log.html public/IG_project_log.html change_log.md; do
  [ -e "$f" ] && report "$f" "a project log was re-added to a public repo; it belongs only in the private monorepo"
done

# 2. The same content under any other name. `public/` is the part that actually
#    reaches the CDN, so anything log-shaped landing there is treated the same.
while IFS= read -r f; do
  [ -n "$f" ] && report "$f" "log-shaped file in public/ — public/ is served unauthenticated from CloudFront"
done < <(find public -type f \( -iname "*project_log*" -o -iname "*change_log*" -o -iname "*changelog*" \) 2>/dev/null || true)

# 3. No Markdown in public/ at all. Nothing legitimate ships .md to the CDN today
#    (only .html and assets), and change_log.md arriving that way is the likeliest
#    form of this regression.
while IFS= read -r f; do
  [ -n "$f" ] && report "$f" "Markdown in public/ — not served as a page, and the usual way a changelog gets published by accident"
done < <(find public -type f -iname "*.md" 2>/dev/null || true)

if [ "$fail" -ne 0 ]; then
  cat >&2 <<'EOF'

The project log is deliberately not published from this repository.

If you hit this after merging or rebasing an older branch, the file came back
with it — delete it rather than re-adding it to .gitignore:

    git rm --cached IG_project_log.html public/IG_project_log.html change_log.md
    rm -f IG_project_log.html public/IG_project_log.html change_log.md

The full log lives in the private monorepo. Background: CLAUDE.md, and
.claude/rules/session-logging.md in that repo.
EOF
  exit 1
fi

echo "OK: no project logs published from this repo"
