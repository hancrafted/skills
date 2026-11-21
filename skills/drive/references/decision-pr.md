# Decision PR body

The Decision PR's body holds these sections, filled from the spec, the tickets, the pre-flight and the run terms.

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
