# Skills

This repository contains agent skills.

## Rules

1. Do not auto-include yourself in the commit message.
2. Sessions with /wayfinder and /grill-with-docs skills should adhere to these formating rules
   1. There can be response to previous decision or a introduction section, but always place a W or H question and then list numbered options, provide at least 2-3 options each
   2. Provide Recommendation at the end and the reason why
   3. Generally use simple wordings and an inverted pyramid style to convey information, but always use technically precise words, DONT invent words. The user will ask follow-up questions if technical depth is needed.

## Commits

Enforced by the `commit` skill's gate — `skills/commit/scripts/commit-msg`, wired
into `.husky/commit-msg`. Where this prose and that script differ, **the script is
the contract**; the full contract lives in [`skills/commit/SKILL.md`](skills/commit/SKILL.md).

1. **Commits** Make atomic commits using Conventional Commits v1.1.0 format `<type>(scope): <short summary in present tense>`, where `type` is one of `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `test`, `perf`, `build`, `ci`, `revert`.
2. **Commit Body** Required, not optional. Explain the why and how of the change (not the what) under Keep a Changelog v1.1.0 category headings at H3 — `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security` — each with at least one numbered item. Prose paragraphs are welcome anywhere.
3. **Commit Scope** Keep changes scoped to the domain you are working on.
4. **Commit Trail** End with a `Source: <canonical ref> | <prompt causing commit>` **git trailer** so the cause is retrievable via `git log --format='%(trailers:key=Source,valueonly)'`. It must sit in the last paragraph after a blank line — a `Source:` line tucked under a numbered item, or followed by more prose, is not a trailer and returns nothing. Either part of the value may be empty, not both. Format the reference as [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) says; a reference that is only a bare issue number is rejected, so expand `#123` to a full URL.

Example

```
docs(README): align root README.md with the agent skills documentation

### Changed
1. Update `README.md` to align with the agent skills documentation.

Source: https://github.com/hancrafted/skills/issues/1 | align the README with the skills docs
```

Commit with `git commit -F <file>`: the body's blank lines are load-bearing for the
trailer and do not survive repeated `-m` flags reliably.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `hancrafted/skills`, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
