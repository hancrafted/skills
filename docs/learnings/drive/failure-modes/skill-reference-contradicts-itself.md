---
type: failure-mode
stale_after: 2026-12-21
title: 'A skill reference states two rules that contradict each other or the repo'
enforcer: 'check: drive review quotes <report>, and a refusal in `drive pr ready` (skills/drive/scripts/pr/ready.ts, quoteRefusal) when a review.md contradiction quote is not on its stated line'
status: fixed
ticket: https://github.com/hancrafted/skills/issues/95
fixed-by: https://github.com/hancrafted/skills/pull/113
fixed-on: 2026-11-22
---

# A skill reference states two rules that contradict each other or the repo

## Symptom

A reference in the skill states a rule that another line of it, or the repository's own layout, contradicts, so an agent following it has to arbitrate.
