---
type: failure-mode
stale_after: 2026-12-20
title: A stateful skill's Context protocol names a home whose README no setup writes
enforcer: "adr-checker: archgate, new SKL-003 rule that every home a skill's Context names has a README or a setup that writes it"
status: proposed
---

# A stateful skill's Context protocol names a home whose README no setup writes

## Symptom

A stateful skill's Context names a home that no README or setup writes. Review 2 S2, S3: drive SKILL.md named docs/learnings/drive/ and docs/decision-records/ with no README behind them, and learnings SKILL.md told the agent to run a setup it lacked.
