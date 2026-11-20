---
type: agent-guide
title: Domain Docs
---

# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase. This repo is **multi-context**, one context per skill: `GLOSSARY-MAP.md` at the root lists each skill's glossary and its Decision records. A skill's glossary ships inside its folder (`skills/drive/GLOSSARY.md`), because the agent reads it at runtime. Its Decision records stay in `docs/decision-records/<skill>/`, because the installer ships every file in a skill folder.

## Two kinds of decision

This repo records decisions in two places. Keep them apart.

| Name                | Lives in                                                                             | Written by                                                     | Records                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **ADR**             | `.archgate/adrs/`                                                                    | Archgate (`archgate:adr-author`, `archgate:lessons-learned`)   | Universal coding Disciplines, enforced by `archgate check`. Governed by GEN-001.                |
| **Decision record** | `docs/decision-records/<skill>/`, or `docs/decision-records/` when it spans the repo | Engineering skills (`/domain-modeling`, `/grill-with-docs`, …) | Feature-, contract- and architecture-shaped decisions that a later feature could make obsolete. |

Whenever an engineering skill says "ADR" (offer an ADR, record an ADR, ADR-FORMAT.md, `docs/adr/`), it means a **Decision record** in `docs/decision-records/<skill>/` for the skill it concerns, or in `docs/decision-records/` when it spans the repo. Never write into `.archgate/adrs/` from an engineering skill.

### Decision record front matter

Every Decision record opens with this front matter, then follows the skill's ADR format (`NNNN-slug.md`, numbered per folder):

```md
---
type: decision-record
title: { Short title of the decision }
status: accepted
---

# {Short title of the decision}

{1-3 sentences: context, decision, why.}
```

`status` is `proposed | accepted | deprecated | superseded by <path>`. Numbers repeat per folder, so cite a Decision record by its path from the repo root, `docs/decision-records/drive/0004-drive-is-distributed-from-the-skills-repo.md`, never by its number alone. In a code comment that is the `decision:` pointer of GEN-006.

## Before exploring, read

- **`GLOSSARY-MAP.md`** at the repo root, then the glossary of the skill you work on.
- **`docs/decision-records/<skill>/`** and the repo-wide records in `docs/decision-records/`: read the ones that touch the area you're about to work in.
- **`.archgate/adrs/`**: the Archgate ADRs are binding rules; `archgate review-context` gives condensed briefings.

If a skill's glossary or records folder doesn't exist, **proceed silently**. Don't flag the absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```text
/
├── GLOSSARY-MAP.md                ← lists each skill's context
├── skills/drive/GLOSSARY.md       ← Drive's terms (ships with the /drive skill)
├── docs/decision-records/         ← Decision records (engineering skills)
│   ├── 0001-repo-wide-decision.md ← spans the repo
│   └── drive/
│       ├── 0001-some-decision.md  ← numbered per skill
│       └── 0002-another-decision.md
├── .archgate/adrs/                ← ADRs (Archgate governance)
└── skills/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts

If your output contradicts an existing Decision record, surface it explicitly rather than silently overriding:

> _Contradicts `docs/decision-records/drive/0002-one-decision-gate-then-the-run-is-unattended.md`, but worth reopening because…_

A conflict with an Archgate ADR is not up for reopening here: it is a hard blocker. Follow the Archgate refusal policy.
