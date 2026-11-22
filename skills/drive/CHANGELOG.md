# Changelog

All notable changes to the drive skill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the skill follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-22

### Added

- An Intent step at the start of Define (`references/intent.md`): the Operator approves a statement of the why, in the problem
  space, before the spec. A Workflow runs intent first or grill first; a scope change after approval is a bet placed against
  the Intent, and a Subagent reports drift in an `Intent:` line that the Orchestrator raises before Implement.
- `drive status` prints `Mode:` (`intent-first` or `grill-first`) and `Intent:` (`confirmed` or not); it reads the last Intent
  statement heading, so a later statement supersedes an earlier one. Define stops until the Intent is confirmed.
- `drive pr ready` refuses a PR body without `## Intent drift`; the Decision PR body gains `## Intent`.
- The brief gains Intent and a rule that a Subagent never edits Decision docs; the report and the review gain an `Intent:` line.
- `drive setup` proposes the project grilling format from the template and calibrates it
  (`references/setup.md` "The grilling format step"); the template restates the Intent statement each round and judges
  later questions against it.
- A Workflow record may log `Bet:` lines; the learnings `## Intent` section takes an optional `**Bets:**` bullet.

### Changed

- `SKILL.md` moved Branches and the topic folder to `references/worktrees.md` and keeps a 1,500-character margin under the
  budget; each moved section left one pointer line.
- `SKILL.md` Context says setup writes `docs/agents/grilling-format.md`.
- SKL-002 now reads that an interview may run in rounds or one question at a time and no longer requires a recommended
  answer per question; drive's grilling format follows it.

## [2.1.0] - 2026-11-22

### Added

- `drive status` prints the optional inputs: `Grill format` (filled or missing), `review.md` and `profiles.md` (filled, missing or empty)
  (`Facts.inputs`). `references/setup.md` "Optional inputs" states the fallback and ask-once for each.
- `assets/grilling-format.md`, the template drive uses when the project has no grilling format; `drive status` prints
  `Grill format: missing (using drive's template)`.
- `drive review quotes <report>` checks each quoted line in a review report against its file (exit 1, one line per bad
  entry). A review report now requires a `## Contradictions` section; write `none` when empty.
- A review report carries `Reviewed: <sha>`; `drive review quotes` reads each quoted file at that commit
  (`git show <sha>:<path>`), so the result is the same from any checkout.
- `drive pr ready` gains two refusals: `origin/<base>` is ahead of the Integration branch (it fetches both first), and a
  review report quote does not match its file.
- The setting names live in `core/settings.pure.ts` (`SETTING_NAMES`); a test fails on an unlisted setting name in
  `skills/drive/**/*.md`, and the config, binding and model parsers read their keys from it.
- The `PROFILES_STUB` gains a `## Live or scheduled` section.

### Changed

- The failure-mode and skill catalog moved from `catalog/catalog.json` to `assets/catalog.json`; the Binding code reads it there.
- `SKILL.md` fits the 5,000-token budget: the Subagent and Monitor instructions, the workflow diagram and the Decision PR body moved to `references/`.
- The description says what drive does before `Use when`; `## Context` names `docs/agents/`; rationalization rows cite their incident.
- Reason step 3 names `drive dispatch check --base <Integration branch> <tickets>` and when it runs: once the tickets are
  filed, before the Decision PR. "Watch the gate" exit codes moved to `references/decision-pr.md`.
- The `drive pr ready` ahead count reads `origin/<branch>`, and the message reads "origin/<base> has N commits
  origin/<branch> lacks". Review and worktree instructions say to run in the Integration worktree.

## [2.0.0] - 2026-11-20

### Added

- `metadata.state: stateful` and a `## Context` section in `SKILL.md`: it names the homes drive reads or writes and carries
  the context protocol block of `docs/skills/context-protocol.md` (SKL-003).
- `drive setup` installs `/learnings`, moves an old `docs/drive/learnings/` to `docs/learnings/drive/` and records
  `drive@<version>` in `docs/drive/README.md`.

### Changed

- **Breaking:** the learnings loop moved to the learnings skill; `drive learnings` is removed. drive depends on
  `/learnings` and stops without it.
- `drive setup` reads its version from `metadata.version` in `SKILL.md`, the one source for `generated.by`.

## [1.0.0] - 2026-11-19

### Added

- The drive skill, ported from `hancrafted/content-library` at `b35c8ef` with its behaviour unchanged: `SKILL.md`, the
  Drive glossary, `references/`, `catalog/`, `markdown-harness.config.yaml` and the `drive` CLI in `scripts/` with its
  tests.
- The `drive` CLI's scripts are deep modules, one folder each under `scripts/` with one `index.ts`;
  `node scripts/drive.ts <command>` is unchanged. The Claude adapter lives at `scripts/harness/claude/adapter.ts`.
- Install it with `npx skills add hancrafted/skills --skill drive`. The consuming repo provides the `yaml` npm package, which
  the scripts import at runtime, and `@hancrafted/markdown-harness` for `check:docs`.

### Changed

- The seeded Binding header and the learnings-store config cite drive's Decision records
  `docs/decision-records/drive/0001-workflow-phases-are-ports-bound-per-project.md` and
  `docs/decision-records/drive/0003-drive-learnings-are-records-and-failure-modes.md` in `hancrafted/skills`, not
  content-library's 0027 and 0030.
