---
type: failure-mode
stale_after: 2026-12-20
title: 'A Workflow orchestrated from another repo logs its Subagents there, so drive transcript finds none'
enforcer: "test-runner: test:slow, new case where the SubagentStart hook logs to the repo that holds the Subagent's worktree"
status: proposed
---

# A Workflow orchestrated from another repo logs its Subagents there, so drive transcript finds none

## Symptom

When the Orchestrator's session runs in one repository and the Workflow's branches live in another, the SubagentStart hook logs each Subagent under the session's repository, so `drive transcript --topic` in the Workflow's repository finds no session.
