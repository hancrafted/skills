---
name: learnings
description: Keeps one append-only store of failure modes per skill, counts how often each recurs from its records and files a repeated one upstream. Use when a skill's last step asks "Record learnings from this run?", when recording what went wrong in a run of any skill, when listing the failure modes a skill keeps hitting, or when a repeated failure should be filed upstream.
compatibility: git, gh for `file-upstream`, and Node.js 22.18 or later for the learnings CLI in scripts/ (it runs TypeScript directly). The consuming repo provides the `yaml` npm package (and `@hancrafted/markdown-harness` for `check:docs`); the scripts import it at runtime.
metadata:
  version: '0.3.0'
  state: stateful
---

# Learnings

## Overview

Record what went wrong in a skill's run, count how often each failure mode recurs, and file a repeated one upstream. Words: [GLOSSARY.md](GLOSSARY.md).

The store is `docs/learnings/<skill>/{records,failure-modes}/`. Its contract is `docs/learnings/README.md`, which also lists the skills whose learning is off: read it before writing. Run the CLI from the repo root: `node <skills>/learnings/scripts/learnings.ts <verb> --skill <name>`.

## When to Use

- A skill's last step asks "Record learnings from this run?" after a human correction or a failed step in the run.
- Listing the failure modes a skill keeps hitting.
- A repeated failure should be filed upstream.
- NOT for: a clean run, which records nothing and asks nothing; a skill the README lists as off; fixing the failure itself.

## Context

Home this skill reads or writes:

- `docs/learnings/`: the skill home, written only by learnings; its `README.md` is the store's contract and lists the skills whose learning is off.

Context protocol (SKL-003), identical in every stateful skill:

1. Before reading or writing a home, read its `README.md`: it is the home's contract.
2. When the README is missing, setup has not run: run the skill's setup, ask its questions once and write the README.
3. When reading a context file, compare its `stale_after` with today; review or refresh a stale file before relying on it.
4. When the README's `generated.by` differs from this skill's version, migrate the home.

Setup and migration are `learnings record`: it writes `docs/learnings/README.md` when missing, and moves an existing README's `generated.by` and `at` to this version and today when `generated.by` differs. It changes nothing else in the README.

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

## The Intent section

A record may carry one `## Intent` section, first after the title and before any failure mode: the Workflow's Intent block, written by the skill that ran the Workflow (drive). It holds labelled bullets: `**Turns:**` (how many turns the Intent step took), `**Moved:**` (how far the pitch moved first to last), `**Outcome:**` (confirmed or gave up) `**Drift:**` (drift found later and whether it was real, or none) and, optionally, `**Bets:**` (each scope change the Operator placed against the intent, and whether it paid off). It is not a failure mode, so it cites no file and counts toward nothing. `learnings check` and `mh check` fail a second one, a misplaced one or an unlabelled bullet; a record without one passes.

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

| Excuse                                                      | Rebuttal                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "This looks like an existing failure mode, so cite it."     | Two candidates are the same failure mode only when the same check would catch both. A mode for a subagent skipping a criterion was not reused for a ticked-but-unmet one, because its Enforcer catches unchecked criteria, not ticked ones (`docs/learnings/drive/records/2026-11-20-drive-port.md`). |
| "I will paraphrase the correction to keep the record tidy." | Pass `--correction` with the human's words verbatim: the store holds what was said. The Orchestrator's own corrections went into `docs/learnings/drive/records/2026-11-20-drive-port.md` verbatim.                                                                                                    |
| "The value comes from a person, so it is safe in a path."   | Review 1 of the drive port found `--skill`, `--failure` and `--topic` unvalidated in path building, a path traversal (`docs/learnings/drive/failure-modes/cli-argument-becomes-path-unvalidated.md`). Pass slugs only and let the CLI refuse the rest.                                                |

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
