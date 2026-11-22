# Changelog

All notable changes to the learnings skill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the skill follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-11-22

### Added

- A record may carry one optional `## Intent` section, first after the title: bullets `**Turns:**`, `**Moved:**`, `**Outcome:**`, `**Drift:**` and an optional `**Bets:**`. `learnings check` and the record rule in `markdown-harness.config.yaml` fail a second section, a misplaced one or an unlabelled bullet. Existing records pass unchanged.

## [0.2.0] - 2026-11-21

### Added

- `learnings record` writes `docs/learnings/README.md` with OKF `generated: {by: learnings@<version>, at: <date>}` when it is missing, and moves `generated.by` and `at` to this
  version and today when the README names another version (version 0.2.0).
- The learnings skill: `learnings record|list|similar|check|file-upstream --skill <name>`, the learning loop drive
  had, generalised by skill. The store is `docs/learnings/<skill>/{records,failure-modes}/`, with the README contract
  at `docs/learnings/README.md`. Records carry `type`; failure modes carry `type` and `stale_after`.
- `learnings list` marks a failure mode cited three or more times as a `smell`.
- `learnings file-upstream` files a smell on the skill's `source` repo behind a human gate, at most one open ticket
  per skill.

### Changed

- The description says what the skill does before `Use when`, and the repo-only decision link left `SKILL.md`; rationalization rows cite their incident.
- `metadata.state: stateful` and a `## Context` section in `SKILL.md`: it names `docs/learnings/` and carries the
  context protocol block of `docs/skills/context-protocol.md` (SKL-003).
- Moved from drive: the store from `docs/drive/learnings/`, the scripts from `skills/drive/scripts/learnings/` (now
  `skills/learnings/scripts/store/`) and `markdown-harness.config.yaml`. `drive learnings` is removed.

### Fixed

- `--skill`, `--failure` and `--topic` must be slugs; `..`, `/` and spaces are refused before any path is built.
- The README's Off list is one `- <skill>` bullet per line, as the parser reads it.
- Rule ids are `learnings-record` and `learnings-failure-mode`, no longer `drive-learnings-*`.
