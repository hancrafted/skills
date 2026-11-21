---
type: failure-mode
stale_after: 2026-12-21
title: 'skill instructions assume an optional project input is present'
enforcer: 'test-runner: test:slow, skills/drive/scripts/core/settings.slow.test.ts fails on any setting name drive markdown mentions that the config code does not list'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/95
---

# skill instructions assume an optional project input is present

## Symptom

Define tells the Orchestrator to read the file grill.format names, but project.yml has no such key and the file is absent, so the grill runs in another format.
