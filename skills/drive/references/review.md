# Merge and review

The Orchestrator stays the architect over every merge and every reviewer, reading reports and diff stats rather than whole diffs.

## Check each merged task

The moment a report arrives, check it against its ticket:

1. **Shape.** Every acceptance criterion has a line, and **Not verified**, **Trade-offs**, **Interfaces changed** and **Terms** are present.
2. **Scope.** `git show --stat <merge commit>` stays inside the paths the brief gave the task; a changed interface is one the ticket or the spec asked for.
3. **Trade-offs.** Each reported trade-off is an item to verify, not a fact to accept: check its claim yourself, and ask how it will look to the Operator (a red CI run, a slower command, a changed screen). One the Operator has not accepted is logged in `decisions.md` and listed in the PR body, where the Operator contests it; it is an interrupt only when it conflicts with the spec or a binding decision.
4. **Terms.** Carry each proposed term into `decisions.md`; it reaches the glossary only through a Decision PR.

A task that fails a check is reverted at once in the Integration branch's worktree: `git revert -m 1 <merge commit>`, then re-dispatch it with the reason. Each task is one merge commit, so a revert touches nothing else.

A task the brief marks _by PR_ (the Operator asked to see its diff or preview; list it among the run's terms in the Decision PR, since the Operator's merge is an added stop): push the Task branch, open its PR into the Integration branch, and check it the same way once the Operator merges it.

## The Integration branch's PR

Push the Integration branch after every merge with `drive push`, in the background (the push runs the project's pre-push checks). The first push after the first merge opens the draft PR to the base branch, with a short body; its final body is a Subagent's task, with the bound PR skill when the Binding has one. Read every CI result; a red run is the next task, and red after two fix rounds is an interrupt. When CI is green on the last push, notify the Operator through the Binding's notify port. The Operator alone merges this PR.

## Review checkpoints

Run the Verify phase's review skill where a ticket's **Review after** line says `yes`, and once before the PR is marked ready; never after every small change. Give it the range since the last checkpoint and the spec. A review is read-only: it changes no file, and it does not report a check it did not run as an open finding; a check it could not run is listed as not run.

Every review report ends with `## Contradictions`: one bullet per suspected pair of lines that contradict each other, in the form `- "<quote>" (<file>:<line>) vs "<quote>" (<file>:<line>)`, or `none`. The reviewer looks in the changed skill and reference sections and against the repo. Save the report, then run `drive review quotes <report>` from the Integration worktree (quotes are read from the checkout you run in) before triage: it fails, one line per bad entry, when a file is missing, a quote is not on its stated line, or an entry is malformed. Send a failing report back to the reviewer. `drive pr ready` runs the same check on `.scratch/<topic>/review.md` and refuses on failure.

Triage every finding:

| Verdict    | When                                      | Record                                |
| ---------- | ----------------------------------------- | ------------------------------------- |
| **accept** | the claim holds and the fix belongs here  | the finding, for the fix Subagent     |
| **reject** | the claim is wrong or against a decision  | the reason, naming the decision       |
| **defer**  | the claim holds but belongs to later work | the reason and the ticket it moves to |

Re-check the top claims yourself against the code before you accept or reject them; a reviewer's confidence is not evidence. Log every verdict in `decisions.md` without asking, put the triage in the PR body for the Operator to contest, then hand every accepted finding to one fix Subagent on one Task branch.
