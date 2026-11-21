---
type: adr
id: SKL-003
title: 'Skill Context'
domain: skills
rules: true
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

1. A **stateless** skill leaves no context behind. A **stateful** skill persists context in a home.[^house]
2. A stateful skill MUST declare `metadata.state: stateful` in its frontmatter; no key means stateless.[^house]
3. Learnings alone do not make a skill stateful: the learnings skill owns that store.[^house]

### 2. Homes

1. A **skill home**, `docs/<skill>/`, is written only by its own skill: setup answers, calibration, its version record.[^house]
2. A **domain home**, `docs/<domain>/`, is shared by many skills and bound by its README.[^house]
3. Each home's `README.md` is its contract: contents, format, naming, freshness interval. Writers and readers MUST depend on it, never on the skill that wrote it.[^mattpocock]
4. A missing README means setup has not run: the skill runs its setup, asks its questions once, writes the README; for a domain home, the first skill needing it.[^mattpocock]
5. The skill home README records the writer's version in OKF `generated` — `by: <skill>@1.4.0`. A skill MUST migrate its home when its own version differs.[^okf]

### 3. Freshness

1. Every produced context file MUST carry OKF `type` and `stale_after`, interval from its home README.[^okf]
2. An append-only log carries `type` only: history does not go stale.[^okf]
3. A skill MUST compare `stale_after` with today before using a file, and review or refresh a stale one.[^okf][^anthropic-ctx]
4. A freshness check on a home is recommended, not required: the check on read works without it.[^house]

### 4. One context protocol

1. Every stateful skill MUST carry one protocol block, byte-identical to a canonical copy: check the home README, run setup when missing, compare `stale_after` on read, migrate when `generated.by` differs (📜 Rule: `skill-context-protocol`).[^house]
2. A stateful skill MUST have a `## Context` section naming every home it reads or writes (📜 Rule: `skill-context-section`).[^house]

## Do's and Don'ts

### Do's

1. **DO** add `metadata.state: stateful` when a skill writes context outside the learnings store. (Decision 1)[^house]
2. **DO** keep a skill's own setup, calibration and version record in `docs/<skill>/`. (Decision 2)[^house]
3. **DO** run setup and write the README when a home has none. (Decision 2)[^mattpocock]
4. **DO** set `stale_after` from the home README's interval on every write — `stale_after: 2026-12-20`. (Decision 3)[^okf]
5. **DO** copy the protocol block verbatim from the canonical copy. (Decision 4, 📜 Rule: `skill-context-protocol`)[^house]
6. **DO** name every home under `## Context` — `docs/<skill>/`, `docs/<domain>/`. (Decision 4, 📜 Rule: `skill-context-section`)[^house]

### Don'ts

1. **DON'T** declare a skill stateful because it records learnings. (Decision 1)[^house]
2. **DON'T** write into another skill's home. (Decision 2)[^house]
3. **DON'T** read or write a domain home without reading its README first. (Decision 2)[^mattpocock]
4. **DON'T** give an append-only log a `stale_after`. (Decision 3)[^okf]
5. **DON'T** use a context file past its `stale_after` without reviewing it. (Decision 3)[^okf]

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

1. **Rule** `skill-context-section` (archgate, error; `SKL-003-skill-context.rules.ts`): Decision 4.2 — a stateful skill has a `## Context` section that names a home.
2. **Rule** `skill-context-protocol` (archgate, error; same file): Decision 4.1 — the `## Context` section carries the block of `docs/skills/context-protocol.md` byte for byte.
3. **Review:** `archgate:reviewer` checks Decisions 1–3 on every changed `SKILL.md`.

**Manual review duties:** a skill writing context declares the key; its writes land in a home and follow that home's README; produced files carry `type` and, unless append-only, `stale_after`.

**Exceptions:** raise a separate ADR; human approval required.

## References

[^house]: House rule: no external source; decided for this repository's skills, 2026-11-20/21.

[^okf]: [Open Knowledge Format — Google Cloud](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) — `type`, `stale_after`, `generated`, `verified`.

[^anthropic-ctx]: [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — structured note-taking, persistent memory.

[^mattpocock]: [mattpocock-skills@abeeaf9:skills/engineering/setup-matt-pocock-skills/SKILL.md](https://github.com/mattpocock/skills/blob/abeeaf95660ba9e8b7c753eb38f441ca707a8823/skills/engineering/setup-matt-pocock-skills/SKILL.md) — setup writes `docs/agents/*` contract files once; other skills read them.
