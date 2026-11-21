# Controls in mode `decide`

Step 5 of the skill. Both modes carry one reflection block; these are the controls `decide` adds.

- Each item takes the response that fits it: boolean, single choice or multiple choice, behaving as the `feedback-contract.md` says.
- The pick is the item's most visible control, found without reading: a segmented **pick bar** in row 1 of the item's rail, one segment per Option and a last **Redesign** segment, single selection across all of them, with an unmistakable picked state. Each segment is at least 44 × 44 px and shows a text label (Redesign reads "↻ Redesign"); an `aria-label` alone is not shown. The recommended Option's segment carries a star icon whose accessible name includes "recommended".
- **The pick starts on the recommendation.** The recommended Option's pick input comes `checked` in the markup, so the default works without script and is sent with the form; a saved draft of the same revision overrides it, and a caller's lock overrides both. An item with no recommendation starts with no pick. Reviewers who agree with a recommendation do nothing.
- **Redesign** is the explicit way to ask for new Options: selecting it clears the item's pick, and it posts no pick value of its own. The page shows it as the item's response, and the feedback carries it as `redesign`.
- A comment is optional everywhere: it is never needed to pick an Option, to leave the recommendation, or to choose Redesign.
- Picking shows the picked Option. Viewing an Option without picking it stays possible from its details: the View button on its card shows it on the visual and leaves the pick as it was.
- Reset, beside the pick bar, returns the item to its default (the recommendation, or the caller's lock) and not its comment. A locked item is read-only: it shows the caller's pick, checked and sent, and offers no other choice, so every segment, Redesign and Reset are disabled.
- Every item with Options marks exactly one recommended, with its reason.
- Each item shows its door (one-way or two-way) and effort.
- Comments sit on each item and on each Option, unselected Options included, plus one general comment on the page as a whole, beside the Next action.
- The reflection block, **Before you approve**, sits above the Next action, through lenses such as security, operations, information architecture and accessibility.
- The Next action offers only the allowed Next actions, preset as the `feedback-contract.md` says.
