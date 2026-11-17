---
type: adr
id: GEN-007
title: 'Naming'
domain: general
rules: false
files: ['{tests,tools}/**/*', 'skills/*/scripts/**/*', '.archgate/adrs/*.rules*.ts']
paths: ['{tests,tools}/**/*', 'skills/*/scripts/**/*', '.archgate/adrs/*.rules*.ts']
description: "A name is a glossary term, the value's role and its unit; units are suffixes spelled in full, and lint rejects abbreviated ones."
---

# Naming

## Context

A name is read on every line that uses it; a comment beside the declaration is read once, if at all, and nothing checks it against the code. So a name has to say what a comment would: what the value is, what it is for, and what unit it counts in.

Units drifted the way unchecked text does. Eight spellings served five units (`Px`, `Percent` and `Pct`, `Seconds` and `Sec`, `Minutes` and `Min`, `Ms`), so a reader could not rely on one. `Min` also means minimum: `fitRoomMin` is a least room in pixels, not minutes.

Options:

1. **Abbreviations, one per unit.** Short, but `Min` stays ambiguous and every reader learns a table.
2. **Branded unit types** (`type Milliseconds = number & { … }`). Checked by the compiler, but every arithmetic step needs a cast, and the casts become the noise. Rejected.
3. **Full words, abbreviations denied by lint.** One sentence to learn: never abbreviate a unit. Chosen.

## Decision

### 1. What a name holds

1. A name MUST be a glossary term, plus the value's role, plus its unit when it has one — `riseDelayMilliseconds`, `narrowestPicturePixels`. The glossary term comes from the repo's `GLOSSARY.md`.
2. A name has no length cap: never abbreviate to fit.

### 2. Units

1. A unit MUST be a suffix spelled in full: `Milliseconds`, `Seconds`, `Minutes`, `Hours`, `Pixels`, `Percent`, `Degrees`, `Bytes`, `Frames`, `Words`, `Lines`, `Ratio`, `Count`.
2. CSS relative units keep their CSS names: `Rem`, `Em`, `Vh`, `Vw`.
3. Locale codes stay ISO 639-1 alpha-2: `de`, `en`.
4. No branded unit types; the suffix carries the unit.
5. Lint MUST reject the abbreviations `Ms`, `Sec`, `Min`, `Px`, `Pct`, `Deg`, `Hz`, `Fps` as a suffix of a declared identifier, in any casing — `fadeMs`, `FADE_MS`, `fade_ms` — and name the full word. The denylist is one constant beside the other lint constants.
6. A property read from a third-party API never trips the check. Rename it where it enters: `const { offsetPx: offsetPixels } = library`.
7. A contract string is never renamed: a JSON or log field, an environment variable, a front-matter key. Where code declares one as a key, it is written quoted — `'duration_ms': number` — and the formatter keeps the quotes.

## Do's and Don'ts

### Do's

1. **DO** spell the unit in full as the last word — `TIMEOUT_MILLISECONDS`, `scenePixels`, `angleDegrees`. (Decision 2)
2. **DO** write `Minimum` when a value is a minimum, and add its unit — `WEIGHT_MINIMUM`, `roomMinimumPixels`. (Decision 2)
3. **DO** rename an abbreviated third-party property at the destructuring or import that brings it in. (Decision 2)
4. **DO** quote a contract key you cannot rename — `{ 'RUN_LOG_LOCK_WAIT_MS': '200' }`. (Decision 2)
5. **DO** reach for a longer name before a comment. (Decision 1)

### Don'ts

1. **DON'T** abbreviate a unit — `delayMs`, `gapPx`, `widthPct`, `turnDeg`. (Decision 2)
2. **DON'T** rename a JSON field, log attribute, environment variable or route to satisfy the rule. (Decision 2)
3. **DON'T** add a branded unit type. (Decision 2)
4. **DON'T** shorten a glossary term to keep a name short. (Decision 1)

## Consequences

**Positive:**

1. **One convention:** a unit reads the same way in every file.
2. **No ambiguity:** `Minutes` and `Minimum` can no longer collide.
3. **Comments retire:** "in ms" and "in px" notes become part of the name.

**Negative:**

1. **Longer names:** lines wrap sooner, and some JSX breaks across lines.
2. **Quoted keys:** a contract key looks different from its neighbours, by design.

**Risks:**

1. **A missing suffix passes.** Lint sees only a wrong suffix, never an absent one. **Mitigation:** review checks every numeric name for its unit.
2. **A third-party option needs an abbreviated key.** Writing an object literal for a library that names its option `durationMs` trips lint. **Mitigation:** quote the key as a contract string (Decision 2.7).

## Compliance and Enforcement

1. **Lint** (error): the abbreviation denylist on declared identifiers — variables, parameters, destructured bindings, object, class and interface keys, functions, classes and types — under `tests/`, `tools/` and `skills/*/scripts/`; a probe suite plants each abbreviation in each casing, each full word and a third-party read.
2. **Review:** a unit suffix is present on every value that has a unit; names hold a glossary term; rules files under `.archgate/`, which lint does not read, follow §2.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [ESLint — `no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax) — the selector rule lint carries the denylist in.
- [ISO 639 language codes](https://www.iso.org/iso-639-language-code) — the alpha-2 locale codes §2.3 keeps.
- [Prettier — `quoteProps`](https://prettier.io/docs/options#quote-props) — the `preserve` option §2.7 relies on.
