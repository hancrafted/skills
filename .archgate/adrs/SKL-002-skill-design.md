---
type: adr
id: SKL-002
title: 'Skill Design'
domain: skills
rules: false
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: 'How a skill under skills/ is shaped: engineering principles applied to agent instructions, shift-left workflows, declared human gates and two body skeletons.'
---

# Skill Design

## Context

What works for humans works for agents: a module with one job, a stable contract and its detail behind a pointer is easier to load, follow and change. A skill is a module an agent loads into context, so the same principles apply.

Agents also stall where a human must answer. A workflow that asks late, or stops without saying why, cannot run unattended. Asking early, keeping the answers and declaring every stop up front moves the human to the start — shift left.

Most of this needs judgement; a reviewer checks it. Only the human-gates heading is mechanical.

## Decision

### 1. Principles

1. **Single responsibility:** one job per skill; the description holds one trigger branch per job.
2. **High cohesion:** every step, reference and script serves that job.
3. **Low coupling:** a skill never reads or links another skill's files; skills meet only in a shared domain home.
4. **Dependency inversion:** depend on a contract file — a home's `README.md`, `docs/agents/issue-tracker.md` — never on a concrete tool or another skill's internals. Calling another skill by name, and skipping when it is absent, is allowed.
5. **Progressive disclosure:** `SKILL.md` holds what every branch needs; branch detail sits one link away.

### 2. Shift left

1. A workflow batches every human decision at its start, then runs to the end.
2. Answers that hold across runs persist in the skill's home, so the next run asks nothing.
3. Stops are declared up front: when, where and why the agent waits for approval.
4. A fixed minimum of gates — irreversible or outward-facing actions — lives in `SKILL.md`; extra gates are calibrated at setup and stored in the skill's home.
5. A skill with any gate has a `## Human gates` section; each item names its trigger, then its reason after a colon — `Before deleting an unpushed branch: data loss.` (planned rule: `skill-human-gates-section`).

### 3. Two body skeletons

1. **Task skill:** H2 is a phase or topic, never a step; H3 `### N. <Step>` enumerates steps; each step ends `_Done when:_ …`; the last step is `### N. Learn`.
2. **Reference skill:** topic H2s, no steps.
3. Every skill writes clear prose: one term per concept, imperative mood, no time-sensitive text — `before August 2025`.

Task skill:

```markdown
# Cleanup

Removes merged branches and worktrees. Not for unmerged work.

## Human gates

- Before deleting a branch with unpushed commits: data loss.

## Gather

### 1. Choose the mode

… _Done when:_ the mode is named.

## Act

### 2. Remove what was authorized

… _Done when:_ every authorized item is gone.

### 3. Learn

If `/learnings` is available, run it. Otherwise skip.
```

Reference skill:

```markdown
# Commit

Writes a Conventional Commits message with a Keep a Changelog body.

## The message contract

…

## Setting up the gate

…
```

## Do's and Don'ts

### Do's

1. **DO** split a skill whose description needs two unrelated triggers. (Decision 1)
2. **DO** read a home's `README.md` instead of the skill that wrote it. (Decision 1)
3. **DO** ask every question in one batch before acting. (Decision 2)
4. **DO** list each stop with its trigger and reason under `## Human gates`. (Decision 2, planned rule: `skill-human-gates-section`)
5. **DO** end every step with `_Done when:_`. (Decision 3)

### Don'ts

1. **DON'T** link into another skill's folder. (Decision 1)
2. **DON'T** ask the human mid-run for something setup could have stored. (Decision 2)
3. **DON'T** number H2s as steps — `## 1. Gather` becomes `## Gather` plus `### 1. …`. (Decision 3)

## Consequences

**Positive:**

1. **Unattended runs:** after the first batch of questions a skill runs to the end or to a declared gate.
2. **Replaceable skills:** readers depend on contracts, so a skill can be rewritten or swapped without moving its data.
3. **Predictable bodies:** an agent finds steps, gates and phases at the same levels in every skill.

**Negative:**

1. **Refactor cost:** the existing skills move their numbered H2 steps to H3.
2. **Mostly judgement:** the principles are checked by review, not by the gate.

**Risks:**

1. **Over-splitting:** single responsibility read strictly yields many tiny skills. **Mitigation:** split only when triggers are unrelated.

## Compliance and Enforcement

1. **Rule** (`SKL-002-skill-design.rules.ts`, error): a `## Human gates` section is a list whose every item reads `<trigger>: <reason>`.
2. **Review:** `archgate:reviewer` checks Decisions 1, 2.1–2.4 and 3 on every changed `SKILL.md`.

**Manual review duties:** principles, shift left, skeleton fit and prose; a skill that stops for a human has the `## Human gates` section.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Skill authoring best practices — Anthropic](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) — concision, workflows with checklists, one term per concept, no time-sensitive text.
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — progressive disclosure, persistent notes.
- [GPT-5 prompting guide — OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide) — explicit stop conditions, no contradictions.
