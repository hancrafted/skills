---
type: failure-mode
stale_after: 2026-12-20
title: 'A test run appends entries to the live Workflow log in .scratch'
enforcer: 'test-runner: test:slow, new edge case asserting every .scratch/*/drive.log.jsonl is unchanged by the suite'
status: proposed
---

# A test run appends entries to the live Workflow log in .scratch

## Symptom

A test runs the drive CLI with the real repository as its working directory, so each run appends to the Workflow log in the main checkout and corrupts the evidence that `drive status` and `drive transcript` read.
