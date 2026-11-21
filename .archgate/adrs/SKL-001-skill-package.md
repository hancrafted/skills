---
type: adr
id: SKL-001
title: 'Skill Package'
domain: skills
rules: true
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: 'What a skill folder under skills/ is: a portable Agent Skills package whose frontmatter, size, links and layout are checked mechanically.'
---

# Skill Package

## Context

Agents write every skill here, and edit them often. Without a checked shape a skill drifts: a description loses its trigger, a body grows past what loads cheaply, a reference hides two links deep. The Agent Skills specification and Anthropic's authoring guide set the floor; the house rules on top are stricter where they are cheap to check. The layout is stricter than the specification, which allows any file beside `SKILL.md`.

Why the less obvious rules: Claude Code re-attaches only the first 5,000 tokens of a skill after compaction, so a longer body loses its tail. Claude may preview a file reached through another reference and read it incompletely, so every reference links from `SKILL.md`. A description that summarises the workflow lets an agent follow the summary instead of the skill. A Claude Code–only key makes a skill non-uploadable to claude.ai and the API; the spec keys alone stay portable. `package.json` matters in an installed copy: Node takes a `.ts` file's module system from the nearest `package.json`, which may be a consumer's CommonJS one.

Scope: authored skills under `skills/`; vendored skills in `.agents/skills/` are excluded. This record holds only what a machine can check, so every rule here blocks. Design judgement and persisted context are out of scope. Each decision cites its source in References; `[^house]` marks a decision with none.

## Decision

### 1. Frontmatter is the spec plus Claude Code's documented fields

1. Allowed keys: the spec's and Claude Code's documented ones (`when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, `shell`); any other key fails.[^spec][^cc]
2. `name` matches the spec pattern — `cleanup`, `to-review` — and equals the folder name (📜 Rule: `skill-name-matches-folder`).[^spec]
3. `description` is at most 1024 characters, third person, free of XML tags, and contains `Use when`.[^spec][^anthropic][^addy]
4. `description` states what the skill does before `Use when` (config check `skill-description-purpose-first`) and never summarises the workflow.[^addy][^anthropic]

### 2. The body loads cheaply

1. `SKILL.md` is at most 500 lines and about 5,000 tokens (📜 Rule: `skill-size-budget`); tokens are characters / 4.[^anthropic][^cc]
2. Exactly one H1.[^house]
3. Every reference is linked from `SKILL.md`; a reference fails only when it links a file `SKILL.md` does not (📜 Rule: `skill-links-one-level`).[^anthropic][^spec]
4. A reference over 100 lines opens with a table of contents (📜 Rule: `skill-reference-toc`).[^anthropic]

### 3. The layout is closed, each entry sourced

1. The top level holds only `SKILL.md` and the entries below (📜 Rule: `skill-allowed-layout`).[^spec]
2. `scripts/`, `references/`, `assets/`: the spec's folders; lookup data goes in `assets/`.[^spec]
3. `agents/`: Codex's `agents/openai.yaml`.[^codex]
4. `evals/`: skill-creator's `evals/evals.json`.[^cc]
5. `GLOSSARY.md`, `CHANGELOG.md`, `markdown-harness.config.yaml`: the skill's vocabulary, version history and markdown checks.[^house]
6. `package.json` holds `{"type":"module"}` so `.ts` scripts load as ES modules once installed.[^node]
7. Descriptive file names, forward slashes, no capitalisation rule (no source states one).[^anthropic]

## Do's and Don'ts

### Do's

1. **DO** front-load the description with what the skill does, then its trigger — `Commits staged work with a checked message. Use when the user asks to commit…`. (Decision 1)[^addy]
2. **DO** name the folder and the `name` key the same. (Decision 1, 📜 Rule: `skill-name-matches-folder`)[^spec]
3. **DO** move branch detail into `references/` before the body nears 500 lines or 5,000 tokens. (Decision 2, 📜 Rule: `skill-size-budget`)[^anthropic][^cc]
4. **DO** keep one H1. (Decision 2)[^house]
5. **DO** link every reference straight from `SKILL.md`. (Decision 2, 📜 Rule: `skill-links-one-level`)[^anthropic]
6. **DO** open a long reference with its contents. (Decision 2, 📜 Rule: `skill-reference-toc`)[^anthropic]
7. **DO** put new material in a known folder, and lookup data in `assets/`. (Decision 3, 📜 Rule: `skill-allowed-layout`)[^spec]

### Don'ts

1. **DON'T** invent a frontmatter key; use `metadata` for custom data. (Decision 1)[^spec]
2. **DON'T** write the description in the first or second person, or as a workflow summary. (Decision 1)[^anthropic][^addy]
3. **DON'T** let a reference link a file `SKILL.md` does not link — `references/a.md` reaching `references/b.md` that only it mentions. (Decision 2)[^anthropic]
4. **DON'T** keep learnings or notes in the skill folder; they belong in the learnings store. (Decision 3)[^house]
5. **DON'T** add a home-grown top-level folder; propose it as a new entry with a source. (Decision 3)[^spec]

## Consequences

**Positive:**

1. **Portable floor:** every skill passes the spec, so it installs on any Agent Skills host.
2. **Drift fails early:** an agent's broken edit fails at commit, with a message it can act on.
3. **Cheap context:** a capped body and linked references keep each load small, and compaction keeps all of it.

**Negative:**

1. **Claude Code keys cost portability:** a skill using them cannot be uploaded to claude.ai.
2. **Layout is closed:** a new kind of folder needs this record changed first.
3. **Installed copies carry `package.json`:** one non-spec file per script skill.

**Risks:**

1. **A passing description can still trigger badly.** **Mitigation:** reviewer judgement and the skill's evals.
2. **Rules check shape, not sense:** a link rule cannot tell a needed reference from a padded one. **Mitigation:** reviewer judgement.

## Compliance and Enforcement

1. **Frontmatter:** `skills/markdown-harness.config.yaml` checks Decision 1 (except name equals folder) with `mh check`, in `npm run verify` and the pre-commit gate (`verify:commit`).
2. **Rules** (`SKL-001-skill-package.rules.ts`, error): Decisions 1.2, 2.1 (lines and tokens), 2.3, 2.4 and 3.1 over `skills/*/`, run by `archgate check`.
3. **Description opening:** the frontmatter config also fails a description that starts with `Use when` (Decision 1.4, `skill-description-purpose-first`); a config check, not an archgate rule, so it carries no 📜 marker.

**Manual review duties:** 1.4 no workflow summary, 3.7 file naming and path style.

**Exceptions:** raise a separate ADR; human approval required.

## References

[^house]: House rule: no external source; decided for this repository's skills, 2026-11-20/21.

[^spec]: [Agent Skills specification](https://agentskills.io/specification) — fields, name pattern, description cap, optional folders, one-level references, 500 lines and 5,000 tokens.

[^anthropic]: [Skill authoring best practices — Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — 500-line body, references one level deep from `SKILL.md`, contents for long references, third-person descriptions, descriptive file names, forward slashes.

[^cc]: [Skills — Claude Code](https://code.claude.com/docs/en/skills) — Claude Code frontmatter fields, portable fields, 5,000-token re-attach after compaction, skill-creator `evals/evals.json`.

[^codex]: [Build skills — OpenAI Codex](https://learn.chatgpt.com/docs/build-skills) — `agents/openai.yaml`.

[^addy]: [agent-skills@8c99fa3:docs/skill-anatomy.md](https://github.com/addyosmani/agent-skills/blob/8c99fa36d90068c82d547f7c12a9d67a3e95f4ee/docs/skill-anatomy.md) — what the skill does, then "Use when"; do not summarize the workflow in the description.

[^node]: [Node.js — TypeScript, determining the module system](https://nodejs.org/api/typescript.html) — `.ts` files take their module system from the nearest `package.json` `"type"`.
