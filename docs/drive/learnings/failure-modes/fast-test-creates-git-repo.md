---
title: 'A fast test creates a git repository on disk'
enforcer: 'adr-checker: archgate, new ARCH-003-testing rule that a fast *.test.ts never runs git init'
status: proposed
---

# A fast test creates a git repository on disk

## Symptom

A test in the fast suite creates git repositories on disk, against ARCH-003-testing §4.3, and slows every run of `npm run verify`.
