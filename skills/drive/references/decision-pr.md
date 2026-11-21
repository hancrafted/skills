# Decision PR body

The Decision PR's body holds these sections, filled from the spec, the tickets, the pre-flight and the run terms. Post the Tickets list only after `drive dispatch check` has passed on them.

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

## Watch the gate

- Merged (exit 0): run `drive worktree sync --base <Integration branch>` in the Integration worktree (it takes the remote's commits), then go to Implement.
- A review comment (exit 3): grill input. Revise on `decisions/<topic>`, `drive push`, answer on the PR starting the reply with `<!-- drive -->` (the watch skips such comments), and watch again.
- Closed unmerged (exit 2): the Workflow stops; tell the Operator.
