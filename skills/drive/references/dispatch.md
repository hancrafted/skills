# Dispatch

How the Orchestrator hands tickets to Subagents, and the Handoff they return. One contract for every provider: a Subagent in this session reads the same brief and writes the same report as an agent another provider runs from a copied brief.

- [Before each wave](#before-each-wave)
- [Before each dispatch](#before-each-dispatch)
- [A decision page](#a-decision-page)
- [The shared brief](#the-shared-brief)
- [Follow-up briefs](#follow-up-briefs)
- [The task brief](#the-task-brief)
- [The report](#the-report)

## Before each wave

Run `drive dispatch check [--base <Integration branch>] <issue number…>` on the tickets about to go out together. Without `--base` it takes the Integration branch from the tickets' `## Parent` epic: the single Decision PR whose `## Spec` names that epic; with none or several it refuses and asks you to pass `--base`. Merged means merged into the Integration branch, not the one you sit on. It fails a ticket missing its `Files:`, `ADRs:` or `Evidence from:` line, two queued tickets whose `Files:` globs overlap, and a `Describes:` target not yet merged. Fix the order or the ownership it names, then dispatch. A ticket carries those four lines under its **Skills** and **Review after** lines:

```markdown
Files: <paths or globs the ticket owns>
Describes: <tickets whose result it documents, or none>
ADRs: <ADRs that bind it>
Evidence from: <the log lines, failure modes or decisions behind it>
```

## Before each dispatch

1. **Overlap.** List the open PRs and every other worktree (`git worktree list`), with the paths each touches. A path this ticket will change that another session also changes: settle it before the gate and name it in the Decision PR. After the gate, run this ticket after the other work and log the order in `decisions.md`; only a conflict with the spec is an interrupt.
2. **Ownership.** Give each concurrent ticket the paths it owns, and name the paths it must leave alone. Two tickets that need one file run one after the other.
3. **Model.** Pass the model explicitly on every dispatch; an inherited model is a bug. The Operator's override for this session wins. Name the resolved model in the dispatch line you write in the conversation ("dispatching #797 on opus (top)"), so the Operator sees the tier before the Subagent starts. The Binding names a **Model tier** (`mid` or `top`); resolve it to a model through this harness's provider entry under `models` in `project.yml` (Claude Code: `models.claude`).

   | Work                       | Tier                       |
   | -------------------------- | -------------------------- |
   | implementation, fixes      | `implement`'s              |
   | decision page              | by the fidelity rule below |
   | log mining, review support | `verify`'s                 |
   | Fortify evidence           | `evolve`'s                 |

   The fidelity rule for a decision page, read from `review.md` and the items' rungs, applied as written: every item at `diagram` or below runs on `mid`; any item at rendering, mockup, visual prototype or interaction runs the whole page on `top`.

4. **Agent type.** Start every Subagent as `agentType` from `binding.yml`.
5. **Cap.** Run at most the lower of `parallel.default` and `parallel.harnessCap` from `project.yml` at once; queue the rest and start the next the moment one finishes.
6. **Worktree.** Create the Task branch's worktree yourself, in the background: `drive worktree new <Task branch> --base <Integration branch>`.

Dispatch a ticket the moment its last blocker is merged and checked.

A Subagent's report with no **Merge** line means it stopped early: resume that Subagent (`SendMessage`, or the provider's equivalent) with only its remaining steps, and leave its finished work alone.

## A decision page

Reason's pages share one task shape. The brief passes `review.md` (`drive status` reports whether it is filled; [setup](setup.md) "Optional inputs") as the page skill's caller inputs, so it skips calibration, and names the items. The Subagent's _Done when_:

1. the page is built in the mode `review.md` gives for this use;
2. it holds a screenshot at two widths (the review width and a narrower one), in light and dark, taken with the Binding's `visual-check` skill when a phase binds it under `verify`, else with the page skill's own verification;
3. it read at most one image per iteration, the DOM numbers first, and fixed each defect found (mid-word wraps, clipped text, a missing control) before reporting;
4. its report says what it checked at each width and theme.

## The shared brief

`.scratch/<topic>/brief.md`, written once per Workflow and read by every Subagent first:

```markdown
# Brief: <topic> (spec <tracker ref>)

You are a Subagent on one ticket of <spec ref>. Words: <glossary path>. Design: <decision docs>.

Profile: the implementer's, in <path to this skill>/references/profiles.md, extended by docs/drive/profiles.md.

## Rules

1. Before anything, confirm your worktree's branch contains <Integration branch>.
2. Build the ticket with the skills its **Skills** line names.
3. Every acceptance criterion is done, or reported `not done` with the blocker that stopped you; judging one unnecessary is not a blocker.
4. Verify with <the project's quick and full verification commands>; commit the project's way.
5. Run `git status` before staging; report any change you did not make and leave it unstaged.
6. Finish as <path to this skill>/references/worktrees.md "How a Subagent finishes" says.
7. Never push (and never pipe `drive push`), open a PR or run the pre-push verification; never edit installed skills; never edit Decision docs: propose terms under **Terms** instead.

## Report

<the report template below>
```

## Follow-up briefs

A fix, review-fix or fixture task gets its own task brief, in the same shape. Its first line points at the shared `brief.md`, whose Rules and Report bind it as they bind a ticket; the findings or failures to fix stand in for the ticket's acceptance criteria, one line each in its report.

## The task brief

`.scratch/<topic>/<task>.brief.md`, short; it points rather than inlines:

```markdown
Ticket: <tracker ref> (read its comments too), or the findings to fix. Brief: .scratch/<topic>/brief.md; its Rules bind this task.
Worktree: <path>. Task branch: <name>. Integration branch: <name>. Model: <model>.
You own: <paths>. Leave alone: <paths, and why>.
Merge: self-merge | by PR (stop after commit).
Report to: .scratch/<topic>/<task>.report.md
```

For a Subagent in this session, the task brief is its whole first message.

## The report

`.scratch/<topic>/<task>.report.md`, under 150 words besides the criteria. A criterion left undone names the ticket that takes it, as `deferred: <issue url>`:

```markdown
## Acceptance criteria

- [x] <acceptance criterion> — <evidence>
- [ ] <acceptance criterion> — not done: <why>; deferred: <ticket url>

- **Merge:** <merge commit hash>, <files changed, insertions, deletions>
- **Not verified:** <what could not be checked, and why>
- **Trade-offs:** <each one, with its cost>
- **Interfaces changed:** <commands, flags, exports, file formats>
- **Terms:** <words needed that the glossary lacks, with a proposed meaning>
```

`drive worktree done` reads this report for a Task branch `<type>/<topic>--<issue>-<task>` and refuses to merge when it is missing, has no `## Acceptance criteria` section, or holds a `- [ ]` line without `deferred: <ticket url>`. Write the report before `worktree done`.

An empty **Not verified** or **Trade-offs** line says `none`; a missing line counts as a failed check.
