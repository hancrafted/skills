---
type: failure-mode
stale_after: 2026-12-20
title: A fix task edits a Decision doc that the commit gate blocks off a decisions branch
enforcer: 'check: new step that lists the Decision docs a fix touches in its task brief and routes them to a Decision PR'
status: proposed
---

# A fix task edits a Decision doc that the commit gate blocks off a decisions branch

## Symptom

A review fix reaches a Decision doc (skills/learnings/GLOSSARY.md:9) and the pre-commit gate refuses the commit off a decisions branch. The fix was deferred to #102 (review 3 P3).
