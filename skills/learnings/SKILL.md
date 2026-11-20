---
name: learnings
description: Use when a skill's last step asks "Record learnings from this run?", when recording what went wrong in a run of any skill, when listing the failure modes a skill keeps hitting, or when a repeated failure should be filed upstream. Keeps one append-only store per skill and counts recurrences from its records.
compatibility: git, gh for `file-upstream`, and Node.js 22.18 or later for the learnings CLI in scripts/ (it runs TypeScript directly). The consuming repo provides the `yaml` npm package (and `@hancrafted/markdown-harness` for `check:docs`); the scripts import it at runtime.
metadata:
  version: '0.1.0'
---

# Learnings

Record what went wrong in a skill's run, count how often each failure mode recurs, and file a repeated one upstream. Words: [GLOSSARY.md](GLOSSARY.md). Decision: `docs/decision-records/drive/0008-learnings-move-to-the-learnings-skill.md`.

The store is `docs/learnings/<skill>/{records,failure-modes}/`. Its contract is `docs/learnings/README.md`, which also lists the skills whose learning is off: read it before writing. Run the CLI from the repo root: `node <skills>/learnings/scripts/learnings.ts <verb> --skill <name>`.

## When to record

Only after a human correction or a failed step in the run. A clean run records nothing and asks nothing. Never record for a skill the README lists as off.

## Steps

1. **Find the failure mode.** Run `learnings similar --skill <name> "<what went wrong>"`: it prints the three closest titles. Reuse one whose Enforcer would also catch this case; two candidates are the same failure mode when the same check would catch both.

   _Done when:_ you have a slug to cite, or none fits and you have a title and an Enforcer for a new one (`<kind>: <name>`, or `<kind>: new <what>`).

2. **Record it.** Run `learnings record --skill <name> --topic <topic> --failure <slug> --evidence "<what happened, where>"`. Add `--correction "<the human's words, verbatim>"` for a correction, and `--regressed "<why the fix did not hold>"` when the failure mode is `fixed`. For a new failure mode add `--title "<one line, subject first>"` and `--enforcer "<kind>: <name>"`; it starts `proposed`.

   _Done when:_ the command prints `recorded <path>`.

3. **Check the store.** Run `learnings check`: it validates every skill's store, and it runs in the repo's docs check beside `mh check --root docs/learnings/<skill> --config skills/learnings/markdown-harness.config.yaml`.

   _Done when:_ it prints a line per store and no `✖`.

## Commands

| Command                                                 | What it does                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `learnings record --skill <name> …`                     | Appends a bullet to today's (or `--date`'s) record for the topic; creates the record and a new failure mode.   |
| `learnings list --skill <name>`                         | Prints each failure mode with its count computed from the records, its status, `regressed` and `smell` (3+).   |
| `learnings similar --skill <name> "<failure>"`          | Prints the three closest failure-mode titles.                                                                  |
| `learnings check [--skill <name>]`                      | Fails a record H2 that names no failure mode, a status that disagrees with its fields, a regression unflagged. |
| `learnings file-upstream --skill <name> [--approved] …` | Files a smell upstream. See below.                                                                             |

## Filing upstream

A smell is a failure mode with a count of 3 or more. Offer it to the human; they decide. `learnings file-upstream --skill <name>` without `--approved` files nothing and prints the issue to show them. After they say yes, rerun with `--approved`: it files on the `source` repo from `skills-lock.json` (or `--repo <owner/repo>`), labels `fortify` and `skill:<name>`, refuses while one is open for that skill, and sets the failure mode to `status: ticket` with the issue's URL. Name a failure mode with `--failure <slug>` to file on request below the smell count.

## Freshness

A record is an append-only log and carries `type` only. A failure mode carries `type` and `stale_after`, one month after its last write; past it, review the failure mode before trusting its status.
