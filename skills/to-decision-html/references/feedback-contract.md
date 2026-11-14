# Feedback contract

The reviewer's feedback reaches the creating agent through the clipboard or a download, with no server and nothing to install. **A caller's own save helper and feedback format take precedence over this contract for Save:** use them, show the destination they name, and confirm a write before calling it saved. Keep this contract's response meaning in the caller's format; when that format cannot carry a response, name the gap to the caller. **Copy as prompt is never replaced:** every decision page has one, also when Save posts to the caller's server. It copies the same lines Save would write, led by one line naming the page and its revision, and it works with that server stopped.

## Controls

- **Copy as prompt** (`data-copy-prompt`) and **Save** (`data-save`) sit together, each with an icon and a visible label. In `decide` they sit beside the Next action; in `explain`, in the Questions? block. A second Copy as prompt on the toolbar, when it fits the one row, runs the same copy and carries no `data-copy-prompt`.
- A **reply composer** beside them shows the prompt as selectable text and rebuilds it on every edit, after `html-effectiveness` `unknowns/03-design-directions.html`. Credit it in a page comment: Apache-2.0, Copyright 2026 Anthropic PBC.
- `decide` adds a **general comment**, one `<textarea>` beside the Next action for feedback on the page as a whole; in `explain` the Questions? field plays that part.
- `decide` adds **Reset all** (`data-reset-all`) and a reset per item (`data-reset`, inside its item), each with a reset icon and a label naming what it clears. A caller whose frame has locks leaves Reset all out, since it would unlock them.
- One `role="status"` line reports every outcome.

## The handoff

Copy as prompt and Save carry the same text. It holds, in order:

1. A heading naming the page id, revision and mode.
2. The receiving agent's instructions: save the text verbatim to the destination; stop when the page's `data-revision` differs; sending it accepts the Next action it names.
3. A fenced `json` block written with `JSON.stringify`: the page's id, revision, mode and absolute path; the destination; the Next action, its instructions, and the approved revision or `null`; the general comment; then each item's response (`skipped` when untouched), its comment and every Option's comment, unselected Options included. `explain` carries the reader's questions in place of responses.

Comments enter exactly as typed. Text the agent preset keeps its `(recommended by agent)` mark, apart from the reviewer's words.

## Save

Save puts the handoff in a `Blob` behind `URL.createObjectURL` and downloads it through an `<a download>` as `<page-id>-r<N>-feedback.md`. The page shows that filename, its absolute destination beside the page, and the reply to give the agent: "saved feedback".

## Next action and approval (`decide`)

The Next action offers only the allowed Next actions. Preset the recommended one with 1–2 editable sentences starting `(recommended by agent)` that name the skills it proposes. Changing the action clears the sentences.

Beside Copy as prompt and Save, the page states that **Save accepts the selected Next action**, as does sending the copied prompt. That acceptance is the approval, bound to this revision; picks, drafts and resets approve nothing.

## Responses, resets and drafts

- Boolean and multiple-choice responses start unanswered and can be cleared. A single-choice response with a recommended Option starts on it, so leaving it untouched means going with the recommendation; one with no recommendation starts unanswered. A single-choice item offers "ask for new Options" (redesign) as its last choice, which clears the pick and is sent as `redesign`.
- A comment is optional on every item: no response, including redesign, needs one.
- A per-item reset returns only its item to its default (the recommendation, or the caller's lock) and leaves its comments. Reset all asks with `confirm()`, then returns every item to its default, clears every comment and restores the recommended Next action and its sentences; cancelling changes nothing.
- Drafts live in `localStorage` under a key holding the page id, per revision, and restore on load. Guard every storage call: without storage, the page says drafts are not kept, and editing, copying and saving still work.
- A new revision starts every item on its default (the recommendation, or the caller's lock), whatever the earlier revision's draft held, and shows earlier feedback read-only: embed the feedback files you hold, and list older revisions' drafts from storage. A draft overrides the recommendation only within its own revision, and never a lock.

## Truthful outcomes

Report success only once the browser confirms it: "Copied" after the clipboard write resolves, "Download started" after the download link is clicked, since the browser confirms no more than that. A denied clipboard, a failed download or a cancelled reset reports what happened, keeps every field and draft, and points to the composer for copying by hand.

## Continuation

When the person says "saved feedback", read the newest `<page-id>-r<N>-feedback.md` in their Downloads folder; when they paste the prompt, read the pasted text. Check that its page id and revision match the page, and stop and ask on a mismatch. Copy it verbatim into the project folder beside the page, unless the caller names another place, then continue with its Next action inside the caller's Gates.
