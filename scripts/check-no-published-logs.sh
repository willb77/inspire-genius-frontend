#!/usr/bin/env bash
#
# Fail if the project logs are tracked in this repository.
#
# This repo is public and Vite copies `public/` verbatim into `dist/`, which CI
# syncs to the S3 bucket behind CloudFront. So a file committed there is served to
# anyone with the URL — the super-admin gate is on the *page* that displays it,
# never on the file. The logs were mirrored here until 2026-08-17, which left
# IG_project_log.html returning HTTP 200 and 2.75 MB unauthenticated on both the
# stable and dev domains (#453 removed them).
#
# Removing them once was not enough: many branches predate the removal and still
# carry them, so any one merged or rebased forward puts the log back on the public
# internet with no error and no failing test. Something has to refuse to accept it
# back — this script, called from two places:
#
#   .github/workflows/no-published-logs.yml   fast PR feedback
#   .github/workflows/ci-deploy.yml           gates deploy-dev / deploy-staging-b
#
# The second matters because those are separate workflows: GitHub cannot make a
# deploy job in one depend on a job in the other, so without an in-pipeline gate a
# push to `development` deploys regardless of the guard workflow's result.
#
# Run it locally exactly as CI does:
#     ./scripts/check-no-published-logs.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Tracked files only. A local uncommitted copy is a working-tree concern — it
# cannot reach CloudFront, and the retired monorepo sync used to leave exactly
# that lying around, so failing on it would be noise.
#
# Pathspecs: a leading '*' matches across directory separators, so each of these
# catches the file at the repo root or nested anywhere. ':(icase)' because
# CHANGELOG.md is at least as likely as change_log.md.
FOUND=$(git ls-files -- \
  ':(icase)*IG_project_log.html' \
  ':(icase)*change_log.md' \
  ':(icase)*changelog.md' \
  ':(icase)*project_log*.html' \
  'public/*.md' \
  || true)

if [ -n "$FOUND" ]; then
  echo "::error title=Project log must not be republished::These files are served publicly from this repo and were removed in #453."
  echo ""
  echo "The following tracked file(s) would republish the project log:"
  echo "$FOUND" | sed 's/^/  - /'
  echo ""
  echo "This repo is PUBLIC, and public/ is copied verbatim into dist/ and deployed"
  echo "to CloudFront, so committing any of these serves the whole project log at"
  echo "https://<host>/IG_project_log.html to anyone with the link."
  echo ""
  echo "To fix — delete it rather than adding it to .gitignore:"
  echo "    git rm --cached <path> && git commit"
  echo ""
  echo "If you got these by merging or rebasing an older branch, the file came back"
  echo "with it; that is the common case, not a deliberate add. The full log lives in"
  echo "the private monorepo, whose mirror targets are retired — do not commit the"
  echo "output of any script that regenerates them here."
  exit 1
fi

echo "OK — no project-log files tracked in this repo."
