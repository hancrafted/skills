---
name: drive
description: Use when a grill starts, when a spec or its tickets are to be implemented, or when asked to drive or orchestrate, work on an integration branch or delegate to subagents. Runs a Workflow as its Orchestrator - grill and decide with the Operator, write Decision docs, delegate execution to Subagents on Task branches, merge into one Integration branch, review, then Fortify the repo's harness.
compatibility: git, and Node.js 22.18 or later for the drive CLI in scripts/ (it runs TypeScript directly). The consuming repo provides the `yaml` npm package (and `@hancrafted/markdown-harness` for `check:docs`); the scripts import it at runtime.
metadata:
  version: '2.0.0'
  state: stateful
---

# Drive

## Overview

You are the **Orchestrator** of one Workflow: the architect the Operator talks to. You grill, decide, plan, check reports, merge decisions, push and open PRs; Subagents do the execution. Reason by the architect's Profile in [references/profiles.md](references/profiles.md), extended by the project's `docs/drive/profiles.md`. The Workflow's words (Operator, Subagent, Binding, Fortify and the rest) each have one meaning, in [GLOSSARY.md](GLOSSARY.md): use them exactly. Explain the Workflow to the Operator in plain language.

## When to Use

- A grill starts: every grill starts /drive.
- A spec or its tickets are to be implemented.
- Asked to drive or orchestrate, to work on an integration branch, or to delegate to Subagents.
- Handed a brief: you are its Subagent ([As a Subagent](#as-a-subagent)).
- `/drive monitor <session-id>` to watch another session.
- NOT for: a one-file edit with no Decision docs, spec or tickets; reviewing a PR you did not drive.

## Context

Homes this skill reads or writes:

- `docs/drive/`: the skill home, written only by drive: setup answers, calibration and the version record in its `README.md`.
- `docs/learnings/drive/`: the learnings store, written through `/learnings`, which owns it.
- `docs/decision-records/`: the domain home of the project's Decision docs, bound by its `README.md`; the folder `docs/drive/project.yml` names wins.

Context protocol (SKL-003), identical in every stateful skill:

1. Before reading or writing a home, read its `README.md`: it is the home's contract.
2. When the README is missing, setup has not run: run the skill's setup, ask its questions once and write the README.
3. When reading a context file, compare its `stale_after` with today; review or refresh a stale file before relying on it.
4. When the README's `generated.by` differs from this skill's version, migrate the home.

## Human gates

- Before starting with `/learnings` missing: drive cannot run without it, so tell the Operator how to install it.
- Before the Decision gate passes: every impactful decision and blocker settles with the Operator, and nothing after it asks again.
- On a conflict with the spec or a binding decision: the Operator owns both.
- After CI stays red through two fix rounds: the fix loop has failed.
- When a Subagent is blocked by something outside its brief: only the Operator can lift it.
- Before merging the Integration branch's PR: the Operator contests triage and merges.
- Before Fortify runs: the Operator decides once whether it costs a top-tier decision page now or is skipped.

## As a Subagent

**Handed a brief instead?** Then you are its Subagent, whichever provider runs you. Save a pasted brief verbatim to `.scratch/<topic>/<task>.brief.md` before starting (review agents read that file as the spec), reason by the implementer's Profile, finish as [references/worktrees.md](references/worktrees.md) "How a Subagent finishes" says, and report in the format of [references/dispatch.md](references/dispatch.md). The rest of this file is the Orchestrator's.

## Principles

- **Shift left.** Your main job is to settle every impactful decision and blocker (grilling, the glossary, decision records, what the change touches that is live or scheduled) before the **Decision gate**, so everything after it runs unattended to a ready PR. The glossary, decision records and feature docs are the **Decision docs**: approved at the gate, written only on `decisions/<topic>` through the Decision PR ([GLOSSARY.md](GLOSSARY.md)).
- **Closed interrupts.** After the gate you stop for three reasons only: a conflict with the spec or a binding decision, CI red after two fix rounds, or a Subagent blocked by something outside its brief. Everything else you decide, log in `decisions.md` and let the Operator contest in the PR.
- **Lean Orchestrator.** The main session stays a fluid conversation; what lands in the repo goes to a Subagent.
- **Deterministic enforcement.** Narrow every failure mode until a mechanical check can govern it.

Announce each phase and its branch changes before acting, and print `drive status <topic>` at each phase start: it names the phase and the next stop.

## Entry check

On every start or resume (a new session and a quota limit included), first check that `/learnings` is installed (`skills/learnings/SKILL.md`, or the same under `.agents/skills/` or `.claude/skills/`). If it is missing, stop and tell the Operator: drive cannot run without it; install it with `npx skills add hancrafted/skills --skill learnings`, or run `drive setup --approve-learnings`. Then run `drive status <topic>`: it reads the topic folder, the branches, the PRs and the tickets, and names the phase and the next stop. Add what it does not read: the decisions log and the spec on the tracker. A Decision PR still open means you are back at the gate: restart `drive pr watch` on it. Start at the first phase whose _Done when_ is unmet, tell the Operator which phase and the next stop. Before the gate, wait for confirmation; after it, notify the phase and next stop and continue.

```mermaid
flowchart TD
  E{Entry check} -.-> D
  E -.-> R
  E -.-> I
  E -.-> V
  E -.-> F
  D["1 Define: clarify<br/>Integration branch pushed"] -->|asks| S1([Operator answers the grill])
  S1 --> D
  D -->|requirements settled| R["2 Reason: specify<br/>Decision docs, spec, tickets, Decision PR"]
  R --> G([Operator passes the Decision gate])
  G -->|review comment: grill input| R
  G -->|merged| I["3 Implement: codify<br/>Subagents self-merge"]
  G -->|closed unmerged| X0([Workflow stops])
  I --> C{Report checks out?}
  C -->|no: re-dispatch| I
  C -->|all tickets merged| V["4 Verify: push, review, triage"]
  V -->|checkpoint: log verdicts, fix| V
  V --> CI{CI}
  CI -->|red: implement the fix| I
  CI -->|green| N([Notify: PR ready])
  N --> M([Operator contests triage and merges the PR])
  I -.->|interrupt| NI([Notify, wait for the Operator])
  V -.->|interrupt| NI
  M --> F["5 Evolve: fortify<br/>from the base branch, blocks nothing"]
  F --> X[Clean up]
```

## The project folder

Every project fact lives in `docs/drive/`; this skill knows none. Read it before anything else:

- `binding.yml`: the **Binding**, each DRIVE phase's skills (`phases.<phase>.skills`), the Model tier its Subagents run on (`phases.<phase>.model`, `mid` or `top`), the agent type every agent uses (`agentType`) and the notify port (`notify.adapter`: `push-notification`, the harness's push notification, or `none`; absent means `push-notification`). A phase with no bound skill is done inline by you. Within a phase, pick a skill by its description.
- `project.yml`: the project settings for worktrees (`worktree.*`), the parallel cap (`parallel.*`), the models behind each provider's tiers (`models`), the Decision docs' paths (`decisionDocs`) and the grill format (`grill.format`).
- `profiles.md`: the project's rules for each Profile, and the kinds of live or scheduled things a change can touch. `enforcers.yml`: the Enforcers Fortify picks from. `review.md`: the calibration answers for every decision page. The records and failure modes are not here: they live in `docs/learnings/drive/`, owned by `/learnings` ([references/fortify.md](references/fortify.md)).

No folder yet, or a skill installed since setup: run setup first, [references/setup.md](references/setup.md).

The `drive` CLI is `node scripts/drive.ts` in this skill's folder; `worktree.invoke` in `project.yml` names how the project calls `drive worktree`. Use those commands for every worktree and merge: [references/worktrees.md](references/worktrees.md).

## Inline or delegated

Do inline only what needs your context and leaves no diff in the repo: grilling, the spec and the tickets (they go to the tracker, not the repo), checking reports, reverting a failed merge, pushing with `drive push` and opening PRs. The one diff you write yourself is the Decision docs, on their own branch.

Delegate to a Subagent everything else that lands in the repo or runs checks: code, decision pages, PR bodies, fixes, log mining, Fortify evidence. Run long commands (a worktree's install, a push with its hooks) in the background so the Operator never waits on them.

## The topic folder

Each Workflow keeps its memory in `.scratch/<topic>/` (gitignored), so it survives compaction and new sessions:

- `brief.md`: the shared brief every Subagent reads first.
- `decisions.md`: the decisions log. Write each settled term and decision in its exact wording the moment it settles, and each Operator correction under **Corrections** at once.
- `<task>.brief.md` and `<task>.report.md`: one **Handoff** per task, [references/dispatch.md](references/dispatch.md).
- `drive.log.jsonl`: written by the CLI and the Subagent hooks; `drive transcript --topic <topic>` reads the sessions it links. `monitor.md`: the monitor's findings, below.

## Branches

- **Integration branch**: `<type>/<slug>`, in its own worktree, so the main checkout stays on the base branch and several Orchestrators can run side by side. `<type>` is a Conventional Commits type, or one `docs/drive/profiles.md` admits. Create it first, when the Workflow starts, and push the empty branch with `drive push` (Define).
- **Task branch**: `<type>/<slug>--<issue>-<task>`, or `<type>/<slug>--<task>` without a ticket, started with `--base <type>/<slug>`.
- **Decision docs**: `decisions/<topic>`, from the Integration branch, through the Decision PR into the Integration branch; `decisions` is a `<type>` like any other. The Decision docs reach the base branch with the Integration branch's PR.

These names override any worktree path or branch a Handoff or another skill names, and the self-merge below replaces any skill's merger or per-ticket PR.

## Workflow

### 1. Define (clarify)

Every grill starts /drive. Create the Integration branch first and push it empty, in the background. Read the file `grill.format` names in `project.yml` (`docs/agents/grilling-format.md`) and follow it: state each round's questions in full, with options and examples, and explain every term no glossary defines. Grill the Operator with the Define skills until the requirements are settled; record each answer in `decisions.md`. A grill that changes nothing in the repo ends here, with its topic folder.

**Pre-flight.** Before the gate, list what the change touches that is live or scheduled; `docs/drive/profiles.md` names the kinds for this project. Settle each with the Operator now, and record it in `decisions.md`: it goes into the Decision PR body, and it is never first raised at the PR.

_Done when:_ every requirement is a line in `decisions.md`, the pre-flight list is in it too, and the Operator agrees nothing is open.

### 2. Reason (specify)

1. **Decision docs.** Write the Decision docs the Workflow changes yourself, in a `decisions/<topic>` worktree from the Integration branch. The paths are `decisionDocs` in `project.yml`; `drive guard` fails a commit that changes one on a branch outside `decisions/<topic>` (its Task branches included). A Workflow that changes no Decision doc says so in `decisions.md`. When the Operator asks to skip this path, push back: name the muddy term and ask for its exact wording.
2. **Decision pages.** A page that settles open choices is a delegated task, [references/dispatch.md](references/dispatch.md) "A decision page", with `docs/drive/review.md` as the page skill's inputs.
3. **Spec and tickets**, inline with the Reason skills. Ask the ticket skill, through its arguments, for a **Skills** line (only skills the Binding resolves) and a **Review after** line (`yes` with a reason, or `no`) on each ticket.
4. **Decision PR.** Push `decisions/<topic>` with `drive push` and open its PR into the Integration branch. When no Decision doc changes, put the same body in the conversation and ask for explicit approval; that approval is the gate. The body holds:

   ```markdown
   ## Spec

   <tracker ref>

   ## Tickets

   - <ref> <title> (Skills: <skills> · Review after: <yes: reason | no>)

   ## Live or scheduled

   <what the change touches, from the pre-flight, or "nothing">

   ## Run terms

   - Operator stops left: the merge of the Integration branch's PR.
   - Expected duration: <estimate>.
   - Interrupts: a conflict with the spec or a binding decision; CI red after two fix rounds; a Subagent blocked by something outside its brief.
   ```

5. **Watch the gate.** Run `drive pr watch <number>` in the background and notify the Operator through the Binding's notify port that the gate waits. Merged (exit 0): run `drive worktree sync --base <Integration branch>` in the Integration worktree (it takes the remote's commits) and go to Implement. A review comment (exit 3): grill input; revise on `decisions/<topic>`, `drive push`, answer on the PR starting the reply with `<!-- drive -->` (the watch skips such comments), and watch again. Closed unmerged (exit 2): the Workflow stops; tell the Operator.

_Done when:_ the Operator passed the Decision gate (the Decision PR merged, or the chat approval given), the Integration branch holds the Decision docs, and every ticket is on the tracker with its Skills and Review after lines.

### 3. Implement (codify)

The gate is passed: nothing here asks the Operator anything except a closed interrupt. Dispatch the tickets as [references/dispatch.md](references/dispatch.md) says: `drive dispatch check` before each wave, overlap check, file ownership, the resolved model named in each dispatch line, the parallel cap. Each Subagent merges itself into the Integration branch, and `drive worktree done` runs the project's `beforeMerge` hooks first. Check every report as [references/review.md](references/review.md) says the moment it arrives, then dispatch what it unblocked.

At an interrupt, notify the Operator through the Binding's notify port, say what stopped and what you need, and wait.

_Done when:_ every ticket's task is merged and checked, or reverted with its reason logged in `decisions.md`.

### 4. Verify

Push after every merge with `drive push`, in the background ([references/worktrees.md](references/worktrees.md) "push" holds its rules). The first push after the first merge is `drive push --spec <epic number>`: it opens the draft PR; later pushes omit `--spec`. Review at the planned checkpoints and before the PR is marked ready, triage every finding and log each verdict in `decisions.md` without asking, and hand the accepted ones to one fix Subagent: [references/review.md](references/review.md). CI red twice after a fix round is an interrupt.

Then delegate the Workflow's record ([references/fortify.md](references/fortify.md) "The record"): it is the PR's last commit, with `fortify: pending`. Save the final review as `.scratch/<topic>/review.md`, and run `drive pr ready <number>`: it refuses without that report and marks the PR ready.

Watch the PR in the background with `drive pr watch <number> --integration` and notify the Operator through the notify port that the PR is ready. The PR body lists the verdicts, so the Operator contests them there. The exit codes are in [references/worktrees.md](references/worktrees.md) "pr watch"; you act on them like this: 10, fix it as the next Implement task; 11, `drive worktree sync` the Integration branch and push; 12, close the leftover tickets and ask the Fortify question (Evolve); 13, the Workflow stops, tell the Operator.

_Done when:_ CI passes on the last push, every finding has a logged verdict with a reason, the record is committed, the Operator is notified and has the PR to merge.

### 5. Evolve (fortify)

After the Operator merges the Integration branch's PR (exit 12) and the leftover tickets are closed, ask once: "Fortify now (a top-tier decision page) or skip?" Skip ends here once one small PR from the base branch has recorded `fortify: skipped` with the Operator's reason (the record is append-only after the merge; log the decision in `decisions.md`, the Operator may contest it); yes runs **Fortify** on a branch from the base branch: [references/fortify.md](references/fortify.md). It blocks nothing else.

_Done when:_ the record says `engaged` or `skipped`; when engaged, at most one `fortify` ticket is open and it is the recommended architectural option. `drive status` then reports Done: clean up the merged branches and worktrees (`/cleanup`).

## Monitor

### 6. Monitor a session

`/drive monitor <session-id>` watches another session, usually a grill the Operator runs elsewhere, and records what it learns for Fortify. It writes only `.scratch/<topic>/monitor.md` and nothing in the repo; the `<topic>` is the watched Workflow's: take it from `drive status` run in the watched session's branch, or ask the Operator when no branch tells it.

1. **Start at once** on the default watch rules: Operator corrections, questions the Operator asks about a term, CI or PR state relayed in the session, tool failures and interrupts.
2. **Calibrate without blocking.** Ask the Operator in one message what else to watch or ignore; keep watching while the answer is pending, and apply it when it arrives.
3. **Loop.** On each tick run `drive transcript <session-id> --since-last`, which prints only what is new since the last run, and append each finding to `monitor.md` with the session's name, a time and the Operator's words verbatim.
4. **End** when the session ends or the Operator says stop. At Verify the record folds each finding in with `(source: monitor)`.

_Done when:_ the session ended or the Operator said stop, and `monitor.md` holds each finding with the session's name, a time and the Operator's words verbatim.

## Common Rationalizations

| Excuse                                                                    | Rebuttal                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "The Subagent's report ticks every criterion, so it checks out."          | #35 ticked "/writing-for-agents applied" without invoking the skill, and #32 ticked "records and failure-modes created" while git tracked only `README.md`. Check each criterion against the branch, not the report (drive-port review 1). |
| "The Subagent says knip and a slow test failed, so the code is broken."   | On the Integration branch both passed: the failures came from the Subagent's worktree. Re-run on the Integration branch before logging a failure (drive-port, #35).                                                                        |
| "The new boundary rule needs an exemption for one folder; note it later." | A Subagent merged the to-review exemption with no GEN-004 escalation, no `// tech-debt:` marker and an unlabelled #75. Escalate before building and fence the shortcut (drive-port review 2, finding 2).                                   |
| "The review is rushing; write the Fortify record after `drive pr ready`." | The record is the PR's last commit and `drive pr ready` runs only after it. It was skipped once under the review-2 rush and written on a late branch (drive-port, Orchestrator correction).                                                |
| "The PR body was true when I opened it."                                  | A rebase or a new commit makes it stale: the body once told the Operator to delete tracked files. Re-read it against the branch head before `drive pr ready` (drive-port review 2, finding 9).                                             |
| "Decision records go in `docs/adr` by convention."                        | No convention decides it: `decisionDocs` in `project.yml` names the folder. The Operator had to correct a guessed folder to `docs/decision-records` (drive-port).                                                                          |
| "#789 is the PR the Workflow waits on."                                   | It was the spec issue; the Integration PR was #813. Resolve each gate number with `gh pr view` before a ticket or the log names it (drive-port correction).                                                                                |

## Red Flags

- A Decision doc changes on a branch outside `decisions/<topic>`, or the Operator is asked to approve a Decision doc nobody wrote there.
- A Subagent's report ticks a criterion with no command or path as evidence.
- A check is called failing on a Subagent's say-so, with no re-run on the Integration branch.
- A lint or boundary exemption is merged with no accepted escalation and no `// tech-debt:` marker.
- `drive pr ready` is about to run with no Fortify record committed.
- A test run appends entries to `.scratch/<topic>/drive.log.jsonl`.
- The local base branch holds commits the Integration branch and origin lack.
- You stop to ask the Operator after the gate for anything outside the three interrupts.

## Verification

- [ ] `node skills/drive/scripts/drive.ts status <topic>` names the phase just completed as done and the next stop.
- [ ] `gh pr checks <number>` shows no failing check on the last push.
- [ ] `.scratch/<topic>/decisions.md` holds a verdict with a reason for every review finding.
- [ ] `learnings check` passes, and the Workflow's record is committed with `fortify: pending`, `engaged` or `skipped`.
- [ ] `drive pr ready <number>` accepted the PR, which needs `.scratch/<topic>/review.md`.

### 7. Learn

Log each Operator correction in `decisions.md` the moment it is made. When the run had a correction or a failed step and `/learnings` is available, the Workflow's record carries it ([references/fortify.md](references/fortify.md) "The record"). For a run that wrote no record, such as a grill that changed nothing in the repo, ask "Record learnings from this run?" and on yes run `/learnings` for skill `drive`. A clean run asks nothing.

_Done when:_ every correction is in the record, or the run was clean and the step skipped.
