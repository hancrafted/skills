---
type: failure-mode
stale_after: 2026-12-21
title: An ADR's description breaks its YAML front matter, so archgate lists the ADR as unparsed
enforcer: 'adr-checker: archgate check --strict in VERIFY_PLAN and COMMIT_PLAN (tools/verify/verify.pure.ts)'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/95
---

# An ADR's description breaks its YAML front matter, so archgate lists the ADR as unparsed

## Symptom

archgate lists an ADR as unparsed. The SKL-002 description held an unescaped apostrophe in single-quoted YAML, and stayed unparsed until #80 fixed it.
