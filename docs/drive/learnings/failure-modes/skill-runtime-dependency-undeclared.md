---
title: 'An installed skill imports an npm package its SKILL.md does not declare'
enforcer: "check: check:skills, new rule comparing bare imports under a skill's scripts/ with its compatibility field"
status: proposed
---

# An installed skill imports an npm package its SKILL.md does not declare

## Symptom

A skill's scripts import an npm package at runtime that neither its SKILL.md `compatibility` nor its README names, so an install into a repo without that package fails.
