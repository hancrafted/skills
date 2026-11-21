# Changelog

All notable changes to the drive skill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the skill follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The failure-mode and skill catalog moved from `catalog/catalog.json` to `assets/catalog.json`; the Binding code reads it there.
- `SKILL.md` fits the 5,000-token budget: the Subagent and Monitor instructions, the workflow diagram and the Decision PR body moved to `references/`.
- The description says what drive does before `Use when`; `## Context` names `docs/agents/`; rationalization rows cite their incident.

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
