---
type: adr
id: SKL-003
title: 'Skill Context'
domain: skills
rules: false
files: ['skills/*/SKILL.md']
paths: ['skills/**']
description: 'What a skill under skills/ leaves behind for future agents: stateless vs stateful skills, skill and domain homes with a README contract, OKF freshness and one context protocol.'
---

# Skill Context

## Context

Some skills leave nothing behind but their work product — a commit, a cleaned branch. Others write files that change how every later agent behaves: decision records, a glossary, calibration answers. That lasting context is the most valuable and the most dangerous thing a skill produces: it is read without being questioned, and it goes stale silently.

**Context** is what a future session reads to decide how to act, mostly markdown. Work products — code, artifacts — are not context, and neither is a `SKILL.md`.

Without a declaration nobody can tell which skills shape future agents. Without a contract every reader couples to whichever skill wrote the file. Without a date nobody can tell a stale file from a fresh one.

## Decision

### 1. Stateless and stateful skills

1. A **stateless** skill leaves no context behind. A **stateful** skill persists context in a home.
2. A stateful skill MUST declare `metadata.state: stateful` in its frontmatter; no key means stateless.
3. Learnings alone do not make a skill stateful: the learnings skill owns that store.

### 2. Homes

1. A **skill home**, `docs/<skill>/`, is written only by its own skill: setup answers, calibration, its version record — `docs/drive/`.
2. A **domain home**, `docs/<domain>/`, is shared: many skills write it, bound by its README — `docs/decision-records/`.
3. Each home's `README.md` is its contract: contents, format, naming, freshness interval. Writers and readers MUST depend on the README, never on the skill that wrote it.
4. A missing README means setup has not run: the skill runs its setup, asks its questions once, writes the README. For a domain home, the first skill needing it.
5. The skill home README records the writer's version in OKF `generated` — `by: drive@1.4.0`. A skill MUST migrate its home when its own version differs.

### 3. Freshness

1. Every produced context file MUST carry OKF `type` and `stale_after`, interval from its home README. The stateful skill decides which further OKF fields it fills.
2. An append-only log carries `type` only: history does not go stale.
3. A skill MUST compare `stale_after` with today before using a file, and review or refresh a stale one.
4. A markdown-harness rule on a home is recommended, not required: the check on read works without it.

### 4. One context protocol

1. Every stateful skill MUST carry the same protocol block, byte-identical to one canonical copy: check the home README, run setup when it is missing, compare `stale_after` with today on read, migrate when `generated.by` differs (planned rule: `skill-context-protocol`).
2. A stateful skill MUST have a `## Context` section naming every home it reads or writes (planned rule: `skill-context-section`).

## Do's and Don'ts

### Do's

1. **DO** add `metadata.state: stateful` when a skill writes context outside the learnings store. (Decision 1)
2. **DO** keep a skill's own setup, calibration and version record in `docs/<skill>/`. (Decision 2)
3. **DO** run setup and write the README when a home has none. (Decision 2)
4. **DO** set `stale_after` from the home README's interval on every write — `stale_after: 2026-12-20`. (Decision 3)
5. **DO** copy the protocol block verbatim from the canonical copy. (Decision 4, planned rule: `skill-context-protocol`)
6. **DO** name every home under `## Context` — `docs/drive/`, `docs/decision-records/`. (Decision 4, planned rule: `skill-context-section`)

### Don'ts

1. **DON'T** declare a skill stateful because it records learnings. (Decision 1)
2. **DON'T** write into another skill's home. (Decision 2)
3. **DON'T** read or write a domain home without reading its README first. (Decision 2)
4. **DON'T** give an append-only log a `stale_after`. (Decision 3)
5. **DON'T** use a context file past its `stale_after` without reviewing it. (Decision 3)

## Consequences

**Positive:**

1. **Visible state:** the key and the `## Context` section show which skills shape future agents, and where.
2. **Loose coupling:** readers depend on a README, so a writer can be replaced without breaking them.
3. **Freshness anywhere:** the check on read works in repos without markdown-harness.
4. **Safe upgrades:** the version record lets a new skill version migrate its home.
5. **OKF-conform:** context files read as Open Knowledge Format with two fields.

**Negative:**

1. **Duplicated protocol:** each stateful skill carries the same block; the drift check is the price of self-contained skills.
2. **One more question at first run:** setup asks before the first useful result.
3. **Opt-in key:** nothing forces a skill that writes context to declare it.

**Risks:**

1. **A stateful skill without the key** escapes every check. **Mitigation:** review asks of every new `docs/` write which home it lands in.
2. **Domain-home writers drift apart** in format or naming. **Mitigation:** every writer reads the README first; review checks writes against it.

## Compliance and Enforcement

1. **Planned rules** (`SKL-003-skill-context.rules.ts`, error, not yet built): a stateful skill carries the canonical protocol block unchanged and a `## Context` section.
2. **Review:** `archgate:reviewer` checks Decisions 1–3 on every changed `SKILL.md`.

**Manual review duties:** a skill writing context declares the key; its writes land in a home and follow that home's README; produced files carry `type` and, unless append-only, `stale_after`.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Open Knowledge Format — Google Cloud](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) — `type`, `stale_after`, `generated`, `verified`.
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — structured note-taking, persistent memory.
- `docs/decision-records/drive/0008-learnings-move-to-the-learnings-skill.md` — the learnings store.
