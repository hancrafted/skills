# Skill anatomy

Why a skill's `SKILL.md` has the frame it has. The frame is Addy Osmani's skill anatomy; this page quotes its section purposes verbatim, says why each heading exists here, and lists where this repository departs from it. The rule that holds the frame is in `.archgate/adrs/SKL-002-skill-design.md`.

## Contents

- [Addy's section purposes, verbatim](#addys-section-purposes-verbatim)
- [Why each heading exists](#why-each-heading-exists)
- [Our departures](#our-departures)

## Addy's section purposes, verbatim

Source: [agent-skills@8c99fa3:docs/skill-anatomy.md](https://github.com/addyosmani/agent-skills/blob/8c99fa36d90068c82d547f7c12a9d67a3e95f4ee/docs/skill-anatomy.md), "Section Purposes". MIT License, Copyright (c) 2025 Addy Osmani. The quoted text is unchanged, apart from heading levels shifted down one.

> #### Overview
>
> The "elevator pitch" for the skill. Should answer: What does this skill do, and why should an agent follow it?
>
> #### When to Use
>
> Helps agents and humans decide if this skill applies to the current task. Include both positive triggers ("Use when X") and negative exclusions ("NOT for Y").
>
> #### Core Process
>
> The heart of the skill. This is the step-by-step workflow the agent follows. Must be specific and actionable — not vague advice.
>
> **Good:** "Run `npm test` and verify all tests pass"
> **Bad:** "Make sure the tests work"
>
> #### Common Rationalizations
>
> The most distinctive feature of well-crafted skills. These are excuses agents use to skip important steps, paired with rebuttals. They prevent the agent from rationalizing its way out of following the process.
>
> Think of every time an agent has said "I'll add tests later" or "This is simple enough to skip the spec" — those go here with a factual counter-argument.
>
> #### Red Flags
>
> Observable signs that the skill is being violated. Useful during code review and self-monitoring.
>
> #### Verification
>
> The exit criteria. A checklist the agent uses to confirm the skill's process is complete. Every checkbox should be verifiable with evidence (test output, build result, screenshot, etc.).

## Why each heading exists

- **Overview:** the reason to follow the skill, in one or two sentences, read once the description has already loaded it.
- **When to Use:** a scope check inside the loaded body: positive triggers, plus "NOT for …" so the agent hands near-miss tasks to a sibling instead of running the procedure.
- **Context:** present only in stateful skills; it names every home the skill reads or writes, so a reader knows what persists.
- **Human gates:** declares every stop for a human before the run starts, one `<trigger>: <reason>` per line, so no stop is a surprise.
- **Process H2s with `### N.` steps:** the procedure. H2 groups a phase or topic; H3 is always a step that ends `_Done when:_` with something observable.
- **Common Rationalizations:** the excuse an agent used to skip a step, with its rebuttal. It exists only once a real incident supplies the row.
- **Red Flags:** observable signs that the skill is being violated, for self-monitoring and review.
- **Verification:** the skill-level exit criteria, each item provable with evidence; `### N. Learn` closes it so a correction or failure is recorded.

## Our departures

1. **Frontmatter keys:** Claude Code's documented keys stay allowed beside the specification's; Addy limits keys to the specification.
2. **No shared references at the root:** every skill is self-contained, so a per-skill install carries everything it links.
3. **Script rules:** Addy's bash-script rules (`#!/bin/bash`, `set -e`, stderr status) do not apply; skills here use TypeScript scripts.
4. **Placement:** Context and Human gates follow When to Use, and Learn is the last step under Verification.
5. **Names:** fixed sections use Addy's exact names; only the process middle is free.
