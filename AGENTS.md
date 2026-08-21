# Skills

This repository contains agent skills.

## Rules

1. Do not auto-include yourself in the commit message.
2. Use `/commit` Skill to commit changes.
3. Sessions with /wayfinder and /grill-with-docs skills should adhere to these formating rules
   1. There can be response to previous decision or a introduction section, but always place a W or H question and then list numbered options, provide at least 2-3 options each
   2. Provide Recommendation at the end and the reason why
   3. Generally use simple wordings and an inverted pyramid style to convey information, but always use technically precise words, DONT invent words. The user will ask follow-up questions if technical depth is needed.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `hancrafted/skills`, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
