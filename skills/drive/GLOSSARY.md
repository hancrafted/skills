---
type: glossary
title: Drive
stale_after: 2027-02-17T00:00:00Z
---

# Drive

The words of `/drive`: one Orchestrator works with the Operator and hands execution to Subagents, then hardens the repo from what went wrong. This glossary ships with the skill, so the words mean the same in every repo that installs it. A repo that also uses one of these words for something else says so in its own glossary map.

## Process

**Workflow**: the orchestrated process `/drive` runs for one topic, through the five DRIVE phases, from the first grilling question to the merged Integration branch and its Fortify.
_Avoid_: pipeline, process, flow

**DRIVE**: the five phases of a Workflow, each named by its verb: **D**efine (_clarify_: requirements, grilling), **R**eason (_specify_: design, architecture, Decision docs, spec, tickets), **I**mplement (_codify_: the code), **V**erify (_verify_: review, integration, CI), **E**volve (_fortify_: Fortify). A skill may serve several phases and a phase several skills.
_Avoid_: stage, step, SDLC

**Fortify**: the Evolve phase. The Workflow's record is written automatically at the end of Verify; after the Operator merges the Integration branch, the Orchestrator asks once whether to Fortify now or skip. A skip is recorded with its reason. On a yes, on a branch from the base branch, it gathers what went wrong into 2–3 quick wins and 2–3 architectural options, each naming one narrow failure mode and its Enforcer, and the recommended architectural option becomes the single open `fortify` ticket, where the Operator picks a quick win when triaging it. Fortify blocks nothing.
_Avoid_: retro, retrospective (`/retro` is one evidence source), lessons learned

**Failure mode**: one narrow way the Workflow or the repo went wrong, named so an Enforcer could catch it next time. Each has one file holding its Enforcer and status; each Workflow's record cites the failure modes it hit, and the recurrence count is the number of records citing it, computed, never typed. A count of three or more is a **smell** to raise with the Operator.
_Avoid_: issue, problem, lesson

**Quick win**: a Fortify option the Operator can let a Subagent do and merge in 15–30 minutes, before cleanup.
_Avoid_: low-hanging fruit, hotfix

**Architectural option**: a Fortify option with a lasting effect on the harness, too large for the Workflow at hand; the one picked becomes the single open `fortify` ticket.
_Avoid_: tech debt item, long-term fix

**Oversight levels**: where the Operator stands in a piece of the Workflow, named by the established terms _human-in-the-loop_, _human-on-the-loop_ and _human-out-of-the-loop_. The Operator works with the Orchestrator in the loop; Subagents run with the Operator on the loop or out of the loop.
_Avoid_: autonomy level, HITL mode

## Roles

**Operator**: the person who runs a Workflow: answers the grilling, decides on decision pages, passes the Decision gate and merges to the base branch.
_Avoid_: user, human, reviewer

**Orchestrator**: the main session of a Workflow and its architect. It grills, reasons, plans, reviews, checks every Subagent report and opens the PRs; it stays lean so the conversation stays fluid. Inline it does only what needs its context and leaves no diff in the repo, plus the Decision docs, which travel through the Decision PR. Everything else goes to Subagents.
_Avoid_: main agent, lead agent, coordinator

**Subagent**: an agent the Orchestrator starts for execution: it works on its own Task branch in its own worktree from a Handoff, merges itself into the Integration branch, and never pushes. Any provider can be one.
_Avoid_: worker, implementer (an implementer is a Profile), child agent

**Profile**: the principles an agent reasons by for its role: the architect's for the Orchestrator, the implementer's for a Subagent (dependency inversion, low coupling, high cohesion). The skill ships the defaults; a project extends them. Not an agent type, which the Binding names.
_Avoid_: persona, role prompt, agent type

## Branches and handoffs

**Integration branch**: the branch an Orchestrator works on for one topic, in its own worktree, created and pushed when the Workflow starts. The Decision PR and every Task branch merge into it, and it reaches the base branch through one PR that the Operator merges.
_Avoid_: feature branch, parent branch, epic branch

**Task branch**: the branch one Subagent works on, started from the Integration branch and named after it with `--<issue>-<task>`, or `--<task>` without a ticket; it merges back as one merge commit, so a failed check reverts one commit.
_Avoid_: child branch, sub-branch, ticket branch

**Handoff**: the files that carry one task to any agent and back: a **brief** (worktree, Task branch, ticket, Profile, report format) and a **report** beside it (status per acceptance criterion, what was not verified, trade-offs, proposed terms). The Workflow's only channel between agents, whatever the provider.
_Avoid_: prompt, instructions, summary

**Topic folder**: the gitignored scratch folder of one Workflow that holds its shared brief, its decisions log and every Handoff, so the Workflow survives compaction and new sessions.
_Avoid_: scratchpad (a session's own, lost with it), workspace

**Decisions log**: the file in the topic folder where the Orchestrator writes each settled term and decision in its exact wording the moment it settles, and each Operator correction at once. Decision docs and the Fortify evidence are written from it.
_Avoid_: notes, minutes, handoff

**Decision docs**: the glossary, Decision records and feature docs: high-level wording that is written and approved before codify starts. Only the Orchestrator writes them, on a `decisions/<topic>` branch through the Decision PR; a Subagent proposes terms in its report.
_Avoid_: specs (a spec lives on the tracker), docs, documentation

**Decision PR**: the one PR of `decisions/<topic>` into the Integration branch. Its body links the spec and every ticket, names what the change touches that is live or scheduled, and states the run's terms: the Operator's remaining stops, the expected duration and the closed reasons to stop. Review comments on it are grilling input; closing it unmerged stops the Workflow.
_Avoid_: docs PR, ADR PR

**Decision gate**: the one point where the Operator approves a Workflow's Decision docs, spec and tickets together: merging the Decision PR, or an explicit approval in the conversation when no Decision doc changes. Every decision the Workflow can settle early is settled before it; after it the Workflow runs unattended to a ready PR.
_Avoid_: approval step, sign-off, checkpoint

## Binding

**Binding**: a project's mapping of the DRIVE phases to the skills it has, the Model tier each phase's Subagents run on, the agent type every agent uses and how the Operator is notified. `/drive` detects it at setup; the Operator edits it afterwards. The phases are the ports, the Binding the adapter.
_Avoid_: config, mapping, registry

**Enforcer**: a deterministic check a project already runs that can govern a failure mode: types, lint, tests, an ADR checker's rule, a hook. A narrow LLM judge counts only when its verdict can be checked. Fortify picks from the project's Enforcers.
_Avoid_: guardrail, gate, linter

**Model tier**: the class of model a Subagent runs on, `mid` or `top`, named in the Binding per phase. The project maps each tier to each provider's model, so the Binding states intent and stays provider-neutral. A decision page runs on `top` when any item needs rendering, a mockup, a visual prototype or interaction, otherwise on `mid`.
_Avoid_: model, model class, size

**Review file**: the project's calibration answers for every decision page: mode, audience, layout, depth, fidelity, feedback route. `/drive` hands it to the decision-page skill as the caller's inputs, so that skill asks no calibration questions.
_Avoid_: review config, page settings, calibration
