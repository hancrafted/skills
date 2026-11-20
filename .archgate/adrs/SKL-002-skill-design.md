---
type: adr
id: SKL-002
title: 'Skill Design'
domain: skills
rules: true
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: "How a skill under skills/ is shaped: engineering principles applied to agent instructions, shift-left workflows, declared human gates and one body frame adopted from Addy Osmani's skill anatomy."
---

# Skill Design

## Context

What works for humans works for agents: a module with one job, a stable contract and its detail behind a pointer is easier to load, follow and change. A skill is a module an agent loads into context, so the same principles apply.

Agents also stall where a human must answer. A workflow that asks late, or stops without saying why, cannot run unattended. Asking early, keeping the answers and declaring every stop up front moves the human to the start — shift left.

Scope: authored skills under `skills/`; vendored skills in `.agents/skills/` are excluded. Most of this needs judgement, so a reviewer checks it and it never blocks the gate. The body frame and the shape of the human-gates list are mechanical; what goes inside the frame is judged.

## Decision

### 1. Six principles

1. **Single responsibility:** one job per skill; the description holds one trigger branch per job.
2. **High cohesion:** every step, reference and script serves that job.
3. **Low coupling:** a skill never reads or links another skill's files; skills meet only in a shared domain home.
4. **Dependency inversion:** depend on a contract file — a home's `README.md`, `docs/agents/issue-tracker.md` — never on a concrete tool or another skill's internals. Calling another skill by name, and skipping when it is absent, is allowed.
5. **Progressive disclosure:** `SKILL.md` holds what every branch needs; branch detail sits one link away.
6. **Shift left:** the human moves to the start of the run (Decision 2).

### 2. Shift left and human gates

1. A workflow batches every human decision at its start, then runs to the end.
2. Answers that hold across runs persist in the skill's home, so the next run asks nothing.
3. Stops are declared up front: when, where and why the agent waits for approval.
4. A fixed minimum of gates — irreversible or outward-facing — is written in `SKILL.md`; extra gates are calibrated at setup and stored in the skill's home.
5. A skill with any gate has a `## Human gates` section: a non-empty list, every item one line reading `<trigger>: <reason>`, both parts filled — `Before deleting an unpushed branch: data loss.` (📜 Rule: `skill-human-gates-section`).

### 3. One body frame

1. Every skill follows Addy Osmani's skill anatomy, with fixed sections in this order and a free process middle:

```markdown
# Title

## Overview

## When to Use positive triggers and "NOT for …"

## Context stateful skills only

## Human gates when the skill has gates

## <process H2s> free names; ### N. Step under them

## Common Rationalizations excuse | rebuttal table

## Red Flags observable signs of a violation

## Verification evidence checklist, then ### N. Learn
```

2. Departures from the anatomy: Claude Code frontmatter keys stay allowed; no shared references at the repo root, every skill is self-contained; its bash script rules do not apply; fixed sections use its exact names.
3. Inside the frame: each step ends `_Done when:_ …`; Verification items need evidence — test output, a command's exit code; the last step is `### N. Learn`.
4. Common Rationalizations and Red Flags are required; new rows come from the skill's learnings, never invented.
5. Write the procedure, not the workaround: no step justified only by one model's mistake. Plain prose: one term per concept, imperative mood, no time-sensitive text.

## Do's and Don'ts

### Do's

1. **DO** split a skill whose description needs two unrelated triggers. (Decision 1)
2. **DO** read a home's `README.md`, not the skill that wrote it. (Decision 1)
3. **DO** keep branch detail in `references/`, one link from `SKILL.md`. (Decision 1)
4. **DO** ask every question in one batch before acting, and store answers that hold across runs. (Decision 2)
5. **DO** list each gate as `<trigger>: <reason>` under `## Human gates`. (Decision 2, 📜 Rule: `skill-human-gates-section`)
6. **DO** put irreversible and outward-facing gates in `SKILL.md`; leave the rest to setup. (Decision 2)
7. **DO** end every step with `_Done when:_` and Verification with `### N. Learn`. (Decision 3)
8. **DO** add a rationalization row when a learning shows the excuse. (Decision 3)

### Don'ts

1. **DON'T** link into or read another skill's folder. (Decision 1)
2. **DON'T** hard-code a concrete tool where a contract file names it — `gh issue create` instead of `docs/agents/issue-tracker.md`. (Decision 1)
3. **DON'T** add a step, reference or script that serves another job. (Decision 1)
4. **DON'T** ask the human mid-run for something setup could have stored. (Decision 2)
5. **DON'T** stop for approval at a point the skill never declared. (Decision 2)
6. **DON'T** number H2s as steps — `## 1. Gather` becomes `## Gather` plus `### 1. …`. (Decision 3)
7. **DON'T** add a heading outside the frame — `## See Also` after Verification. (Decision 3)

## Consequences

**Positive:**

1. **Unattended runs:** after the first batch of questions a skill runs to the end or to a declared gate.
2. **Replaceable skills:** readers depend on contracts, so a skill can be rewritten or swapped without moving its data.
3. **Predictable bodies:** every skill has the same sections in the same order, and the agent meets its excuses rebutted before it acts.
4. **Growing autonomy:** extra gates are setup answers, so trust is tuned per repo without editing the skill.

**Negative:**

1. **Refactor cost:** existing skills move numbered H2 steps to H3 and gain Overview, When to Use, Common Rationalizations, Red Flags and Verification.
2. **Context cost:** the three closing sections add about an eighth to every body.
3. **Mostly judgement:** the principles are checked by review, not by the gate.

**Risks:**

1. **Over-splitting:** single responsibility read strictly yields many tiny skills. **Mitigation:** split only when triggers are unrelated.
2. **Undeclared stops:** a body can stop for a human without listing the gate; the rule checks only the list's shape. **Mitigation:** review matches every stop in the body to an item under `## Human gates`.

## Compliance and Enforcement

1. **Frame:** a closed body-structure rule in `skills/markdown-harness.config.yaml` checks Decision 3.1 and the closing Learn step, with an `intent` per heading; `mh check` runs in the pre-commit gate.
2. **Rule** `skill-human-gates-section` (archgate, error; `SKL-002-skill-design.rules.ts`): Decision 2.5 — when `## Human gates` exists, it is a non-empty list whose every item reads `<trigger>: <reason>`.
3. **Review:** `archgate:reviewer` checks Decisions 1, 2.1–2.4 and 3.2–3.5 on every changed `SKILL.md`;.

**Manual review duties:** principles, shift left, content inside the frame and prose; every stop in the body is listed under `## Human gates`.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Skill anatomy — Addy Osmani, agent-skills (MIT)](https://github.com/addyosmani/agent-skills/blob/main/docs/skill-anatomy.md) — the frame, section purposes, writing principles, write the procedure not the workaround.

- [Skill authoring best practices — Anthropic](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) — concision, workflows with checklists, one term per concept, no time-sensitive text.
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — progressive disclosure, persistent notes.
- [GPT-5 prompting guide — OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide) — explicit stop conditions, no contradictions.
