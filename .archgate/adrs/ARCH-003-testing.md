---
type: adr
id: ARCH-003
title: 'Testing'
domain: architecture
rules: true
files: ['{skills/*/scripts,tools}/**/*.test.ts']
paths: ['{skills/*/scripts,tools}/**/*.test.ts', '{skills/*/scripts,tools}/**/*.pure.ts']
description: 'Trustworthy test siblings for skill scripts and tools: deterministic execution, three suite blocks, marked bodies, explicit expectations, and slow browser graders that retry without sleep.'
---

# Testing

## Context

Test-driven development (TDD) and the red-green-refactor cycle are the primary agentic coding practices. Because agents optimizing for a green signal routinely introduce mocks, skips, and ambient shortcuts that destroy test validity, this ADR establishes behavioral boundaries and uniform suite structures to keep passing tests trustworthy proof and missing cases visible.

## Decision

### 1. Determinism and Real Execution

1. Tests MUST execute real code with explicit time, seeds, inputs and expectations; browser fixtures MUST be local. No ambient state, remote network, framework mocks, spies, snapshots, skips or assertion-free bodies.

### 2. Suite structure

1. Skill-script and tool tests MUST have exactly three top-level blocks: `success cases`, `failure cases`, `edge cases`, each with a test; a fast/slow sibling pair MAY share them. (📜 Rule: `suite-three-blocks`)
2. Tests MUST sit in suites nested at most twice.

### 3. Test-body structure

1. Bodies MUST mark `// ARRANGE`, `// ACT`, `// ASSERT` once each, in order, on separate comments. (📜 Rule: `test-body-aaa`)
2. Expectations MUST be named in ARRANGE; ASSERT forbids magic strings/numbers except `0`, `1`, `-1`, booleans, nullish and empty values. (📜 Rule: `assert-no-magic`)
3. ACT observes; ASSERT uses rich matchers, not collapsed booleans.

### 4. Where a test lives

1. Tests MUST sit beside skill-script/tool subjects. Root shell-contract tests are outside automated shape rules.
2. Tests MUST use user-approved public seams; Node builtins MAY supply fixtures.
3. Seconds-long, live-disk or browser tests MUST use `*.slow.test.ts`; fast tests cost well under a second.
4. Slow tests MUST name disk inputs as rerun triggers; nightly runs all, pre-push runs changed tests.

### 5. Browser tests wait on the page

1. Browser graders MUST use the slow lane's long timeout, retrying assertions and observable page readiness.
2. Browser tests MUST NOT sleep or assert one-shot reads — no `waitForTimeout`, `setTimeout`, `delay`.

## Do's and Don'ts

### Do's

1. **DO** supply explicit inputs and handwritten expectations. (Decision 1)
2. **DO** keep handwritten boundary stand-ins visible in the test file. (Decision 1)
3. **DO** fill `success cases`, `failure cases`, `edge cases`; an unfillable block questions the subject. (Decision 2, 📜 Rule: `suite-three-blocks`)
4. **DO** mark ARRANGE, ACT, ASSERT and name expectations before asserting. (Decision 3, 📜 Rule: `test-body-aaa`)
5. **DO** test `*.pure.ts` from same-name siblings. (Decision 4)
6. **DO** put expensive/browser tests in the slow lane with disk rerun triggers. (Decision 4)
7. **DO** compare before/after observations to prove absent side effects. (Decision 1)
8. **DO** use long browser timeouts and retrying page-condition assertions. (Decision 5)

### Don'ts

1. **DON'T** call ambient clocks, `Math.random()` or argument-free `new Date()`. (Decision 1)
2. **DON'T** use `.only`, `.skip`, assertion-free bodies, snapshot matchers, `vi`/`jest` mocks or spies. (Decision 1)
3. **DON'T** let the subject compute its own expected value. (Decision 1)
4. **DON'T** inline magic strings/numbers in ASSERT. Strings: by review. (Decision 3, 📜 Rule: `assert-no-magic`)
5. **DON'T** prove absent side effects against an assumed pristine baseline. (Decision 1)
6. **DON'T** sleep or assert `expect(await el.isVisible())`; use retrying assertions. (Decision 5)

## Consequences

### Positive

- **Tests are dependable evidence.** Real execution and explicit expectations keep green meaningful.
- **Missing cases surface immediately.** The mandatory three-block split (`success cases`, `failure cases`, `edge cases`) forces unhandled errors and edge cases to be confronted explicitly.
- **Browser tests run as fast as the page.** No sleep pads a run, and a timeout names the element that never arrived.

### Negative

- **Collaborator substitution requires hand-written stand-ins.** In-file test doubles are more verbose than `vi.spyOn`, trading brevity for transparency.
- **Slow tests run later still.** A `*.slow.test.ts` fails at push, or the next night when the change it missed was not its trigger; never at commit or on the pull request.
- **Browser readiness carries a contract.** A missing page condition fails only when its explicit timeout expires.

### Risks

- **Bans bypassed via helper imports.** Non-deterministic calls or mocks can hide behind local imports. **Mitigation:** code review inspects test utilities and their import boundaries.
- **A sleep hides behind a helper.** A wrapper named `waitForAnimation` can still sleep. **Mitigation:** review reads browser helpers and checks waits against page conditions.
- **Stand-in complexity creep.** Hand-written doubles could accumulate hidden framework-like behavior. **Mitigation:** stand-ins must stay in the test file, keeping growth visible in diffs.

## Compliance and Enforcement

1. **Rules** (archgate, error): `suite-three-blocks` (§2.1), `test-body-aaa` (§3.1), `assert-no-magic` (§3.2, numbers only), over test siblings under `skills/*/scripts/` and `tools/`.
2. **Test lanes:** the fast suite excludes `*.slow.test.ts` (§4.3); pre-push runs the slow tests a branch affects.
3. **Nightly CI:** runs the slow lane in full, and files every fast-suite test over its time budget as an issue (§4).
4. **Review:** browser graders run only in the slow lane, use a long explicit timeout and retry observations without sleep (§5).

**Manual review duties:** real execution, explicit local inputs and expectations (§1); suite depth and cases (§2); named expectations and rich matchers (§3); approved seams, lane placement and disk triggers (§4); long browser timeouts, retrying observations and sleep-free helpers (§5).

**Exceptions:** amend this record; never an inline suppression.

## References

- [Vitest Test API](https://vitest.dev/api/) — assertions, runner controls, and test lifecycle.
- [Playwright — auto-waiting](https://playwright.dev/docs/actionability) and [web-first assertions](https://playwright.dev/docs/test-assertions) — the waits §5 asks for.
- [eslint-plugin-playwright](https://github.com/mskelton/eslint-plugin-playwright) — `no-wait-for-timeout`, `prefer-web-first-assertions`.
