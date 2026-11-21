---
type: failure-mode
stale_after: 2026-12-21
title: 'A headless dogfood run cannot run the command its instructions name'
enforcer: 'check: dogfood harness allows the exact commands the index tells an agent to run'
status: proposed
---

# A headless dogfood run cannot run the command its instructions name

## Symptom

A headless claude -p run with --allowedTools had a compound command rewritten by rtk, so it needed approval and the run could not run npm run refs.
