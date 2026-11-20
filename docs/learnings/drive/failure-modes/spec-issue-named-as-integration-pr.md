---
type: failure-mode
stale_after: 2026-12-20
title: "The Orchestrator names a spec issue's number where the Integration PR is meant"
enforcer: 'check: new `gh pr view` lookup of every PR number a ticket or Decision doc names as a gate, failing on an issue'
status: proposed
---

# The Orchestrator names a spec issue's number where the Integration PR is meant

## Symptom

A ticket or log names an issue number as the pull request a Workflow waits on, so the wait condition points at the wrong object until someone notices.
