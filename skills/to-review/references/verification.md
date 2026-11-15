# Artifact verification

These are the checks the grader leaves to you; what it already proves is listed per check by `node scripts/grade-page.ts`. Use the repository's browser and inspection tools, or a temporary browser script.

## Mechanical checks

Check the delivered HTML, with networking disabled, at desktop and landscape-tablet widths. Exercise its actual controls; an isolated mock is not the review page.

| Action                           | Required observation                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Navigate all review items        | The displayed Option is identifiable separately from choices.                                                                                                      |
| Select, deselect and reset       | Boolean, single/multiple choice and per-item reset behave as declared; untouched items export as skipped.                                                          |
| Use preview tools while editing  | Focus and text are retained, and the useful subject of the visual, not merely an edge, stays visible while commenting.                                             |
| Reload with a draft              | Choices and item/Option comments survive; other decision pages and evaluation arms do not inherit them.                                                            |
| Raise `data-revision` and reload | Each item starts on its default, not on the earlier revision's draft, and the approval is gone; the earlier revision's feedback shows read-only.                   |
| Export all response states       | The handoff names the page id, revision and destination, keeps every comment, marks untouched items skipped and keeps agent-preset text apart from the reviewer's. |
| Block or corrupt draft storage   | Editing and handoff still work, with a truthful recovery warning.                                                                                                  |

For the handoff controls, also exercise:

- The Next action starts on the recommended action with its `(recommended by agent)` sentences; changing the action clears them, including after a draft restores.
- Saving with an approval action selected exports approval of this revision, with no second confirmation.
- A confirmed Reset all restores the recommended action and its sentences.
- The page says that Save accepts the selected Next action and names the feedback file.

Wait on observable states, not fixed sleeps. Inspect both themes when theme switching is offered. Verify keyboard operation beyond focus visibility. For motion, verify purposeful states without claiming a geometry test proves the effect looks liquid.

## Human checks

Read each item as its intended audience. Can they understand the decision and consequences from the visual? Are alternatives genuinely different? Is the recommendation explained? Does an analogy clarify rather than distort? Do before/after pictures tell the same story as the precise details?

Read each reflection prompt, Before you approve in `decide` and the reflection block in `explain`: it opens a question the decisions leave to the reader, and nothing on the page answers it for them.

Visual taste and explanatory usefulness need human judgment. Passing DOM checks is not proof of either.

## Report

Report the checks actually run and any failure or omitted check. Ordinary paste validation does not certify a specific operating-system dictation tool: actual-tool compatibility remains unverified until exercised. If tooling prevents a check, name the limitation instead of claiming a pass.
