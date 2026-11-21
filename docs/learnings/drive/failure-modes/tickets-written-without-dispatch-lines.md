---
type: failure-mode
stale_after: 2026-12-21
title: 'Tickets are published without the lines dispatch.md requires'
enforcer: 'check: drive dispatch check run on the tickets before the Decision PR opens'
status: proposed
---

# Tickets are published without the lines dispatch.md requires

## Symptom

The Orchestrator writes tickets from the ticket skill's template and publishes them without the Files, Describes, ADRs and Evidence from lines, so the gap surfaces only after the gate.
