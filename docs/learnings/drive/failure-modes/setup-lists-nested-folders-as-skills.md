---
type: failure-mode
stale_after: 2026-12-20
title: 'drive setup lists nested folders as skills in seen'
enforcer: 'test-runner: test, new setup scan case with a skill that has agents/ and scripts/ subfolders'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/72
---

# drive setup lists nested folders as skills in seen

## Symptom

`drive setup` scans folders below a skill's own folder and lists them as skills in `seen`.
