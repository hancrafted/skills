---
type: record
workflow: drive-intent
date: 2026-11-22
fortify: pending
---

# drive-intent

The Workflow that gave drive an Intent step at the start of Define (spec #117, Integration PR #127): `references/intent.md`, status and `pr ready` checks, the per-project grilling format in setup, the learnings `## Intent` section, SKL-002 1.5 reworded; drive 2.2.0 and learnings 0.3.0. It ran grill first (grill Q31-Q55, then the Intent). Two review rounds; one Operator correction on the Decision PR and one on the Intent step.

## Intent

- **Turns:** 5 turns, four questions and the confirmed read-back.
- **Moved:** far: from "downstream agents check drift against an intent" to "scope changes during the grill are explicit bets, in the problem space only".
- **Outcome:** confirmed.
- **Drift:** review 1 found the record's Intent section could not show which bets paid off, and the final review found the record step never wrote the Bets bullet; both real, both fixed (e07bf60, 2a008c4). Subagent reports #118-#125 and both fix tasks: none.
- **Bets:** glossary governance left to Fortify (Q68), open, judged at Fortify; #125 widened to the files that pin the learnings version, paid off, release tests stayed green; the `**Bets:**` bullet added to learnings in #121's area, paid off, the spec's Success line is unreadable otherwise.

## domain-term-added-without-grill-or-research

- **Evidence:** Decision PR #126 proposed three Intent terms plus Top-down mode and Bottom-up mode, listed under 'Decided without asking' (Q52, Q58); the Operator caught it reading the PR and the terms were cut to one; Q68 left the governance fix to Fortify, and review 1 deferred 'Integration PR' and 'requirements grill' as glossary gaps for the same reason (decisions.md Corrections, Q68, review-1 triage)
- **Correction:** 2026-11-22 (Decision PR #126): glossary additions must be grilled explicitly and researched first, so an established term is not repurposed and a generic, ubiquitous term ("top-down", "bottom-up", "mode") is not narrowed. Only one term, Intent, goes in the glossary; the pitch and the statement are part of its entry. Top-down mode and Bottom-up mode are removed as terms; the two orders are described in plain words (intent first, grill first) and the decisions.md line becomes `Mode: intent-first|grill-first`. Failure mode for the record: glossary terms added without an explicit grill or research.

## step-size-feel-recorded-as-measured-limit

- **Evidence:** Intent turn 3: the Operator answered '5-10min' to the Appetite question, then added 'time constraint however should not be a measurement here'; the confirmed statement keeps Appetite 'small, a few turns; a feel, not a measure' and puts 'timing or measuring the step' out of scope (decisions.md turn 3 and Intent statement)
- **Correction:** 2026-11-22 (turn 3 follow-up): the 5-10 minutes is a feel for the step's size, not a measurement; it is not checked, counted or put in the pitch as a limit.

## topic-folder-differs-from-integration-slug

- **Evidence:** The topic folder had to be renamed at Implement, and the rename nested the folder (rmdir: intent: Directory not empty, transcript 11-22 21:11) (decisions.md Implement and Corrections)
- **Correction:** 2026-11-22 (Orchestrator, mine): `mv .scratch/intent .scratch/drive-intent` nested the folder because the CLI had already created the target; merged back, nothing lost. Cause: no existence check before the move.

## drive-push-piped-hides-exit-code

- **Evidence:** The first push of the Integration branch went through grep, against worktrees.md 'push'; the pushes after #123 and #124 raced Subagent merges and were re-run (decisions.md Implement and Corrections)
- **Correction:** 2026-11-22 (Orchestrator, mine): the first `drive push --spec 117` was piped through `grep`, hiding its exit code (worktrees.md "push" forbids it); rerun unpiped. Two later pushes raced Subagent merges (HEAD moved mid-push) and were re-run.

## unquoted-heredoc-runs-backticks

- **Evidence:** The Orchestrator wrote a task brief with an unquoted heredoc, and the shell ran its backticked words as commands until the brief was rewritten (decisions.md Corrections)
- **Correction:** 2026-11-22 (Orchestrator, mine): a task brief heredoc was unquoted, so backticks ran as commands; rewritten with a quoted heredoc.

## grill-first-recheck-not-run-after-intent-approval

- **Evidence:** The Intent was confirmed after grill Q31-Q55 and the requirements grill went on at Q56 with no pass over Q31-Q55 against it; decisions.md notes the Workflow 'ran bottom-up in effect' (decisions.md Decided without asking and Corrections)
- **Correction:** 2026-11-22 (Orchestrator, mine): in grill-first, the step "recheck every grill decision against the approved intent" (record 0009, Decision 4) was not run as an explicit pass after the intent was approved; the requirements grill went on from Q56. Cause: the step was being designed in this Workflow and was not yet in the skill.

## skill-reference-contradicts-itself

- **Evidence:** Review 1 M1, M2, M3 and the dangling 'below' pointers: grilling-format.md said the Intent statement was 'approved' in the first round, though grill first has only a working pitch; intent.md said the Orchestrator raises drift before Implement while dispatch.md and subagent.md told every Subagent to raise it; worktrees.md listed three pr ready refusals, the code four (review-1.md; decisions.md Review 1 triage)
- **Evidence:** Final review contradictions, all quoted: SKILL.md:117 'one of three reasons' vs worktrees.md:42 'four cases'; CHANGELOG.md:19 'each round' vs grilling-format.md:7 'The first round'; intent.md:57 'Fortify reads them for the record's Bets bullet' vs fortify.md:24, whose record list omitted bets, so the spec's 'which bets paid off' had no writer (review.md Contradictions; decisions.md Final review triage F1-F3)

## intent-status-reads-first-heading-not-last

- **Evidence:** Review 1 M4: intentStateOf read the first 'Intent statement' heading, so a changed intent appended later was ignored by drive status; fixed test first in the review-1 fix, and the final review confirmed both supersede directions are covered (review-1.md; review.md M4)
