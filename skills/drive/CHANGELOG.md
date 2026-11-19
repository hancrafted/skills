# Changelog

All notable changes to the drive skill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the skill follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-19

### Added

- The drive skill, ported from `hancrafted/content-library` at `b35c8ef` with its behaviour unchanged: `SKILL.md`, the
  Drive glossary, `references/`, `catalog/`, `markdown-harness.config.yaml` and the `drive` CLI in `scripts/` with its
  tests.
- Install it with `npx skills add hancrafted/skills --skill drive`.

### Changed

- The seeded Binding header and the learnings-store config cite drive's Decision records 0001 and 0003 in
  `hancrafted/skills`, not content-library's 0027 and 0030.
