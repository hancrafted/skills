---
type: failure-mode
stale_after: 2026-12-20
title: A Subagent's report gives a figure counted another way than the rule it cites
enforcer: "check: new step that recomputes a reported figure with the rule's own count before a report is accepted"
status: proposed
---

# A Subagent's report gives a figure counted another way than the rule it cites

## Symptom

A Subagent's report gives a figure counted another way than the rule it cites. Review 3 S4/S5: #97 reported token estimates from bytes / 4 while SKL-001 says ceil(characters / 4); the figure was re-measured by the rule and passed.
