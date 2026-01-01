#!/usr/bin/env bash
# Publish the site as ONE commit that carries no personal metadata: the GitHub no-reply identity,
# a fixed timestamp (no working hours or time zone), and no history. Run on your own machine from
# the repository root:   scripts/publish.sh
# It rebuilds, replaces main with a single "Deploy" commit and force-pushes it. Nothing is kept in
# git history, so keep your own copy of the source if you want older versions.
set -euo pipefail
NAME="millardr"
EMAIL="140952645+millardr@users.noreply.github.com"
STAMP="2026-01-01T00:00:00Z"

python3 scripts/build_site.py >/dev/null
node scripts/tests/site_check.cjs | tail -1

tmp="publish-$$"
git checkout -q --orphan "$tmp"
git add -A
GIT_AUTHOR_NAME="$NAME" GIT_AUTHOR_EMAIL="$EMAIL" GIT_COMMITTER_NAME="$NAME" GIT_COMMITTER_EMAIL="$EMAIL" \
GIT_AUTHOR_DATE="$STAMP" GIT_COMMITTER_DATE="$STAMP" git commit -q -m "Deploy"
git push -f origin "$tmp:main"
git checkout -q -B main "$tmp"
git branch -D "$tmp" >/dev/null
git reflog expire --expire=now --all
git gc -q --prune=now
echo "Published: $(git log --format='%h %an <%ae> %ad' -1)"
