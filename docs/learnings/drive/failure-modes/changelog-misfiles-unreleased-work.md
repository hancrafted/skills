---
type: failure-mode
stale_after: 2026-12-20
title: 'The CHANGELOG files shipping work under Unreleased beside a version that never shipped'
enforcer: 'check: new CHANGELOG check that a version without a release tag has no Unreleased section above it'
status: proposed
---

# The CHANGELOG files shipping work under Unreleased beside a version that never shipped

## Symptom

A skill's CHANGELOG dates a version that was never tagged or installed and files the work that will ship under Unreleased, so the first release's notes describe a layout no consumer receives.
