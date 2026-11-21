---
type: failure-mode
stale_after: 2026-12-20
title: A CLI argument is joined into a file path without a slug check
enforcer: 'test-runner: test, new case per path-forming CLI argument that rejects ../ and a non-slug value'
status: proposed
---

# A CLI argument is joined into a file path without a slug check

## Symptom

A CLI argument is joined into a file path. Review 1 finding 1: `learnings record --skill ../../escape` wrote escape/records at the repo root and `--failure ../../../pwn` wrote docs/pwn.md, both with exit 0.
