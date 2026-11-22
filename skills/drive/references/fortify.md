# Fortify

The Evolve phase: every Workflow hardens the repo's harness against what went wrong in it, so the same failure mode cannot recur unnoticed. Recording is automatic and always happens; engaging is the Operator's one decision. The Workflow's record is written at the end of Verify; after the Operator merges the Integration branch's PR you ask once whether to Fortify now, and only a yes runs the steps below, on a branch from the base branch.

## The store

The `/learnings` skill owns the store, `docs/learnings/drive/`, and every command on it: `learnings record|list|similar|check|file-upstream --skill drive` (its SKILL.md says how; `docs/learnings/README.md` is the store's contract). drive only decides what goes in a record and what Fortify does with the counts. The shape you rely on:

- `records/<date>-<workflow>.md`: one per Workflow, append-only. Front matter `type: record`, `workflow`, `date`, `fortify: pending | engaged | skipped` and `skip-reason` when skipped. Each H2 is the file name of one failure mode, holding `**Evidence:**`, `**Correction:**` and, for a fixed failure mode that recurred, `**Regressed:**` bullets.
- `failure-modes/<slug>.md`: one per failure mode: title, Enforcer, `status: proposed | ticket | fixed | wontfix` (with `ticket`, `fixed-by`/`fixed-on` or `reason`), `type` and `stale_after`, never a count.
- `learnings list --skill drive` prints every failure mode with its count computed from the records, its status, `regressed` and `smell`. `learnings check` runs in the project's docs check.
- Before creating a failure mode, run `learnings similar --skill drive "<failure>"`. Reuse one whose Enforcer would also catch this case; create a file only when none would.

Two candidates are the same failure mode when the same check would catch both, whatever their wording. A count of 3 or more is a **smell**: it leads every option list. A `fixed` failure mode that a later record cites means its Enforcer failed: the record says so under **Regressed:**.

A lesson that holds for every project belongs in this skill's source, changed deliberately; `docs/drive/` keeps what holds for this project only.

## The record, at the end of Verify

When the review report exists and before `drive pr ready`, delegate the record to one Subagent (the Fortify evidence tier); its commit is the Integration PR's last. It writes the record with `learnings record --skill drive --topic <topic>` (`records/<date>-<topic>.md`, `fortify: pending`) from:

- every line under **Corrections** in `.scratch/<topic>/decisions.md`, yours included (list there each point where you departed from this skill or the Decision docs, with its cause, marked as yours), copied verbatim;
- `drive transcript --topic <topic> --tools`, which extracts the Operator's turns, the questions asked, tool failures and interrupts (and with `--tools` every tool call and Skill invocation) of every session the topic's hook log links. It exits non-zero with a notice when the log links no session; the hook logs your session too once a Subagent has started, otherwise run `drive transcript <session-id>` over your own: the newest `.jsonl` transcript path in `drive.log.jsonl`, or the id the Operator gives;
- the Intent block, as the record's one `## Intent` section, first after the title (`learnings` SKILL.md, "The Intent section"): turns, how far the pitch moved, confirmed or gave up, and the drift found later with whether it was real, from `decisions.md` and the PR body's "Intent drift" section, plus a `**Bets:**` bullet when `decisions.md` holds `Bet:` lines: each scope change, with whether it paid off;
- `.scratch/<topic>/monitor.md`, when a monitor ran: each finding folded in as a bullet ending `(source: monitor)`;
- the review report `.scratch/<topic>/review.md` and the CI runs.

After about three records carrying an Intent section, Fortify judges the Intent method itself (turns, pitch movement, drift that was real) and treats a method that does not pay off as an option like any other. Each bullet goes under the failure mode it belongs to; the Subagent runs `learnings similar --skill drive` before any new slug; a new failure mode starts `proposed`. A failure mode this Workflow's tickets fixed flips to `fixed` with `fixed-by` and `fixed-on` in the PR that fixes it, not here. Run `learnings check`; it must pass before the push.

You never edit the store yourself. A correction never waits for Fortify: log it the moment it is made, and the record carries it.

## After the merge: the one question

`drive pr watch <n> --integration` exits 12 when the Integration PR merged (the worktrees reference, "pr watch"). Close the leftover tickets it lists, then ask the Operator once: **"Fortify now (a top-tier decision page) or skip?"** Never ask again.

- **Skip.** The record is append-only after the merge, so recording a skip is one small PR from the base branch: delegate it to a Subagent, which sets `fortify: skipped` and `skip-reason` to the Operator's words. Log the decision in `decisions.md`; the Operator may contest it. The learnings are kept; nothing else runs. This is how a deadline is honoured.
- **Yes.** Set `fortify: engaged` and run the steps. Corrections made after the merge (the Operator's PR comments) are added to the record on the Fortify branch.

## Steps (engaged)

1. **Session reviews.** For each Evolve skill in the Binding that reviews past sessions and that only the Operator can invoke (its frontmatter says so), list it with the session names (your own and each Subagent's, by Task branch) in the Fortify PR body, for the Operator to run when convenient. Go on without its result.

   _Done when:_ each such skill is listed with the session names.

2. **Evidence, delegated.** One Subagent on the Task branch `<Fortify branch>--evidence`, merged into the Fortify branch, writes `.scratch/<topic>/fortify-evidence.md` from the corrections added since the record, `learnings list --skill drive`, the result of each Evolve skill a Subagent can run that reviews sessions or surveys architecture, the Enforcers in `docs/drive/enforcers.yml` and the open tickets labelled `fortify`. It maps each finding to a failure mode, and lists 2-3 quick wins and 2-3 architectural options, each with every field of [the field table](#the-options). It fills **Existing state** by checking the current code and config for the proposed fix: a fix that already exists drops out or is reframed as a gap in it, with the file and date it appeared.

   _Done when:_ every option has all fields of the table, its Existing state checked against the code.

3. **The decision page.** Build a `/to-review` page of the evidence on `top` (`review.md` supplies the calibration; `drive status` reports whether it is filled, [setup](setup.md) "Optional inputs") so the Operator picks among the options: the dispatch reference, "A decision page".

4. **One architectural ticket.** File the recommended architectural option as a ticket labelled `fortify`, creating the label when the tracker lacks it: on the source repo's tracker when its Target is the installed skill, otherwise on this repo's tracker ([Where an option goes](#where-an-option-goes)). At most one `fortify` ticket is open per skill (labels `fortify` and `skill:drive`): when one is open, keep it and leave the new recommendation's failure mode `proposed`, first in line for the next Fortify. The ticket body leads with any smell and holds the quick wins; the Operator picks one when triaging. The recommended failure mode becomes `status: ticket` with its URL.

5. **Land it.** Push the Fortify branch with `drive push`, open its PR to the base branch and notify the Operator through the Binding's notify port.

_Done when:_ the record is `engaged`, every option is a failure-mode file or a recorded finding, at most one `fortify` ticket is open and it is the recommended architectural option, and the Fortify PR is open.

## Where an option goes

Each option has one target; the target decides where its fix lands. Name it in the option's **Target** field.

First tell the skill's copy apart: `skills/drive/SKILL.md` is a real file in this repo, so the skill is authored here; a symlink in `.agents/skills/` or `.claude/skills/` pointing to `skills/drive/` changes nothing. Otherwise the skill is installed here, and nobody edits it here.

| Target                                                    | Route                                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Project context: `docs/drive/*`, the repo's own Enforcers | A branch in this repo, from the base branch                                                                                  |
| The skill, authored here                                  | A branch in this repo, from the base branch                                                                                  |
| The skill, installed                                      | An issue on the repo that is the `source` of `drive` in `skills-lock.json` (`owner/repo`): `gh issue create --repo <source>` |

When the lock lacks `drive` or its `source`, the target is unknown: ask the Operator for the repo.

A failure mode lives where its fix lives: the fix of an installed skill is upstream, so its failure mode is too. Records stay in this repo whatever the target. For a failure mode about the installed skill:

1. File the upstream issue first, behind the Operator's approval: `learnings file-upstream --skill drive --failure <slug>` titles it with the failure mode, lists its evidence lines and the Enforcer proposed, labels it `fortify` and `skill:drive` on the `source` repo, and refuses while one is open.
2. `file-upstream` sets the local failure-mode file to `status: ticket` with `ticket:` the issue's URL, so recurrences are still counted here by `learnings list --skill drive`.

## The options

The evidence file lists the options, the most consequential first:

1. **Smells**, when any entry has a count of 3 or more: the entry, its count and its evidence lines; the ticket body leads with them.
2. **Quick wins**: 2–3 options, each 15–30 minutes of a Subagent's work.
3. **Architectural options**: 2–3 options, each a ticket's worth of work.
   Every option carries these fields, in this order of reading:

| Field          | What it holds                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Name           | the problem in plain words a cold reader grasps, never a code identifier                                          |
| Target         | where its fix lands, per [Where an option goes](#where-an-option-goes)                                            |
| Failure mode   | one narrow line a check can decide: what went wrong, not a theme (the failure-mode file's title)                  |
| What happened  | when, what failed and what it cost, from the correction lines, failure-mode files and records and review findings |
| Existing state | what the current code and config already hold toward the fix, checked, with file and date                         |
| Principle      | the engineering principle the fix applies, so the change reads as an application of it                            |
| Before / after | one concrete case of the repo as it is and as it would be, shown as a diagram or ordered steps                    |
| Enforcer       | the check that would catch it next time, from `enforcers.yml` or a new one named                                  |
| Cost           | the work to build it and what it adds to every run afterwards                                                     |
| Door           | two-way (cheap to undo) or one-way, with the undo named                                                           |
| Prior count    | its count from `learnings list --skill drive`, 0 when new, and its status when not `proposed`                     |

Rank Enforcers deterministic first: types, lint, tests, an ADR checker's rule, a hook. A narrow LLM judge qualifies only when its verdict can be checked; a rule in prose with no check is not an Enforcer.
