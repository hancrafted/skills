---
type: adr
id: SKL-001
title: 'Skill Package'
domain: skills
rules: false
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: 'What a skill folder under skills/ is: a portable Agent Skills package whose frontmatter, size, links and layout are checked mechanically.'
---

# Skill Package

## Context

Agents write every skill here, and edit them often. Without a checked shape a skill drifts: a description loses its trigger, a body grows past what loads cheaply, a reference hides two links deep. The Agent Skills specification (agentskills.io) and Anthropic's authoring guide set the floor; the house rules on top are stricter where they are cheap to check.

This record holds only what a machine can check. Judgement lives in the Skill Design record; what a skill leaves behind lives in the Skill Context record.

## Decision

### 1. Frontmatter is the spec plus Claude Code's documented fields

1. Allowed keys: the spec's (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`) and Claude Code's documented ones — `when_to_use`, `argument-hint`, `disable-model-invocation` and the rest. Any other key fails, so a typo fails.
2. `name` matches the spec pattern — `cleanup`, `to-review` — and equals the skill's folder name (planned rule: `skill-name-matches-folder`).
3. `description` is at most 1024 characters, contains `Use when`, carries no XML tags and does not open with `I ` or `You `.
4. A Claude Code–only key makes a skill non-uploadable to claude.ai and the API. That is accepted; the spec keys alone stay portable.

### 2. The body loads cheaply

1. `SKILL.md` is at most 500 lines (planned rule: `skill-size-budget`).
2. Exactly one H1, the skill's title (planned rule: `skill-single-h1`).
3. Links from `SKILL.md` go one level deep: `SKILL.md` → `references/setup.md`, never on to a third file (planned rule: `skill-links-one-level`).
4. A reference file over 100 lines opens with a table of contents (planned rule: `skill-reference-toc`).

### 3. The layout is fixed

1. A skill folder holds only `SKILL.md`, the known folders (`scripts/`, `references/`, `assets/`, `agents/`, `evals/`, `catalog/`) and the known files (`GLOSSARY.md`, `CHANGELOG.md`, `package.json`, `markdown-harness.config.yaml`) (planned rule: `skill-allowed-layout`).
2. Paths use forward slashes; file names say what they hold — `references/setup.md`, not `doc2.md`.

## Do's and Don'ts

### Do's

1. **DO** front-load the description's trigger — `Use when the user asks to commit…`. (Decision 1)
2. **DO** name the folder and the `name` key the same. (Decision 1, planned rule: `skill-name-matches-folder`)
3. **DO** move branch detail into `references/` before the body nears 500 lines. (Decision 2, planned rule: `skill-size-budget`)
4. **DO** keep one H1. (Decision 2, planned rule: `skill-single-h1`)
5. **DO** link every reference straight from `SKILL.md`. (Decision 2, planned rule: `skill-links-one-level`)
6. **DO** open a long reference with its contents. (Decision 2, planned rule: `skill-reference-toc`)
7. **DO** put new material in a known folder. (Decision 3, planned rule: `skill-allowed-layout`)

### Don'ts

1. **DON'T** invent a frontmatter key; use `metadata` for custom data. (Decision 1)
2. **DON'T** write the description in the first or second person. (Decision 1)
3. **DON'T** chain references — `references/a.md` linking `references/b.md` for a step. (Decision 2)
4. **DON'T** keep learnings or notes in the skill folder; they belong in the repo's learnings store. (Decision 3)

## Consequences

**Positive:**

1. **Portable floor:** every skill passes the spec, so it installs on any Agent Skills host.
2. **Drift fails early:** an agent's broken edit fails at commit, with a message it can act on.
3. **Cheap context:** a capped body and one-level links keep each load small.

**Negative:**

1. **Claude Code keys cost portability:** a skill using them cannot be uploaded to claude.ai.
2. **Layout is closed:** a new kind of folder needs this record changed first.

**Risks:**

1. **A passing description can still trigger badly.** **Mitigation:** the Skill Design record's review and the skill's evals.

## Compliance and Enforcement

1. **Frontmatter:** `skills/markdown-harness.config.yaml` checks Decision 1 with `mh check`, in `npm run verify` and the pre-commit gate.
2. **Rules** (`SKL-001-skill-package.rules.ts`, error): Decisions 1.2, 2 and 3.1 over `skills/*/`.

**Manual review duties:** 3.2 file naming.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Agent Skills specification](https://agentskills.io/specification) — fields, name pattern, description cap, folders.
- [Skill authoring best practices — Anthropic](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) — 500-line body, one-level references, contents for long references, third-person descriptions.
- [Skills — Claude Code](https://code.claude.com/docs/en/skills) — Claude Code frontmatter fields.
