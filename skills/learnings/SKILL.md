---
name: learnings
description: Use when a skill's last step asks "Record learnings from this run?", when recording what went wrong in a run of any skill, when listing the failure modes a skill keeps hitting, or when a repeated failure should be filed upstream. Keeps one append-only store per skill and counts recurrences from its records.
compatibility: git, gh for `file-upstream`, and Node.js 22.18 or later for the learnings CLI in scripts/ (it runs TypeScript directly). The consuming repo provides the `yaml` npm package (and `@hancrafted/markdown-harness` for `check:docs`); the scripts import it at runtime.
metadata:
  version: '0.1.0'
---

# Learnings

## Overview

Record what went wrong in a skill's run, count how often each failure mode recurs, and file a repeated one upstream. Words: [GLOSSARY.md](GLOSSARY.md). Decision: `docs/decision-records/drive/0008-learnings-move-to-the-learnings-skill.md`.

The store is `docs/learnings/<skill>/{records,failure-modes}/`. Its contract is `docs/learnings/README.md`, which also lists the skills whose learning is off: read it before writing. Run the CLI from the repo root: `node <skills>/learnings/scripts/learnings.ts <verb> --skill <name>`.

## When to Use

- A skill's last step asks "Record learnings from this run?" after a human correction or a failed step in the run.
- Listing the failure modes a skill keeps hitting.
- A repeated failure should be filed upstream.
- NOT for: a clean run, which records nothing and asks nothing; a skill the README lists as off; fixing the failure itself.

## Human gates

- Before filing an upstream ticket: outward-facing.

## Record

### 1. Find the failure mode

Run `learnings similar --skill <name> "<what went wrong>"`: it prints the three closest titles. Reuse one whose Enforcer would also catch this case; two candidates are the same failure mode when the same check would catch both.

_Done when:_ you have a slug to cite, or none fits and you have a title and an Enforcer for a new one (`<kind>: <name>`, or `<kind>: new <what>`).

### 2. Record it

Run `learnings record --skill <name> --topic <topic> --failure <slug> --evidence "<what happened, where>"`. Add `--correction "<the human's words, verbatim>"` for a correction, and `--regressed "<why the fix did not hold>"` when the failure mode is `fixed`. For a new failure mode add `--title "<one line, subject first>"` and `--enforcer "<kind>: <name>"`; it starts `proposed`.

_Done when:_ the command prints `recorded <path>`.

### 3. Check the store

Run `learnings check`: it validates every skill's store, and it runs in the repo's docs check beside `mh check --root docs/learnings/<skill> --config skills/learnings/markdown-harness.config.yaml`.

_Done when:_ it prints a line per store and no `✖`.

## Commands

| Command                                                 | What it does                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `learnings record --skill <name> …`                     | Appends a bullet to today's (or `--date`'s) record for the topic; creates the record and a new failure mode.   |
| `learnings list --skill <name>`                         | Prints each failure mode with its count computed from the records, its status, `regressed` and `smell` (3+).   |
| `learnings similar --skill <name> "<failure>"`          | Prints the three closest failure-mode titles.                                                                  |
| `learnings check [--skill <name>]`                      | Fails a record H2 that names no failure mode, a status that disagrees with its fields, a regression unflagged. |
| `learnings file-upstream --skill <name> [--approved] …` | Files a smell upstream. See step 4.                                                                            |

## File upstream

### 4. Offer a smell upstream

A smell is a failure mode with a count of 3 or more. Offer it to the human; they decide. `learnings file-upstream --skill <name>` without `--approved` files nothing and prints the issue to show them. After they say yes, rerun with `--approved`: it files on the `source` repo from `skills-lock.json` (or `--repo <owner/repo>`), labels `fortify` and `skill:<name>`, refuses while one is open for that skill, and sets the failure mode to `status: ticket` with the issue's URL. Name a failure mode with `--failure <slug>` to file on request below the smell count.

_Done when:_ the human declined, or the failure mode reads `status: ticket` with the issue's URL.

## Freshness

A record is an append-only log and carries `type` only. A failure mode carries `type` and `stale_after`, one month after its last write; past it, review the failure mode before trusting its status.

## Common Rationalizations

| Excuse                                                                      | Rebuttal                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "This looks like an existing failure mode, so cite it."                     | Two candidates are the same failure mode only when the same check would catch both. A subagent-skips-acceptance-criterion mode was not reused for a ticked-but-unmet criterion, because its Enforcer catches unchecked criteria, not ticked ones (drive-port record, 2026-11-20). |
| "The run went fine, so record a note anyway."                               | Record only after a human correction or a failed step. A clean run records nothing and asks nothing.                                                                                                                                                                              |
| "I will paraphrase the correction to keep the record tidy."                 | Pass `--correction` with the human's words verbatim. The Orchestrator's own corrections went into the drive-port record verbatim, so the store holds what was said.                                                                                                               |
| "The count is 3, so file it upstream."                                      | The human decides. Run without `--approved` first and show the issue; `--approved` follows their yes only.                                                                                                                                                                        |
| "I will bump the count in the failure mode file."                           | A failure mode never holds a count: `learnings list` computes it from the records.                                                                                                                                                                                                |
| "`--skill` and `--failure` come from a person, so they are safe in a path." | Review 1 found `--skill`, `--failure` and `--topic` unvalidated in path building, a path traversal. Pass slugs only and let the CLI refuse the rest.                                                                                                                              |

## Red Flags

- A failure mode file carries a count.
- A record H2 names no failure mode, or `learnings check` prints a `✖`.
- A correction in a record is paraphrased, not verbatim.
- `learnings record` runs for a skill the README lists as off.
- `file-upstream --approved` runs before the human said yes.
- A reused failure mode's Enforcer would not have caught this case.
- A `--skill`, `--failure` or `--topic` value holds `/` or `..`.

## Verification

- [ ] `learnings record` printed `recorded <path>`.
- [ ] `learnings check` printed a line per store and no `✖`.
- [ ] `mh check --root docs/learnings/<skill> --config skills/learnings/markdown-harness.config.yaml` exits 0.
- [ ] After a filed upstream ticket, `learnings list --skill <name>` shows the failure mode as `ticket`.

### 5. Learn

When the run had a human correction or a failed step, record it against skill `learnings` itself with steps 1 to 3, unless `docs/learnings/README.md` lists `learnings` as off. A clean run asks nothing.

_Done when:_ the record was written and checked, or the run was clean and the step skipped.
