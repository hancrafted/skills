---
type: adr
id: ARCH-001
title: 'Dependency Admission Bar'
domain: architecture
rules: true
files: ['package.json']
paths: ['package.json']
description: 'The four-signal admission bar a candidate dependency clears before a human approves it, and the two-form version-range shape package.json must declare — one a permanent review duty, the other a mechanical rule.'
---

# Dependency Admission Bar

## Context

Every dependency is code shipped or run on trust. An abandoned or one-person package becomes this repo's maintenance burden; a caret range lets a minor release change the build without anyone deciding to. Agents add packages readily, so the bar has to be written down, and the range shape has to hold even when `npm install` is run without thought.

## Decision

### 1. The admission bar — four signals

1. Before approving a new dependency, a human screens it against four signals: GitHub stars ≥1,000; ≥3 contributors or a named maintaining organisation; npm weekly downloads ≥100,000; a release or maintainer reply within the last 12 months.
2. The bar is a soft screen: a candidate missing a signal is admitted only with the missed signal and the reason recorded in the commit body.

### 2. Version ranges — two forms (📜 Rule: `dependency-range-form`)

1. Every `dependencies` and `devDependencies` entry MUST be a tilde range `~x.y.z` or an exact pin `x.y.z`. Carets, wildcards, dist-tags, comparison ranges, URLs and `file:`/`link:` are refused.

### 3. The default install writes a tilde

1. `.npmrc` carries `save-prefix=~`, so a plain `npm install <package>` complies.

## Do's and Don'ts

### Do's

1. **DO** run the four signals — stars, contributors or organisation, downloads, recency — before approving a dependency. (Decision 1)
2. **DO** name the missed signal and the reason in the commit body when the bar isn't fully cleared. (Decision 1)
3. **DO** write every entry as `~x.y.z` or `x.y.z`. (Decision 2, 📜 Rule: `dependency-range-form`)
4. **DO** keep `save-prefix=~` in `.npmrc`. (Decision 3)

### Don'ts

1. **DON'T** hard-refuse a candidate for missing one signal — the bar screens, a human decides. (Decision 1)
2. **DON'T** wait for automation of the four signals; they live on remote services a hermetic check can't read. (Decision 1)
3. **DON'T** write `^1.2.3`, `*`, `latest`, `>=1`, a git URL or a `file:` link. (Decision 2)

## Consequences

**Positive:**

1. **Enforcement matches the mechanism:** the network-bound bar stays a review duty; the syntactic range check runs on every commit.
2. **Deliberate upgrades, legible exceptions:** a minor upgrade is always a decision, and soft admissions are in git history.

**Negative:**

1. **The bar has no automated teeth:** nothing blocks a dependency that skipped it, or checks a recorded reason.
2. **Recency is a weak proxy:** a trivial release satisfies it without a responsive maintainer.

**Risks:**

1. **The soft screen becomes a rubber stamp.** **Mitigation:** the reason sits in the commit body, visible in review and history.
2. **Fixed thresholds misfit a package's risk.** **Mitigation:** thresholds live in this prose, not rule code, and are cheap to amend.

## Compliance and Enforcement

1. **Rule** `dependency-range-form` (archgate, error): every entry has one of the two allowed forms (§2).

**Manual review duties:** the four signals applied to every new dependency (§1.1); a soft admission's commit body names the missed signal and why (§1.2).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [npm docs — `package.json` dependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies) — range syntax.
- [npm docs — `.npmrc`](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc) — `save-prefix`.
- [npm registry — download counts](https://github.com/npm/registry/blob/master/docs/download-counts.md) — the weekly figure the third signal reads.
