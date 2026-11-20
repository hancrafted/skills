---
title: 'The local base branch holds commits origin lacks while the Integration branch is reviewed'
enforcer: 'check: new refusal in `drive pr ready` when the local base branch is ahead of its remote'
status: proposed
---

# The local base branch holds commits origin lacks while the Integration branch is reviewed

## Symptom

The local base branch carries commits that are not pushed and not in the Integration branch, so the review and the gate run against a base the merge will not see.
