# Changelog

All notable changes to the learnings skill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the skill follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The learnings skill: `learnings record|list|similar|check|file-upstream --skill <name>`, the learning loop drive
  had, generalised by skill. The store is `docs/learnings/<skill>/{records,failure-modes}/`, with the README contract
  at `docs/learnings/README.md`. Records carry `type`; failure modes carry `type` and `stale_after`.
- `learnings list` marks a failure mode cited three or more times as a `smell`.
- `learnings file-upstream` files a smell on the skill's `source` repo behind a human gate, at most one open ticket
  per skill.

### Changed

- Moved from drive: the store from `docs/drive/learnings/`, the scripts from `skills/drive/scripts/learnings/` (now
  `skills/learnings/scripts/store/`) and `markdown-harness.config.yaml`. `drive learnings` is removed.
