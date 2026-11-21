---
type: failure-mode
stale_after: 2026-12-20
title: A ticket's blocked-by flag is lost to shell word splitting and the ticket is created unblocked
enforcer: 'test-runner: test, new case that a created ticket lists its blocker'
status: proposed
---

# A ticket's blocked-by flag is lost to shell word splitting and the ticket is created unblocked

## Symptom

A ticket is created without its blocker. `gh issue create ${3:+--blocked-by $3}` passed the flag as one word in zsh, so #80 had no blocker until it was fixed by hand.
