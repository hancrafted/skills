---
title: 'A test spawns a child process it does not kill when an assertion fails'
enforcer: 'linter: lint, new rule that a spawn in a test file has a kill in finally or onTestFinished'
status: proposed
---

# A test spawns a child process it does not kill when an assertion fails

## Symptom

A test spawns a long-running child process with no cleanup, so a failing assertion leaves the process running after the suite.
