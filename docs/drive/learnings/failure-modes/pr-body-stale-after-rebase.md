---
title: 'The PR body describes the branch as it was before its rebase'
enforcer: "check: new refusal in `drive pr ready` when the body's Evidence SHA is not the branch head"
status: proposed
---

# The PR body describes the branch as it was before its rebase

## Symptom

After a rebase or a new commit the PR body still describes the old branch: its summary, evidence SHA and after-merge steps no longer hold, and following them can do harm.
