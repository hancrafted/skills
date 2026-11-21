# Page contract

Step 7 of the skill: the attributes the page carries; everything else on it is yours to shape.

- `<html>`: `data-page-id`, a lowercase slug stable across revisions; `data-revision`, a positive integer from 1; `data-mode`, `decide` or `explain`; `data-offline="partial"` only on the diagram fallback (`diagrams.md`).
- Each item: `data-item`, a stable id unique on the page; `data-fidelity`, `diagram`, `wireframe`, `mock` or `prototype`; `data-depth`, `simple`, `detailed` or `both`. In `decide`, its reset button carries `data-reset` and clears only that item.
- Each Option, inside its item: `data-option`, a stable id unique in its item; `data-recommended`, `true` or `false`; `data-before` and `data-after` on the before and after visuals of an Option that changes something existing.
- Each `<script type="text/x-mermaid">`: `data-diagram`, a unique name; the script holds the diagram's source.
- Each `both` item's depth toggle: `data-depth-toggle`, exactly one per `both` item, on the control that reveals the detailed layer; none elsewhere.
- Once per page: `data-reflection` on the reflection block, in `decide` above the Next action; `data-copy-prompt` on Copy as prompt; `data-save` on Save, which downloads the feedback file.
- Once in `decide`: `data-next-action` on the block holding the `<select>` or radio inputs that choose the action; `data-reset-all` on Reset all.
- Once in `explain`: `data-questions` on the Questions? block, holding the editable `<textarea>` for the reader's questions.
- Optional: `data-visual` on the visual a comment is about, and on a laptop the content column the grader measures: put it on the box that fills the column. Without it, the grader takes the largest `svg`, `img`, `canvas`, `video` or `iframe` in the comment's Option, else in its item.
- Optional: `data-design-width`, a positive integer of CSS px, on a visual with a design size, such as `1920` on a preview. At 2560 × 1440 the grader expects it at least as wide as the smaller of that size and the screen less the navigation (if still shown), the rail and three 48 px gutters.
