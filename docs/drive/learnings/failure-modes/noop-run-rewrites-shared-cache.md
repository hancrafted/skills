---
title: 'A no-op run writes to a cache shared by every worktree'
enforcer: 'test-runner: new slow test that a re-run at the pinned commit leaves the cache index untouched'
status: proposed
---

# A no-op run writes to a cache shared by every worktree

## Symptom

Every npm run refs, pre-push included, re-ran git sparse-checkout and rewrote the shared cache index, so concurrent runs can collide on index.lock.
