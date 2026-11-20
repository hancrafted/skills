---
type: readme
generated:
  by: learnings@0.1.0
  at: 2026-11-20
---

# Learnings

What went wrong in each skill's runs, kept so a skill that fails the same way three times can ask for a fix upstream. The `learnings` skill writes it; read this file, not the skill, to use the store.

- `<skill>/records/<date>-<topic>.md`: one append-only record per run that went wrong. Each H2 names a failure mode. Front matter: `type: record`, `workflow`, `date`, `fortify`.
- `<skill>/failure-modes/<slug>.md`: one per failure mode, holding its title, Enforcer and status, never a count. Front matter: `type: failure-mode`, `stale_after` (one month after the last write).

The `learnings` skill's `markdown-harness.config.yaml` is the template for both: read what it asks with `mh query --intents <skill>/records/<file>.md --config skills/learnings/markdown-harness.config.yaml --root docs/learnings`. Before creating a failure mode, run `learnings similar --skill <skill> "<failure>"` and cite the match when its Enforcer would catch this case too. `learnings list --skill <skill>` prints each failure mode with its computed count; `learnings check` runs in the docs check.

## Off

Skills whose learning is turned off, one `- <skill>` bullet per line. `learnings record` refuses them. None yet.
