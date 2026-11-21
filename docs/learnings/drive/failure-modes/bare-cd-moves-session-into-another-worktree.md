---
type: failure-mode
stale_after: 2026-12-21
title: "A bare cd in a check command moves the session into another Workflow's worktree"
enforcer: "hook: a PreToolUse hook flags a bare cd that leaves the session's worktree"
status: proposed
---

# A bare cd in a check command moves the session into another Workflow's worktree

## Symptom

A fact-finding command starts with cd into a sibling worktree, so later commands run in another Workflow's checkout.
