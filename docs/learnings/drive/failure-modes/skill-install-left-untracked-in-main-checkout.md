---
type: failure-mode
stale_after: 2026-12-20
title: 'A skill install in the main checkout stays untracked, so worktrees bind nothing'
enforcer: 'check: new failure in `drive setup --check` when a bound skill or skills-lock.json is untracked'
status: proposed
---

# A skill install in the main checkout stays untracked, so worktrees bind nothing

## Symptom

Skills installed in the main checkout are never committed, so worktrees and clones do not see them and setup binds nothing for the phases they serve.
