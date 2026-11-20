---
title: 'drive --help exits 1'
enforcer: 'test-runner: test:slow, the `--help` case in drive.slow.test.ts asserting exit 0'
status: ticket
ticket: https://github.com/hancrafted/skills/issues/71
---

# drive --help exits 1

## Symptom

`drive --help` prints the usage and exits 1, so a caller checking the exit status reads help as a failure.
