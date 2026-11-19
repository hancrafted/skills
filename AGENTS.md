# Skills

This repository contains agent skills.

## Rules

1. Do not auto-include yourself in the commit message.
2. Use `/commit` Skill to commit changes.
3. Sessions with /wayfinder and /grill-with-docs skills should adhere to these formating rules
   1. There can be response to previous decision or a introduction section, but always place a W or H question and then list numbered options, provide at least 2-3 options each
   2. Provide Recommendation at the end and the reason why
   3. Generally use simple wordings and an inverted pyramid style to convey information, but always use technically precise words, DONT invent words. The user will ask follow-up questions if technical depth is needed.

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

Single-context — one `GLOSSARY.md` and one `docs/decision-records/` at the repo root. When an engineering skill says "ADR", it means a **Decision record**: it goes in `docs/decision-records/` with `type: decision-record` front matter. Archgate ADRs in `.archgate/adrs/` are separate, and engineering skills never write them. See `docs/agents/domain.md`.
