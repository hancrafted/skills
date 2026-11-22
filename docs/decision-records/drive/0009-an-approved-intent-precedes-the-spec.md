---
type: decision-record
title: An approved intent precedes the spec
status: accepted
---

# An approved intent precedes the spec

The Operator approved this on 2026-11-22, in the intent Workflow. Too many grills expanded, cut or changed the scope until the result was too big or too different from what was asked, and whether a scope change was good could not be judged at the moment: it was a gamble nobody saw being placed. Nothing that reached a Subagent carried the why. This record extends `docs/decision-records/drive/0002-one-decision-gate-then-the-run-is-unattended.md`. The method is a first try, to be refined from the records (Decision 8). Prior art: addy's interview-me (`agent-skills@8c99fa3:skills/interview-me/SKILL.md`), commander's intent, Shape Up's no-gos and appetite, Google design docs' non-goals. "Intent engineering" is an unsettled 2026 term, so drive says **Intent**. Terms: [Drive glossary](../../../skills/drive/GLOSSARY.md).

## Decisions

1. **The intent comes first in Define.** The Orchestrator analyses the Operator's first prompt and synthesizes an **Intent pitch**. The Operator then picks the **mode**: refine the intent first (**Top-down mode**), or grill first (**Bottom-up mode**). In both, no spec starts without an Intent statement the Operator approved.
2. **The Intent step is not a grill.** Each turn is one open question, with no options and no recommendation, plus the updated pitch (`INTENT:`). The Operator answers, edits the pitch, or both, until they approve it or give up. It stays in the problem space (who really uses the result, what impact it should have, why now) and leaves solution detail to the grill. Giving up stops the Workflow, with the last pitch logged as unconfirmed.
3. **The Intent statement is the pitch plus eight fields**: Outcome, User, Why now, Success, Constraint, Out of scope, Appetite, Tradeoff order. The fields are written once, from the approved pitch, as the read-back. Appetite is a feel for size, never a measure.
4. **Bottom-up ends with the same intent.** After the grill the Orchestrator drafts the pitch from the grill's decisions and sharpens it until approved, then rechecks every grill decision against it: kept as a deliberate bet, dropped, or grilled again.
5. **Scope changes are bets placed openly.** The approved intent replaces the grilling format's two opening lines; every later question and agent holds scope changes against it and says so. Tickets each name the part of the intent they serve: one serving two separate outcomes splits, one serving none is cut or logged as a bet.
6. **The intent can change in any phase, and a change restarts the Workflow.** It restarts from the intent, reusing artifacts only where they match the new one. After Implement started, running Subagents finish, nothing new is dispatched, every ticket and merged task is rechecked, and a new Decision gate follows.
7. **Drift is reported, then recorded.** Before Implement, every agent checks its actions against the intent and raises drift concerns. From Implement on, every agent records drift as an `Intent:` line in its report; the Orchestrator gathers them into the PR body's **Intent drift** section, without interrupting.
8. **The records judge the method.** Each Workflow's record gets an Intent section (turns, how far the pitch moved, approved or given up, drift found later and whether it was real). Fortify judges the method after about three.

## Considered options

- **A grill round with recommendations for the intent.** Rejected: a recommendation invites a lazy yes, and the intent needs the Operator's own words on strategy and impact.
- **addy's one question plus a guess.** Rejected as written: the guess anchors like a recommendation; the running pitch keeps its focus without the anchor.
- **A new phase before Define, or an "iDrive" rename.** Rejected for now: a step inside Define costs no change to the phases, `drive status` phases or the name. Promote it if it proves a phase of its own.
- **Intent as a committed doc per Workflow.** Rejected: it matters for one Workflow; the spec's Intent section is what every reader opens.
- **Judging whether a scope change is good.** Rejected: it cannot be judged at the moment; making it explicit and recorded is what can be done.

## Consequences

- Every Workflow starts with a few Operator turns before the grill or the spec.
- `drive status` reads `decisions.md` for the mode and the intent; `drive pr ready` refuses a PR body without an Intent drift section.
- The record format gains an optional Intent section in `/learnings`.
- ADR SKL-002 Decision 1.5 is reworded so an interview may run in rounds or one question at a time.
- Enforcement: the two CLI checks above and `learnings check`; holding scope changes against the intent is left to review.
