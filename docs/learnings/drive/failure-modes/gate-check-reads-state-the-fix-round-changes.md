---
type: failure-mode
stale_after: 2026-12-22
title: A gate check designed against the reviewed state fails after the fix round changes that state
enforcer: 'check: drive review quotes (reads the Reviewed: sha)'
status: proposed
---

# A gate check designed against the reviewed state fails after the fix round changes that state

## Symptom

`drive pr ready` refuses a review report whose quotes were true when the reviewer read them but are gone after the fix round, or whose branch-only files are missing from the checkout it runs in. Every review, fix, ready cycle with a contradiction fails.
