---
type: failure-mode
stale_after: 2026-12-20
title: 'A test waits on a fixed sleep instead of the event it needs'
enforcer: 'linter: lint, new rule against setTimeout sleeps in test files'
status: proposed
---

# A test waits on a fixed sleep instead of the event it needs

## Symptom

A test sleeps for a fixed time to let a child process act, so it is slow when the child is fast and flaky when the child is slow.
