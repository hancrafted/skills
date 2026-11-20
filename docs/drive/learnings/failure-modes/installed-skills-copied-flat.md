---
title: 'Installed skills are committed flat into .agents/skills, so their files collide'
enforcer: 'check: check:skills, new rule that every file under .agents/skills/ sits in a <name>/ folder holding a SKILL.md'
status: proposed
---

# Installed skills are committed flat into .agents/skills, so their files collide

## Symptom

A commit copies installed skills into `.agents/skills/` without their per-skill folders, so files of the same name from different skills overwrite each other, and no check looks at the tree's shape.
