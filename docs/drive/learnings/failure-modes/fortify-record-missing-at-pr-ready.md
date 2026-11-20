---
title: "drive pr ready marks the Integration PR ready before the Workflow's Fortify record is committed"
enforcer: 'check: new refusal in `drive pr ready` when docs/drive/learnings/records/ holds no record for the topic'
status: proposed
---

# drive pr ready marks the Integration PR ready before the Workflow's Fortify record is committed

## Symptom

The Integration PR is marked ready, and often merged, while `docs/drive/learnings/records/` holds no record for the Workflow, so its corrections and review findings reach the store only through a late follow-up branch or not at all.
