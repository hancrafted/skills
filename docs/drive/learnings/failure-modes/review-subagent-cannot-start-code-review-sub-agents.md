---
title: "A review Subagent cannot start the code-review skill's parallel sub-agents"
enforcer: 'review: the Orchestrator reads the review report for a missing Standards or Spec axis'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/61
---

# A review Subagent cannot start the code-review skill's parallel sub-agents

## Symptom

A Subagent that runs `/code-review` has no Agent tool, so the skill's parallel Standards and Spec sub-agents cannot start and one Subagent has to cover both axes alone.
