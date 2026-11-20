---
title: 'A test named after a pure module spawns the CLI'
enforcer: 'adr-checker: archgate, new ARCH-003-testing rule that a *.pure.*test.ts never imports node:child_process'
status: proposed
---

# A test named after a pure module spawns the CLI

## Symptom

A test file named as the sibling of a `*.pure.ts` module runs the CLI instead of the pure module, so its name misleads and it sits in the wrong lane.
