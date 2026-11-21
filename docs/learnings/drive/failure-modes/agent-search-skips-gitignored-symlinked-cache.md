---
type: failure-mode
stale_after: 2026-12-21
title: "An agent's file search skips a gitignored or symlinked cache and reports it missing"
enforcer: 'test-runner: new slow test that the index presence test works with the agent search tools'
status: fixed
fixed-by: https://github.com/hancrafted/skills/pull/92
fixed-on: 2026-11-21
---

# An agent's file search skips a gitignored or symlinked cache and reports it missing

## Symptom

Glob does not traverse the .references symlink and never lists .git, so an agent reads an empty result as a missing cache and stops citing.
