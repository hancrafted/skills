---
type: adr
id: SKL-002
title: 'Skill Design'
domain: skills
rules: true
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: "How a skill under skills/ is shaped: seven checkable design rules, declared human gates and one body frame adopted from Addy Osmani's skill anatomy."
---

# Skill Design

## Context

An author agent and a reviewer read a skill's design rules; the agent that runs the skill never does. A rule earns its place only if an author can apply it and a reviewer can flag a breach. Engineering names such as cohesion or dependency inversion do not meet that bar: no source shows they change agent behaviour. The seven rules below are the behaviours the sources support, each with one example.

Scope: authored skills under `skills/`; vendored skills in `.agents/skills/` are excluded. Most of this needs judgement, so a reviewer checks it and it never blocks the gate. The body frame and the shape of the human-gates list are mechanical; what goes inside the frame is judged.

The frame follows Addy Osmani's skill anatomy. Our departures from it: Claude Code frontmatter keys stay allowed; no shared references at the repository root, every skill is self-contained; his bash-script rules do not apply; Context and Human gates follow When to Use, and Learn is the last step under Verification; fixed sections use his names while the process middle is free.

Each decision cites its source in References; `[^house]` marks one with none.

## Decision

### 1. Seven design rules

1. **One job.** Split a skill when a second trigger should fire part of it alone, or another skill must call that part; otherwise every H2 serves a branch of the description. A monitor mode with its own trigger sits behind a link.[^anthropic][^mattpocock]
2. **Self-contained.** Read only the skill's folder and a contract file; call another skill by name and skip it when absent. Read a home's `README.md`, not the skill that wrote it.[^spec][^addy][^mattpocock]
3. **Progressive disclosure.** `SKILL.md` holds what every branch needs; what only some branches reach sits one link away.[^anthropic][^addy][^mattpocock]
4. **Specific and checkable.** Each step names a command or artifact and ends `_Done when:_` with something observable: "`check` prints one line per store", not "the store is valid".[^addy][^mattpocock]
5. **Decide before acting.** An interview skill asks in rounds, each question with a recommended answer; after the decision point it stops only at a listed gate.[^cursor][^gpt5]
6. **Every line changes behaviour.** Cut what the model does anyway or what one model's mistake alone justifies; state the target, not a ban; one term per concept, imperative mood, nothing time-sensitive.[^addy][^mattpocock][^anthropic]
7. **Encode lessons as structure.** A recurring learning becomes a check before it becomes prose.[^cursor][^retro]

### 2. Human gates

1. `SKILL.md` lists the minimum gates, irreversible or outward-facing; setup may add more, stored in the skill's home.[^house]
2. A skill with any gate has a `## Human gates` section: a non-empty list, each item `<trigger>: <reason>` — `Before deleting an unpushed branch: data loss.` (📜 Rule: `skill-human-gates-section`).[^gpt5]

### 3. One body frame

1. Fixed sections in Addy's order, a free process middle:[^addy]

```markdown
# Title

## Overview

## When to Use triggers, "NOT for …"

## Context stateful skills

## Human gates skills with gates

## <process H2s> ### N. Step

## Common Rationalizations

## Red Flags

## Verification ### N. Learn last
```

2. Common Rationalizations and Red Flags are required once the skill has a learning, each row a general excuse citing its incident; before that they may be absent.[^house]
3. Verification items need evidence: test output, an exit code.[^addy]

## Do's and Don'ts

### Do's

1. **DO** split a skill whose description needs two unrelated triggers. (Decision 1)[^mattpocock]
2. **DO** depend on a home's `README.md`, never on the skill that wrote it. (Decision 1)[^mattpocock]
3. **DO** keep branch detail one link from `SKILL.md`. (Decision 1)[^anthropic]
4. **DO** end every step with `_Done when:_` and an observable result. (Decision 1)[^addy]
5. **DO** ask in rounds, each question with a recommended answer, before acting, and store answers that hold across runs. (Decision 1)[^cursor]
6. **DO** delete a sentence the model follows without it. (Decision 1)[^mattpocock]
7. **DO** add a check when a learning recurs. (Decision 1)[^retro]
8. **DO** list each gate as `<trigger>: <reason>` under `## Human gates`. (Decision 2, 📜 Rule: `skill-human-gates-section`)[^gpt5]
9. **DO** end Verification with `### N. Learn`. (Decision 3)[^house]

### Don'ts

1. **DON'T** link into or read another skill's folder. (Decision 1)[^addy]
2. **DON'T** hard-code a concrete tool where a contract file names it: `gh issue create` instead of the tracker contract. (Decision 1)[^mattpocock]
3. **DON'T** add a step, reference or script that serves another job. (Decision 1)[^addy]
4. **DON'T** stop for approval at a point the skill never declared. (Decision 2)[^gpt5]
5. **DON'T** number H2s as steps: `## 1. Gather` becomes `## Gather` plus `### 1. …`. (Decision 3)[^house]
6. **DON'T** add a heading outside the frame: `## See Also` after Verification. (Decision 3)[^house]
7. **DON'T** invent a rationalization row; take it from an incident. (Decision 3)[^house]

## Consequences

**Positive:**

1. **Checkable rules:** each design rule has an example a reviewer can flag against.
2. **Unattended runs:** after the first round of questions a skill runs to its end or a declared gate.
3. **Predictable bodies:** every skill has the same sections in the same order.

**Negative:**

1. **Refactor cost:** a skill moves numbered H2 steps to H3 and gains the frame's sections.
2. **Context cost:** the closing sections add about an eighth to a body.
3. **Mostly judgement:** review checks the rules, not the gate.

**Risks:**

1. **Over-splitting:** one job read strictly yields many tiny skills. **Mitigation:** split only on a distinct trigger or caller.
2. **Undeclared stops:** a body can stop for a human without listing the gate; the rule checks only the list's shape. **Mitigation:** review matches every stop to an item under `## Human gates`.

## Compliance and Enforcement

1. **Frame:** a closed body-structure rule in `skills/markdown-harness.config.yaml` checks Decision 3.1 and the closing Learn step, with an `intent` per heading pointing to `docs/skills/skill-anatomy.md` (Addy's section purposes, why each heading exists, our departures); `mh check` runs in the pre-commit gate.
2. **Rule** `skill-human-gates-section` (archgate, error; `SKL-002-skill-design.rules.ts`): Decision 2.2 — when `## Human gates` exists, it is a non-empty list whose every item reads `<trigger>: <reason>`.
3. **Review:** `archgate:reviewer` checks Decisions 1, 2.1 and 3.2–3.3 on every changed `SKILL.md`.

**Manual review duties:** the seven rules, content inside the frame, and that every stop in the body is listed under `## Human gates`.

**Exceptions:** raise a separate ADR; human approval required.

## References

[^house]: House rule: no external source; decided for this repository's skills, 2026-11-20/21.

[^spec]: [Agent Skills specification](https://agentskills.io/specification) — a skill is a self-contained folder.

[^anthropic]: [Skill authoring best practices — Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — descriptions pick one skill from many, concision, one term per concept, no time-sensitive text, references one level deep.

[^addy]: [agent-skills@8c99fa3:docs/skill-anatomy.md](https://github.com/addyosmani/agent-skills/blob/8c99fa36d90068c82d547f7c12a9d67a3e95f4ee/docs/skill-anatomy.md) — the frame, section purposes, writing principles (specific over general, evidence over assumption, token-conscious, model-neutral), cross-skill references by name, the shared-references install gap.

[^mattpocock]: [mattpocock-skills@abeeaf9:skills/productivity/writing-for-agents/SKILL.md](https://github.com/mattpocock/skills/blob/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/productivity/writing-for-agents/SKILL.md) — hierarchy, completion criterion, no-ops, negation; `SKILL-MECHANICS.md` beside it holds the split rule.

[^retro]: [mattpocock-skills@abeeaf9:skills/engineering/retro/SKILL.md](https://github.com/mattpocock/skills/blob/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/engineering/retro/SKILL.md) — default to building the check over writing the rule.

[^cursor]: [cursor-plugins@aaeb0ea:pstack/skills/principle-encode-lessons-in-structure/SKILL.md](https://github.com/cursor/plugins/blob/aaeb0ea3a0584995aa8f55ce44c6c5259414b896/pstack/skills/principle-encode-lessons-in-structure/SKILL.md) — encode the rule as a check, not more text; `principle-never-block-on-the-human` beside it covers proceeding past reversible questions.

[^gpt5]: [GPT-5 prompting guide — OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide) — explicit stop conditions, no contradictions.
