---
type: adr
id: GEN-004
title: 'Escalated Tech Debt'
domain: general
rules: true
files: ['skills/*/scripts/**/*', 'tools/**/*', '.github/**/*']
paths: ['**/*']
description: 'Escalation is the compliant path for a shortcut: name the trade-off, state the cost, get it accepted, then fence it and mark it with a tech-debt comment that links its issue.'
---

# Escalated Tech Debt

## Context

A shortcut taken silently is debt nobody priced; one taken openly is a business decision. Agents under deadline reach for the shortcut first and mention it never, so the record has to be part of the work.

Prohibition fails the other way: an agent forbidden to cut corners cuts them out of sight. The compliant path is escalation, and only the unescalated shortcut violates.

## Decision

### 1. Escalate before building

1. A change that would trade architecture or agent legibility for delivery MUST stop and escalate first: name the trade-off, state the cost (what gets harder later, how to undo it), and get Han to accept it.
2. Acceptance is a business decision; an agent MUST NOT accept on his behalf.
3. After acceptance the shortcut MUST be fenced to the smallest scope that contains it.
4. A change that trades neither architecture nor agent legibility MUST proceed without asking.

### 2. Mark and file (📜 Rule: `tech-debt-links-issue`)

1. An accepted shortcut MUST carry a `tech-debt` comment at the fence: `// tech-debt: https://github.com/hancrafted/skills/issues/12`.
2. The issue link MUST sit on the marker's own line; a bare `#12` does not count.
3. The issue carries the `tech-debt` label and states the cost and the undo.
4. Prose naming the marker is not one: only a marker opening a comment is checked.

## Do's and Don'ts

### Do's

1. **DO** stop and ask before a shortcut, naming its cost. (Decision 1)
2. **DO** proceed without asking when a change trades neither architecture nor agent legibility. (Decision 1)
3. **DO** fence the shortcut and file its issue in the same change. (Decision 1)
4. **DO** put the issue URL on the `tech-debt` line. (Decision 2, 📜 Rule: `tech-debt-links-issue`)

### Don'ts

1. **DON'T** take a shortcut without Han's acceptance and call it temporary. (Decision 1)
2. **DON'T** write a `tech-debt` comment with no issue URL. (Decision 2)

## Consequences

**Positive:**

1. **Priced debt:** every accepted shortcut has an owner-visible issue stating its cost.
2. **Compliant escape hatch:** an honest shortcut passes; only a hidden one fails.

**Negative:**

1. **Escalation costs a pause:** a deadline change waits for Han's answer.
2. **Escalation itself is unchecked:** the rule sees the marker, not whether acceptance happened; review carries that.

## Compliance and Enforcement

1. **Rule** `tech-debt-links-issue` (archgate, error): source files under `skills/*/scripts/`, `tools/` and `.github/`; a `tech-debt` comment without an issue URL fails.
2. **Review:** a shortcut with no marker is caught by `/code-review`.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Technical debt — Martin Fowler](https://martinfowler.com/bliki/TechnicalDebt.html) — debt as a deliberate, priced choice.
