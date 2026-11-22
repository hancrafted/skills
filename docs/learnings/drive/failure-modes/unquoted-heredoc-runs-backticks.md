---
type: failure-mode
stale_after: 2026-12-22
title: A task brief is written with an unquoted heredoc, so its backticks run as commands
enforcer: 'hook: new PreToolUse hook that refuses a Bash heredoc into .scratch/ whose delimiter is unquoted and whose body holds backticks'
status: proposed
---

# A task brief is written with an unquoted heredoc, so its backticks run as commands

## Symptom

TODO: what an Operator or reviewer observes.
