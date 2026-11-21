---
type: failure-mode
stale_after: 2026-12-21
title: 'Tickets are published without the lines dispatch.md requires'
enforcer: 'check: Reason step 3 runs drive dispatch check on the filed tickets before the Decision PR opens'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/95
---

# Tickets are published without the lines dispatch.md requires

## Symptom

The Orchestrator writes tickets from the ticket skill's template and publishes them without the Files, Describes, ADRs and Evidence from lines, so the gap surfaces only after the gate.
