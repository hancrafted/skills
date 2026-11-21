# Grilling format (drive's default)

The round format drive uses when `grill.format` is unset or its file is missing. A project file named by `grill.format` replaces this one.

## Each round

1. A short reply to the last answers, or an introduction.
2. Numbered questions, each starting with a W word (what, which, why, where, who) or with How, and stated in full.
3. Under each question, numbered options: at least 2-3, each with an example.
4. A Recommendation at the end, with the reason. The Operator answers "yes" to accept every recommendation.

## Wording

- Short sentences. Inverted pyramid: the answer first, the detail after.
- Technically precise words. Do not invent words.
- Explain every term no glossary defines.
- The Operator asks a follow-up when technical depth is needed.

## Default buckets

Group questions by what they settle:

- **Contract:** what the change promises to users and callers: behaviour, interfaces, file formats, names, compatibility.
- **Architecture:** where the change lives and how it is built: modules, seams, dependencies, data, trade-offs.
- **Workflow:** how the work runs: order, tickets, branches, checks, review, release, what is live or scheduled.

## Decided without asking

The Orchestrator decides these, logs each in `decisions.md` and lets the Operator contest it in the PR:

- A choice inside one bucket that an accepted decision or the glossary already settles.
- Names, wording and layout that no caller sees.
- Which ticket runs first, within the dependency order.
- Triage of review findings after the Decision gate.

Ask whenever a choice changes the contract, trades architecture or agent legibility, or touches something live or scheduled.
