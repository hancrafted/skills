---
type: failure-mode
stale_after: 2026-12-20
title: A test run inherits GIT_DIR and rewrites the host repo's config (core.bare=true)
enforcer: "test-runner: test:slow, new case asserting the main checkout's core.bare is false after the suite"
status: proposed
---

# A test run inherits GIT_DIR and rewrites the host repo's config (core.bare=true)

## Symptom

The main checkout's .git/config reads `core.bare=true` after a test or parallel Subagent run. It happened twice, GIT_DIR inheritance was proven possible and the cause was not found. Review 2 S5: tests/harness-hooks.test.ts:19 passes inherited GIT_* to a real drive guard.
