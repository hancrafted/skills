---
type: adr
id: GEN-001
title: 'ADR Contract'
domain: general
rules: true
files: ['.archgate/adrs/**/*.{md,ts}']
paths: ['.archgate/adrs/**/*.{md,ts}']
description: 'What every ADR under .archgate/adrs/ is: a short, standalone, high-level decision with examples, in a fixed shape held by rules.'
---

# ADR Contract

## Context

An ADR records a **Discipline**: one lasting constraint on how code is written, and why. A **rule** is its mechanical check in a companion `.rules.ts`; a Discipline may have none.

ADRs get loaded into agent context on every matching Read. Long ones bury the rule; low-level detail (signatures, constants, lint selectors) goes stale on the next refactor; links to other ADRs and issues drag readers elsewhere and rot when those move. Code, tests and rules already hold the detail — the ADR holds the decision.

Altitude test: if the next feature could make the record wrong, it's too low. Feature- and contract-shaped reasoning goes in a Decision record in `docs/decision-records/`.

## Decision

### 1. Content: high-level, short, standalone

1. Decision MUST state the rule and its reason, not the mechanism. Signatures, timings, selectors live in code, tests, rules.
2. Prose MUST be terse; grammar MAY be dropped. Examples beat paragraphs — `~1.2.3` admits patch releases.
3. An ADR MUST stand alone: no Archgate ADR links/IDs or issue links. Decision records (`docs/decision-records/`), external docs and research files MAY be cited.
4. Name a file or symbol only where a rule or reviewer checks it.

### 2. Layout (📜 Rule: `adr-governed-files`)

1. `.archgate/adrs/` MUST stay flat: `<PREFIX>-<NNN>-<slug>` as `.md`, `.rules.ts` or `.rules.test.ts`, rules files backed by an `.md`.

### 3. Frontmatter

1. Lead with `type: adr`; require filename-matching `id`, `title`, registered `domain`, `rules` (true iff `.rules.ts` exists), `files`, `description`; `paths` optional (📜 Rule: `adr-frontmatter`).
2. `files:` scopes checks, `paths:` steers the author; both inline flow lists — `['tools/**/*.ts']` (📜 Rule: `adr-glob-inline`).
3. Every glob MUST match a real file; forbidden-file globs include a real sibling — `{verify,missing}.ts` (📜 Rule: `adr-paths-resolve`).

### 4. Shape

1. Six H2s in order: Context, Decision, Do's and Don'ts, Consequences, Compliance and Enforcement, References (📜 Rule: `adr-required-sections`).
2. Under 12,000 characters; aim far lower (📜 Rule: `adr-size-budget`).
3. Decision as `### N.` anchors from 1, each a numbered list (📜 Rule: `adr-numbered-decision`); Do's then Don'ts, each from 1, bold `**DO**`/`**DON'T**` (📜 Rule: `adr-numbered-dos-donts`).
4. Each rule marked once in Decision and once in Do's/Don'ts with its Decision number (📜 Rule: `adr-rule-mentions`).

### 5. Rules files

1. Every `.rules.ts` MUST have a `.rules.test.ts` covering pass and fail (📜 Rule: `adr-rules-test-sibling`).
2. Every message MUST embed `(<ID> [<rule-key>])` (📜 Rule: `adr-message-provenance`).
3. Every rule runs at `error` (📜 Rule: `adr-error-tier`).

## Do's and Don'ts

### Do's

1. **DO** show one example — `~1.2.3` admits patch releases. (Decision 1)
2. **DO** keep the bundle flat — `<ID>-<slug>.{md,rules.ts,rules.test.ts}`. (Decision 2, 📜 Rule: `adr-governed-files`)
3. **DO** open frontmatter with `type: adr` and an `id` matching the filename. (Decision 3, 📜 Rule: `adr-frontmatter`)
4. **DO** write globs inline — `files: ['tools/**/*.ts']`. (Decision 3, 📜 Rule: `adr-glob-inline`)
5. **DO** repoint a glob in the change that moves its file. (Decision 3, 📜 Rule: `adr-paths-resolve`)
6. **DO** emit all six H2s with real bodies. (Decision 4, 📜 Rule: `adr-required-sections`)
7. **DO** number anchors `### 1.`, `### 2.` with numbered items. (Decision 4, 📜 Rule: `adr-numbered-decision`)
8. **DO** restart Do's and Don'ts at 1. (Decision 4, 📜 Rule: `adr-numbered-dos-donts`)
9. **DO** give every `.rules.ts` a sibling test. (Decision 5, 📜 Rule: `adr-rules-test-sibling`)
10. **DO** tag messages — `(<ID> [<rule-key>])`. (Decision 5, 📜 Rule: `adr-message-provenance`)

### Don'ts

1. **DON'T** spell out mechanism — no `createUrlState(window)`, `150 ms`, `NewExpression[...]`. (Decision 1)
2. **DON'T** link another Archgate ADR or an issue; cite a Decision record by its repository path. (Decision 1)
3. **DON'T** split one Discipline's prose to dodge the budget; cut words first. (Decision 4, 📜 Rule: `adr-size-budget`)
4. **DON'T** mark a rule twice on one side, or name one that doesn't exist. (Decision 4, 📜 Rule: `adr-rule-mentions`)
5. **DON'T** ship a rule at `warning` or `info`. (Decision 5, 📜 Rule: `adr-error-tier`)

## Consequences

**Positive:**

1. **Cheap context:** short ADRs load fast and read in one pass.
2. **Stable:** high-level rules survive refactors; detail drifts in code, where tests catch it.
3. **Isolated:** each ADR readable alone; renaming or deleting one breaks no other.
4. **Machine-held shape:** frontmatter, sections, numbering and markers checked every `archgate check`.

**Negative:**

1. **Detail lives elsewhere:** reader opens code or tests for the how.
2. **Some repetition:** standalone ADRs may restate a neighbour's concept in a few words.
3. **Ceremony:** markers, numbering, sibling tests cost more than free prose.

**Risks:**

1. **Content rules unchecked:** §1 is judgement. **Mitigation:** reviewers check altitude, terseness and standalone meaning.
2. **Markers pair names, not meanings:** a marked sentence can outrun its rule. **Mitigation:** review checks prose matches rule.

## Compliance and Enforcement

1. **Rules** (`GEN-001-adr.rules.ts`, error): §2–§5, scoped to `.archgate/adrs/`.
2. **Gate:** `archgate check` in `npm run verify`.

**Manual review duties:** §1 — altitude, terseness, examples, no cross-links; prose matches its rule; globs name the right files, not just existing ones; tests cover pass and fail.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [archgate](https://archgate.dev/) — `files:`, registered domains, rule model.
