---
title: 'A rule exemption merges without a GEN-004 escalation or tech-debt marker'
enforcer: 'adr-checker: archgate, new GEN-004 rule that an exemption in a lint or boundary config carries a // tech-debt: marker'
status: proposed
---

# A rule exemption merges without a GEN-004 escalation or tech-debt marker

## Symptom

A Subagent narrows a new lint or boundary rule with an exemption and it merges without the Operator's acceptance, a tech-debt marker at the fence or a labelled ticket stating cost and undo.
