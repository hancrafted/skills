---
type: failure-mode
stale_after: 2026-12-21
title: "An ADR's Decision section grows past archgate's briefing cap"
enforcer: 'adr-checker: archgate check --strict in VERIFY_PLAN and COMMIT_PLAN (tools/verify/verify.pure.ts)'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/95
---

# An ADR's Decision section grows past archgate's briefing cap

## Symptom

An ADR's Decision section is longer than archgate's briefing cap and only a warning says so, so each edit can make it longer.
