---
title: 'A Subagent reports check failures from its worktree setup as failures of the code'
enforcer: 'check: new `drive worktree new` readiness check that runs the gate once on the fresh worktree before the Subagent starts'
status: proposed
---

# A Subagent reports check failures from its worktree setup as failures of the code

## Symptom

A Subagent reports a check as failing when the failure comes from its worktree's setup, so the Orchestrator re-runs the checks on the Integration branch to tell the two apart.
