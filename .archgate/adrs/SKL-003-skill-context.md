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

Work products — code, artifacts — are not context. Context is what a future session reads to decide how to act, mostly markdown.

## Decision

### 1. Stateless and stateful skills

1. A **stateless** skill leaves no context behind. A **stateful** skill persists context.
2. A stateful skill declares `metadata.state: stateful`; no key means stateless.
3. Learnings alone do not make a skill stateful.

### 2. Homes

1. A **skill home**, `docs/<skill>/`, is written only by its skill: setup answers, calibration, its version record.
2. A **domain home**, `docs/<domain>/` — `docs/decision-records/` — is shared by every skill that needs it.
3. Each home's `README.md` is its contract: what lives there, the file format and naming, the freshness interval. Writers and readers depend on the README, never on the skill that wrote it.
4. A missing README means setup has not run: the skill runs its setup, asks its questions once, writes the README.
5. The home README records the writer's version in OKF `generated` — `by: drive@1.4.0` — and a skill migrates the home when its own version differs.

### 3. Freshness

1. Every produced context file carries OKF `type` and `stale_after`. A stateful skill decides which further OKF fields it fills.
2. An append-only log carries `type` only: history does not go stale.
3. A skill compares `stale_after` with today before using a file, and reviews or refreshes a stale one.
4. A markdown-harness rule on the home is recommended, not required.

### 4. One context protocol

1. Every stateful skill carries the same protocol block: check the README, run setup when it is missing, check `stale_after` on read, migrate when `generated.by` differs (planned rule: `skill-context-protocol`).
2. A stateful skill has a `## Context` section naming its homes (planned rule: `skill-context-section`).

## Do's and Don'ts

### Do's

1. **DO** add `metadata.state: stateful` when a skill writes context outside learnings. (Decision 1)
2. **DO** keep a skill's own data in `docs/<skill>/`. (Decision 2)
3. **DO** set `stale_after` from the home README's interval on every write. (Decision 3)
4. **DO** copy the protocol block verbatim. (Decision 4, planned rule: `skill-context-protocol`)
5. **DO** name every home under `## Context`. (Decision 4, planned rule: `skill-context-section`)

### Don'ts

1. **DON'T** write into another skill's home. (Decision 2)
2. **DON'T** read a domain home without its README. (Decision 2)
3. **DON'T** give a log a `stale_after`. (Decision 3)

## Consequences

**Positive:**

1. **Visible state:** the key and the `## Context` section show which skills shape future agents, and where.
2. **Freshness anywhere:** the check on read works in repos without markdown-harness.
3. **Safe upgrades:** the version record lets a new skill version migrate its home.
4. **OKF-conform:** context files read as Open Knowledge Format with two fields.

**Negative:**

1. **Duplicated protocol:** each stateful skill carries the same block; the drift check is the price of self-contained skills.
2. **One more question at first run:** setup asks before the first useful result.

**Risks:**

1. **A stateful skill without the key** escapes every check. **Mitigation:** review asks of every new `docs/` write which home it lands in.

## Compliance and Enforcement

1. **Rules** (`SKL-003-skill-context.rules.ts`, error): a stateful skill carries the canonical protocol block unchanged and a `## Context` section.
2. **Review:** `archgate:reviewer` checks Decisions 1–3 on every changed `SKILL.md`.

**Manual review duties:** a skill writing context declares the key; homes and freshness follow the README.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Open Knowledge Format — Google Cloud](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) — `type`, `stale_after`, `generated`, `verified`.
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — structured note-taking, persistent memory.
- `docs/decision-records/drive/0008-learnings-move-to-the-learnings-skill.md` — the learnings store.
