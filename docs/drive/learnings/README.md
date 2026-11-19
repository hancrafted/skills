# Drive learnings

What each drive Workflow hit, kept so Fortify counts recurrences from records instead of trusting a typed number.

- `records/<date>-<workflow>.md`: one per Workflow, written at the end of Verify and never edited after its Fortify question. Each H2 names a failure mode.
- `failure-modes/<slug>.md`: one per failure mode, holding its title, Enforcer and status, never a count.

The drive skill's `markdown-harness.config.yaml` is the template for both. Before writing a file, read what it asks with `mh query --intents records/<file>.md --config <skill>/markdown-harness.config.yaml` (or `failure-modes/<file>.md`); paths are relative to this folder. Before creating a failure mode, run `drive learnings similar "<failure>"` and cite the match when its Enforcer would catch this case too.

`drive learnings` lists every failure mode with its computed count, its status and `regressed` when a record cites it after its fix. `drive learnings check` runs in the docs check beside `mh check`.
