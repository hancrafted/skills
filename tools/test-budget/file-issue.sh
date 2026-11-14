#!/bin/sh
# `tools/test-budget/file-issue.sh <title> <body>`: the Nightly workflow's one way to file a finding. Comments on the
# open issue with exactly this title, or opens it with `needs-triage`, so a finding that recurs nightly stays one issue.
# Needs GH_TOKEN; GITHUB_REPOSITORY identifies the workflow's repository.
set -eu
title=$1
body=$2
repo=${GITHUB_REPOSITORY:-hancrafted/skills}
title_json=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$title")
open=$(gh issue list --state open --search "in:title \"$title\"" --json number,title \
  --repo "$repo" --jq "[.[] | select(.title == $title_json)][0].number // empty")
if [ -n "$open" ]; then
  gh issue comment "$open" --body "$body" --repo "$repo"
else
  gh issue create --title "$title" --label needs-triage --body "$body" --repo "$repo"
fi
