---
type: failure-mode
stale_after: 2026-12-20
title: 'A pure module loads Node I/O through a re-exporting index'
enforcer: 'linter: lint:boundaries, new rule that a *.pure.ts imports only *.pure.ts modules or a pure index'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/76
---

# A pure module loads Node I/O through a re-exporting index

## Symptom

A `*.pure.ts` module imports a folder's `index.ts`, which re-exports I/O modules, so loading the pure module loads `node:fs` and `node:child_process` while the direct-import rule still passes.
