---
type: failure-mode
stale_after: 2026-12-20
title: An ADR carries rule markers for rules that do not exist yet
enforcer: 'adr-checker: archgate, GEN-001 adr-rule-mentions'
status: proposed
---

# An ADR carries rule markers for rules that do not exist yet

## Symptom

An ADR carries a rule marker for a rule that does not exist yet, and GEN-001 fails it. The workaround was a `planned rule:` marker, a departure from the GEN-001 form (skill-governance record, 2026-11-20).
