---
type: failure-mode
stale_after: 2026-12-20
title: A ticket's file ownership omits files its new rule flags, so ownership is extended mid-task
enforcer: "check: new step that runs a ticket's rule over the repo and compares the flagged files with its Files line"
status: proposed
---

# A ticket's file ownership omits files its new rule flags, so ownership is extended mid-task

## Symptom

A ticket's Files line omits files its own rule flags, so ownership is extended mid-task. #82's brief missed two drive references; review 3 P2 found R1's frame-config intents pointing at docs/skills/skill-anatomy.md, owned by no ticket.
