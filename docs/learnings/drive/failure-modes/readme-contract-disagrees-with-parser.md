---
type: failure-mode
stale_after: 2026-12-20
title: A README contract states a format its parser does not read
enforcer: 'test-runner: test, new case that the docs README equals the code template and its Off example parses'
status: proposed
---

# A README contract states a format its parser does not read

## Symptom

A README states a format its parser does not read. Review 1 findings 2 and 6b: docs/learnings/README.md said the Off list is one skill per line, but the parser read only `- ` bullets, and the README template was copied into code.
