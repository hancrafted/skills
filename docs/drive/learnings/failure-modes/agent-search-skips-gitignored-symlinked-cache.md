---
title: "An agent's file search skips a gitignored or symlinked cache and reports it missing"
enforcer: "test: a slow check that the index's presence test works with the agent's search tools"
status: proposed
---

# An agent's file search skips a gitignored or symlinked cache and reports it missing

## Symptom

Glob does not traverse the .references symlink and never lists .git, so an agent reads an empty result as a missing cache and stops citing.
