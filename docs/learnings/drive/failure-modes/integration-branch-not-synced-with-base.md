---
type: failure-mode
stale_after: 2026-12-21
title: The Integration branch is never synced with the base branch, so base commits land in a retired path
enforcer: 'check: refusal in `drive pr ready` (skills/drive/scripts/pr/ready.ts, baseAheadProblem) when origin/<base> has commits the Integration branch lacks'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/95
---

# The Integration branch is never synced with the base branch, so base commits land in a retired path

## Symptom

The Integration branch never syncs the base branch, so base commits land in a retired path. Review 2 S1: origin/main 5de5bb2 (PR #85) added 28 files under docs/drive/learnings/ after this branch moved the store; git merge-tree merged cleanly and kept them in the retired store.
