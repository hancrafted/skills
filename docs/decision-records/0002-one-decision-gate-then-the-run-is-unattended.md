---
type: decision-record
title: One Decision gate, then the run is unattended
status: accepted
---

# One Decision gate, then the run is unattended

The Operator approved this on 2026-11-18, after the first three `/drive` Workflows (ai-attention-span-pool, ai-gives-you-more-work-pool, onboard-ai-every-time-event-look). Those runs still reached the Operator after Implement had started: a Decision docs PR to the base branch that blocked the Integration branch until it merged and synced, a separate ticket confirmation, "tell me if you contest" after each review, a `/retro` request, Fortify picks, and an Event-date warning only at the PR. The Operator could not tell when it was safe to step away. This record extends Decision record 0001, _Workflow phases are ports bound per project_. Moved from content-library Decision record 0028 (Decision record 0004). Terms: [Drive glossary](../../skills/drive/GLOSSARY.md).

## Decisions

1. **The Integration branch comes first.** The Orchestrator creates and pushes it when the Workflow starts. `decisions/<topic>` starts from it, and the Decision PR targets it, not the base branch.
2. **One Decision gate.** Grilling, decision pages and the other Define and Reason skills all lead to it. The Operator passes it by merging the Decision PR, or by an explicit approval in the conversation when no Decision doc changes. Merging approves the Decision docs, the spec and the tickets together; the separate ticket confirmation is gone.
3. **The Decision PR states the run's terms.** Its body links the spec and every ticket with their Skills and Review after lines, names what the change touches that is live or scheduled (shift left: settled before the gate, never raised at the PR), and states the run's terms: the remaining stops, the expected duration and the closed interrupts.
4. **The Orchestrator watches the gate.** It polls the Decision PR in the background. Merged: it syncs the Integration branch from the remote and dispatches. A review comment: grilling input, revised on `decisions/<topic>` and pushed. Closed unmerged: the Workflow stops.
5. **Closed interrupts.** After the gate, the Workflow stops only for a conflict with the spec or a binding decision, CI red after two fix rounds, or a Subagent blocked by something outside its brief. Review findings are triaged and logged without asking; the Operator contests them in the PR.
6. **A notify port in the Binding.** At an interrupt and when the PR is ready, the Orchestrator notifies the Operator through the Binding's `notify` port. The default adapter is the agent harness's push notification; email or a chat channel is another adapter later.
7. **Fortify blocks nothing.** It runs after the Operator merges, on a branch from the base branch. Every option goes to the learnings file, the recommended architectural option becomes the one `fortify` ticket, and the Operator picks a quick win when triaging it.
8. **The CLI owns what prose failed to hold.** `drive push` pushes and fails unless the remote branch equals the local commit. `drive worktree done` runs the project's `beforeMerge` hooks in the task worktree, so a project can run its build tests before a Task branch merges.

## Considered options

- **Decision docs PR to the base branch, as before.** Rejected: the Operator's merge blocked dispatch and forced a sync, and a change request blocked it again.
- **A stacked PR** (the Integration branch's PR based on `decisions/<topic>`, retargeted after the docs merge). Rejected for the simpler rule: one Decision PR into the Integration branch, and the Integration branch alone reaches the base branch.
- **Approval by a GitHub review, polled.** Rejected: the merge is already the Operator's gesture of approval, and a review adds a second state to poll.
- **An open list of reasons to interrupt, judged case by case.** Rejected: the three runs show the Orchestrator asks whenever it may, so "step away" holds only with a closed list.
- **A Fortify pick stop at the end.** Rejected: the Operator skipped every pick in four runs to finish the job, though the options were good; a ticket keeps them without blocking.

## Consequences

- The Operator has two stops in a run with Decision docs: the Decision gate and the merge of the Integration branch's PR. Before the gate, the Operator is in the loop; after it, on the loop.
- Decision docs reach the base branch only with the Integration branch. Parallel Workflows do not see new terms until then, and two Workflows that edit one glossary may conflict; a later cherry-pick of the Decision PR to the base branch narrows this.
- Watching the gate needs a live session; a quota reset still ends the watch (learnings: "Workflow progress lives only in the session").
- Enforcement: the `drive` CLI tests cover `drive push`, the PR watch and the `beforeMerge` hooks; `drive guard` still keeps Decision docs on `decisions/<topic>`; the run's terms and the interrupt list are checked by review only.
