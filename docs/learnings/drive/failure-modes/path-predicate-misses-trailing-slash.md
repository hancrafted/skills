---
type: failure-mode
stale_after: 2026-12-21
title: 'A path predicate fails on a trailing-slash input and has no fast test'
enforcer: 'test-runner: new pure unit test of the predicate in the pure module'
status: fixed
fixed-by: https://github.com/hancrafted/skills/pull/92
fixed-on: 2026-11-21
---

# A path predicate fails on a trailing-slash input and has no fast test

## Symptom

isUnder lived in the script, covered only by a slow test, and returned false for a subfolder written with a trailing slash.
