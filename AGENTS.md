# Skills

This repository contains agent skills.

## Rules

1. Do not auto-include yourself in the commit message.
2. Use `/commit` Skill to commit changes.
3. Sessions with /wayfinder, /grill-with-docs and /grilling follow the round format in `docs/agents/grilling-format.md`.

## Development

- Read applicable `.archgate/adrs/` before coding; ADR violations block completion.
- Use TDD at agreed public seams: prove red, implement, prove green.
- Run `npm run verify` frequently and before completing work.
- Browser graders and tests taking seconds belong in `*.slow.test.ts`; await page conditions, not sleeps.
- Run `npm run test:slow` before pushing; list disk-read inputs in the slow config's rerun triggers.

## Agent context

### Issue tracker

Issues live as GitHub issues on `hancrafted/skills`, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context, one context per skill: `GLOSSARY-MAP.md` at the root lists each skill's glossary (inside the skill) and its Decision records (`docs/decision-records/<skill>/`). When an engineering skill says "ADR", it means a **Decision record**: it goes in `docs/decision-records/<skill>/`, or `docs/decision-records/` when it spans the repo, with `type: decision-record` front matter. Archgate ADRs in `.archgate/adrs/` are separate, and engineering skills never write them. See `docs/agents/domain.md`.

### Reference repos

Before recommending an answer on how this repo builds, evals, governs, tests or ships skills (skill harness), or on a skill's content, check the index and cite what you used as `name@sha7:path`. See `docs/agents/reference-repos.md`.
