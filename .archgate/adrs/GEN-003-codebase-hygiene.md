---
type: adr
id: GEN-003
title: 'Codebase Hygiene'
domain: general
rules: true
files: ['skills/*/scripts/**/*', 'tools/**/*']
paths: ['skills/*/scripts/**/*', 'tools/**/*']
description: 'Hygiene Disciplines binding skill scripts and repository tools in every language: the ban on inline lint suppression.'
---

# Codebase Hygiene

## Context

A home for hygiene Disciplines that bind skill scripts and repository tools, whatever their language.

An inline `eslint-disable` silences a rule where no reviewer looks for it, and agents reach for it to turn red green. ESLint honours every directive it's handed, so only a separate check can refuse them.

## Decision

### 1. No inline eslint suppression (📜 Rule: `no-eslint-disable`)

1. A file under `skills/*/scripts/` or `tools/` MUST NOT carry an eslint directive comment — `eslint-disable`, `-line`, `-next-line` or `eslint-enable`, in `//` or `/* */` form.
2. A wrong rule is turned off in the lint config, behind a `files:` glob, with its reason.

## Do's and Don'ts

### Do's

1. **DO** turn a wrong lint rule off in the lint config, scoped by `files:` and carrying its reason. (Decision 1)

### Don'ts

1. **DON'T** write `// eslint-disable-next-line` or any other directive in a skill script or repository tool. (Decision 1, 📜 Rule: `no-eslint-disable`)

## Consequences

**Positive:**

1. **Auditable suppression:** every exception sits in one config, with a glob and a reason.

**Negative:**

1. **No local escape hatch:** a one-off false positive needs a config glob or an ADR amendment.

## Compliance and Enforcement

1. **Rule** `no-eslint-disable` (archgate, error): every file under `skills/*/scripts/` and `tools/`.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [ESLint — configuration comments](https://eslint.org/docs/latest/use/configure/rules#using-configuration-comments) — the directive forms §1 bans.
