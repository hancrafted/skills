# Skills

This repository contains agent skills.

## Rules

1. Do not auto-include yourself in the commit message.
2. Sessions with /wayfinder and /grill-with-docs skills should adhere to these formating rules
   1. There can be response to previous decision or a introduction section, but always place a W or H question and then list numbered options, provide at least 2-3 options each
   2. Provide Recommendation at the end and the reason why
   3. Generally use simple wordings and an inverted pyramid style to convey information, but always use technically precise words, DONT invent words. The user will ask follow-up questions if technical depth is needed.

## Commits

1. **Commits** Make atomic commits using Conventional Commits v1.1.0 format `[feat, fix, docs, refactor, chore](scope): <short summary in present tense>`
2. **Commit Body** Use the optional commit body to explain the why and how of the change (not the what)by using the Keep a Changelog v1.1.0 categories (Added, Changed, Deprecated, Removed, Fixed, Security) to clearly group the impacts.
3. **Commit Scope** Keep changes scoped to the domain you are working on.
4. **Commit Trail** Use `Source: [URL to Github Issue] | [Prompt causing commit]` at the end of commit body, to make tracing back easy.

Example

```
doc(README): align root README.md with the agent skills documentation

## Changed
- Update `README.md` to align with the agent skills documentation.
```

## Agent skills

### Issue tracker

Issues live as GitHub issues on `hancrafted/skills`, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
