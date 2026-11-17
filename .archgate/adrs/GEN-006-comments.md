---
type: adr
id: GEN-006
title: 'Comments'
domain: general
rules: true
files: ['{tests,tools}/**/*', 'skills/*/scripts/**/*', '.archgate/adrs/*.rules*.ts']
paths: ['{tests,tools}/**/*', 'skills/*/scripts/**/*', '.archgate/adrs/*.rules*.ts']
description: 'Governed code carries no prose comment, JSDoc included: a reason moves down a fixed ladder into a name, a type, a test, a pointer marker or the commit body, and only machine-read markers survive.'
---

# Comments

## Context

Agents read a comment as current truth, but nothing checks it against the code beside it. It goes stale and misleads the next session: misleading natural language in code cut LLM output prediction by 23.2% on average across 17 models (CodeCrash). Agents also copy the pattern from neighbouring files, so comments multiply.

Every comment restates or explains something a checked place can hold: a name, a type, a test, an ADR, the commit body. Four kinds of why resist names — public-API contracts, rejected alternatives, coupling warnings, cited facts — so the ban comes with a ladder and a pointer marker that says at the line that a reason exists, and where.

This record absorbed the lint-directive ban (§6) from the retired Codebase Hygiene ADR, which held it for skill scripts and repository tools alone; §6 now covers every governed file.

Existing comments were retired in one sweep; every authored code file is now governed.

## Decision

### 1. No prose comments (📜 Rule: `no-comments`)

1. Governed code MUST carry no prose comment in TS, JS or CSS: `//`, `/* */`, JSDoc `/** */`, JSX `{/* */}`. Only a registered marker, bare, survives (§4).
2. Out of scope: `fixtures/`, `*.generated.*` and root config files, whose reasons sit beside their entries.
3. Working comments are free until staged. The commit gate checks staged files; pre-push and CI check every file.
4. Every finding names the comment's position and says what to do instead.

### 2. The ladder

1. A comment's information moves to the first rung that keeps all of it: delete (it restates the code) → rename or tighten a type → extract a named constant or function → a test named for it → a pointer marker → the commit body.
2. A slightly longer name is a full fix. Names have no length cap.

### 3. Homes for a why

1. An invariant: a test named for it.
2. A security invariant: a test or a lint rule, never a pointer.
3. A decision: its ADR.
4. A rejected alternative: its ADR's options; the commit body when too local for one.
5. A timing or coupling reason: a name stating the constraint — `beginMotionBeforePaint`; the rest to the commit body.
6. The narrative of a change: the commit body.
7. Read-time visibility of a reason held elsewhere: a pointer marker.

### 4. Marker registry

1. A marker is admitted only if a gate tool reads it. Nothing may follow a marker.
2. The registry, mirrored by the rule; the two may not differ:

   | Marker                                            | Read by                          |
   | ------------------------------------------------- | -------------------------------- |
   | `// ARRANGE`, `// ACT`, `// ASSERT`               | the Testing ADR, `test-body-aaa` |
   | `// @ts-expect-error`, `{/* @ts-expect-error */}` | tsc                              |
   | `/// <reference … />`                             | tsc                              |
   | `// <label>: <target>`, `/* <label>: <target> */` | this ADR                         |

3. No pragma (`/* @vitest-environment */`, `// #__PURE__`) is in use; one enters only by §4.1 and an amendment.

### 5. Pointer markers

1. Shape: `// <label>: <target>`, or `/* <label>: <target> */` in CSS. One target, on its own line, directly above the code; pointers may stack.
2. Labels, closed:

   | Label        | Target                                                          |
   | ------------ | --------------------------------------------------------------- |
   | `decision:`  | an Archgate ADR section, or a design-ADR path under `docs/adr/` |
   | `tech-debt:` | an issue URL in this repo                                       |

3. An ADR section is `<ID> §<n>[.<m>]`: Decision anchor n, item m.
4. Every target is checked offline; a missing one fails. An external URL fails: an outside fact goes to the commit body.
5. `tech-debt:` is checked for format only; the issue holds the cost.

### 6. Lint directives

1. No `eslint-*` or `oxlint-*` directive comment, in any form. A wrong rule is turned off in the lint config behind a `files:` glob, with its reason.

### 7. When it fires

1. Commit: staged files only. Pre-push and CI: the whole repo.
2. The staged check picks files by the index but reads the working copy: a partly staged file is checked whole, unstaged hunks included.

## Do's and Don'ts

### Do's

1. **DO** rename before anything else — `fitRoomMinimumPixels`, not `fitRoomMin` plus a comment. (Decision 2)
2. **DO** turn an invariant into a test named for it. (Decision 3)
3. **DO** point at the reason when the reader must see it at the line — `// decision: ARCH-003 §2`. (Decision 5)
4. **DO** keep markers bare — `// ARRANGE`, `// @ts-expect-error`. (Decision 4)
5. **DO** write working comments freely; clear them before you stage the file. (Decision 7)

### Don'ts

1. **DON'T** write JSDoc on an export; move the contract into its type and a test. (Decision 1, 📜 Rule: `no-comments`)
2. **DON'T** put text after a marker — `// ARRANGE the inputs`, `// @ts-expect-error -- wrong on purpose`. (Decision 4)
3. **DON'T** put a URL other than this repo's issue in a pointer. (Decision 5)
4. **DON'T** suppress lint inline — `// eslint-disable-next-line`. (Decision 6)
5. **DON'T** leave a comment in an empty `catch`; remove the `try` if nothing throws, or handle the error. (Decision 1)

## Consequences

**Positive:**

1. **Nothing unchecked to go stale:** every surviving comment is read by a tool.
2. **Reasons in checked homes:** a test fails, a pointer breaks, a name is the code.
3. **Stale pointers fail:** a renamed ADR section turns CI red.
4. **No pattern to copy:** agents meet no comments to imitate.

**Negative:**

1. **Long reasons go dark at read time:** what fits no name survives only in the commit body.
2. **IDE hover is gone:** a contract is read from its type or test.
3. **A closed issue keeps its pointer:** `tech-debt:` stays until the fixing change removes it.
4. **A missing pointer is invisible:** nothing checks that a hazard got one.

**Risks:**

1. **A why deleted as a what.** **Mitigation:** the sweep commit lists every moved why in its body, and review checks it against the diff.
2. **A § renumbered under a pointer still resolves.** **Mitigation:** review reads the target when an ADR's Decision is renumbered.

## Compliance and Enforcement

1. **Rule** `no-comments` (archgate, error): every file in `files:` that the run changed; at commit the staged files, in `npm run verify` every file. It finds comments with its own lexer and checks the registry table against its own.
2. **Lint:** a bare `@ts-expect-error` passes the lint config; any other TS directive still fails.
3. **Review:** a why deleted as a what; a § renumbered under a pointer; name quality.

**Known gaps:** name quality and a missing pointer are checked by review only.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [CodeCrash: Exposing LLM Fragility to Misleading Natural Language in Code Reasoning](https://arxiv.org/abs/2504.14119) — misleading comments degrade LLM code reasoning.
- [TypeScript 3.9 — `// @ts-expect-error` comments](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html) and [Triple-Slash Directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) — the markers tsc reads.
