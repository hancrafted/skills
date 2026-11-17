---
name: to-review
description: Creates standalone HTML for human review and revises it from feedback. Use when a person needs to choose between Options, approve or comment on proposals, or understand decisions already made.
compatibility: The local grader requires Node.js with TypeScript support, @playwright/test, cheerio and Playwright Chromium. Page authoring works without the grader.
---

# To review

A **decision page** is one standalone HTML file. In mode `decide` a person decides open decisions from it with confidence; in mode `explain` a reader understands decisions already made. Every item leads with its decision, and each visual serves that decision. You write the page and stop there: the caller owns what happens next, including implementing what the page proposes.

## When the caller owns the frame

When the caller owns both the frame (the page, its layout and controls) and the feedback (its format, rounds and approval), write content only: the items, their Options and visuals, built by steps 1 to 3 in the caller's markup and at the fidelity it names, handed back where it says. The caller's frame takes the place of steps 4 to 7.

## Feedback on the skill

When the person faults how a page works rather than what it says (picking, amount of text, framing, layout, controls), add a lesson to [LEARNINGS.md](LEARNINGS.md) as it describes, then revise the page as usual.

## 1. Gather the inputs

The caller supplies the domain. Take each input from the caller first:

| Input                | What it settles                                                                     |
| -------------------- | ----------------------------------------------------------------------------------- |
| Audience             | Who reads the page and what they already know.                                      |
| Decisions            | The items: open decisions for `decide`, settled ones for `explain`.                 |
| Design guidance      | Styling and design tokens, or compiled CSS to inline.                               |
| Vocabulary           | The domain terms, used exactly as given.                                            |
| Gates                | The approval rules the page keeps.                                                  |
| Allowed Next actions | The continuations the reviewer may choose (`decide`).                               |
| Feedback route       | How feedback returns, per the [feedback contract](references/feedback-contract.md). |
| Optional             | Mode, motion library, per-item depth and fidelity rung.                             |

Without caller input, write for a **cold reader**: someone who was in the session, recalls none of it, and is under high load.

Explore the working folder and any links you are given for evidence. The page lists every file and link you read, so the reader sees what its claims rest on.

For a revision of an existing page, read it first: keep its page id and every item and Option id, and raise `data-revision` by one.

_Done when_ every input is supplied or listed as missing.

## 2. Calibrate once

Skip this step when the caller supplied every input. Otherwise ask one round, in the repository's grilling format when it has one. Show a table: the page's mode, audience and feedback route, then one row per item with its [depth](#depth) (`simple`, `detailed` or `both`) and fidelity rung. A cell the caller supplied shows its value as fixed; propose a value only in each missing cell, and "yes" accepts every proposal.

Without an answer, proceed, and mark each value you chose as _assumed_ on the page.

_Done when_ the page has a mode and every item a depth and rung, each confirmed or marked assumed.

## 3. Build each item: decision → evidence → rendering

Order items by consequence, most consequential first. For each item:

1. **Decision.** State it in one sentence at the reader's **altitude**, the level they judge it at, then what changes for them: under each Option in `decide`, overall in `explain`. A decision made in code but judged by its effect names, per Option, the principle or pattern it applies (decoupling, high cohesion, a SOLID principle, a design pattern), its benefit, its cost and its impact; symbols and files sit in the detailed layer.
2. **Evidence.** Assemble the bundle: examples, visuals, context and references. Label every statement as evidence (with its source), agent proposal or unknown. A label says what the evidence shows, never only how many; an incident gives what happened, when and its cost, or `unknown`. A research question is not a finding. Explain technical meaning in plain words and keep the precise detail in the detailed layer.
3. **Rendering.** Choose it from the table, at a rung of the fidelity ladder.

| Decision                 | Rendering that helps a person judge it                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Software architecture    | Before/after dependency, sequence, UML or ER diagrams of the structure the principle changes; files affected in the detail. |
| Information architecture | Before/after folder trees, naming examples, navigation maps or content relationships.                                       |
| UI or visual design      | Real-content mocks at useful widths, compared at a scale where hierarchy and density can be judged.                         |
| UX or animation          | Live states and transitions; pointer and keyboard controls, replay, and reduced-motion behaviour where relevant.            |
| Feature or user story    | A user journey, state diagram or concrete scenario: actors, intended outcome, alternatives and acceptance examples.         |
| Bug fix                  | Observed against expected behaviour, then the before/after proposal; a reproduced failure told apart from a reconstruction. |
| Concept or requirement   | A relationship diagram, worked example or process visual; precise detail one step deeper.                                   |

Show before and after for every change, fixes included. The before comes from evidence; when it is unknown, the page says unknown. Graph-shaped relationships get a diagram; when a graph layout hides the point, compose HTML and SVG instead. True alternatives differ in the decision itself. An analogy explains and never proves: give it a show/hide toggle on its Option, closed by default, and name where it breaks down.

### Fidelity ladder

`diagram` (diagram or sketch) → `wireframe` → `mock` (real-content mock) → `prototype` (interactive). Pick the lowest rung that settles the decision, unless the caller names one. The ladder guides rather than limits. Each item states its rung and why that rung is enough, so the reviewer can ask for a higher one, and a revision may raise it.

### Depth

Each item has a depth, set per item like its rung. The simple view alone, with every collapsible closed, clears the confidence bar; the detailed layer adds what a reader needs to verify the item, never the decision itself.

The simple view is an **inverted pyramid**, one slot per line: the plain-words name; the problem, for a **cold reader**; the proposal, led by its principle where one applies; the before/after visual. Everything else (evidence, door, effort, cost, impact, the analogy) opens on demand. Everything longer belongs in the detailed layer, which **teaches**: for a principle, what it means, where it comes from and why it helps here, then the precise detail and references.

| Depth      | The item shows                                                                                      | Choose it when                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `simple`   | The decision, what changes, the visual, the labelled evidence and, in `decide`, the recommendation. | The audience is new to the domain, or the item has no detail worth checking. |
| `detailed` | The simple view plus context, precise technical detail and references, all shown at once.           | Every reader will verify the claims.                                         |
| `both`     | The simple view first, and one toggle that reveals the detailed layer.                              | The audience mixes newcomers with readers who verify.                        |

Without caller input, propose `both` for an item whose references or technical detail stand behind a simple decision, and `simple` otherwise.

### Diagrams and motion

Keep each Mermaid diagram's source word for word in `<script type="text/x-mermaid" data-diagram="<name>">`, so it can be copied into documentation, and render it beside the script, in the same parent element. With a browser tool, pre-render the source to inline SVG while you build the page; without one, use the fallback, which shows the source as text until Mermaid renders it. [Diagrams](references/diagrams.md) gives both procedures.

Animate with CSS transitions and the Web Animations API, and honour `prefers-reduced-motion`. Inline a library only when the caller names it, such as a motion library's core at the caller's pinned version; the diagram fallback is the one exception.

### Confidence bar

An item is finished when a reader can answer from the page alone:

1. Can a cold reader say, per Option, what it is and what runs differently after? (`decide`; in `explain`, per item, what it is and what changes)
2. What is the decision, in one sentence?
3. What changes for me?
4. Which statements are evidence, which are proposals, which are unknown?
5. Which Option is recommended, and why? (`decide`)
6. Is the fidelity enough to judge it?
7. Is it a one-way or two-way door, and how much effort does it take? (`decide`)

_Done when_ every item clears the bar for its mode.

## 4. Lay out the page

A banner `<header>` holds the `<h1>` and a sentence stating purpose and scope. A `<nav>` links to every item and stays visible while the page scrolls; collapsed, it gives back all of its width, leaving only the page gutter. Build for laptop (1440 px) and landscape tablet (1024 px): the page never scrolls sideways, and no box clips or spills its text. On a laptop with the navigation collapsed, the content keeps at least 1000 px with the rail beside it: the Options sit in a rail to the right of the visual, and no empty column wider than the 48 px gutter remains at the left. The page **grows** with the screen: a visual with a design size the caller names (a 1920 × 1080 frame) widens up to that size, so the content column's cap is the widest design size, not a reading width.

While the reviewer types, pastes or dictates a comment, at least half of the visual it is about stays in view, even with tall content and long comments. Take this arrangement unless another keeps visual and comment in view together better: the item's decision and visual sticky in the main column, a sticky right-hand rail beside it, and a collapsible left navigation to win back width. The rail holds, top to bottom:

- **Row 1:** the pick bar (step 5), with its Redesign segment last, a "Show details" toggle button (`aria-expanded`) and the item's Reset.
- **The Option cards**, under row 1 and collapsed until Show details. An Option that needs its own before/after (not one that is merely long) is its own section, with its own `data-visual` and its own comment; the rail then holds only the pick bar (row 1), and cards stay for Options that share one visual. A card keeps its description, its build notes and a View button, shows Recommended once, and leaves picking to the pick bar.
- **Row 2:** the item's comment, a `<textarea>` of 4 rows by default.
- **Supporting text**, below the comment: text the reader consults about an item rather than decides on (its background, rationale or the words behind it) sits in the rail as collapsibles, closed by default, so the visual leads the main column.

A sticky top toolbar holds the page-wide reviewer tools in **one row** at every width from 1024 px up; below 1024 px the row scrolls inside itself, and the page never scrolls sideways. Copy [the toolbar asset](assets/toolbar.html) into the page: its comment says where each of its three blocks goes. It carries the outline dropdown, one segmented bar of the render presets the caller names (such as desktop, laptop, tablet, mobile; one selection that re-renders every preview at that size at once), the theme switch and a reserved slot at the end for more tools. Supply the presets as the asset's JSON data. A preset's label is its name only; its size sits in the tooltip and the accessible name ("Laptop, 1440 px"). Add a new tool to the reserved slot, so the bar stays one row. A Copy as prompt button belongs there too when it fits the row ([feedback contract](references/feedback-contract.md#controls) says which button carries `data-copy-prompt`). An item adds its own tools, such as state or motion controls, where it needs them.

A preset with both a width and a height has a **fixed design size**, such as a vertical 1080 × 1920 frame. The asset's script sets `--preview-width`, `--preview-height` and `--preview-scale` on `<html>`, plus `data-preview-fixed`. The page keeps the visual's layout at the design size and scales it down uniformly with `transform: scale(var(--preview-scale))`, with a negative margin that returns the room the unscaled box would take, so the content scales from its design size at every width. The scale makes the whole frame fit the viewport: its height is `100vh` less the toolbar's height and a margin above and below, and its width follows from the aspect ratio. With the item's top under the toolbar, the frame is visible without scrolling. The asset states the margin and its other numbers in its `data-toolbar-config` JSON, the one place a page builder reads them.

One small circle at the bottom right, 48 px across, moves through a long page: its upper half scrolls to the top and its lower half to the bottom. Each half shows only a caret icon, as inline SVG with no text, keeps its own accessible name ("Scroll to top", "Scroll to bottom") and a visible focus ring, and is at least 24 × 24 px (the WCAG 2.2 target size minimum).

The page-wide review (the general comment, **Before you approve**, the Next action, Copy as prompt and Save) is one panel at the bottom of the page. It spans the full content width, under the rail's column too, and leaves no empty column beside it. Inside it, use the width: the reflection lenses in a row, then the comment beside the Next action and Save, stacked below 832 px.

Context the reader consults rather than decides on, such as background cards ahead of the items, sits in one row of collapsibles, closed by default and opening in place, so the first decision starts high on the page. A field inside a closed collapsible still submits with the form, and a link to its anchor opens it.

**Look.** Follow the caller's design guidance and tokens; without them, use design tokens with light and dark themes. Keep the page minimal and modern, as polish and not decoration:

- One spacing rhythm in steps of 4 px (8, 12, 16, 24, 32, 48), and a short type scale.
- Hairline borders (the border colour at about 60%), at most one soft shadow, on the visual, and two radii: one for cards and one for controls.
- One accent colour, kept for the pick and the primary action.
- Every button has a rest, hover, pressed and focus state: hover tints the text colour at about 6%, pressed at about 12%. A transition lasts at most 150 ms and exists only under `prefers-reduced-motion: no-preference`.
- A boundary the reader must find, such as a text field or the pick bar, keeps at least 3:1 contrast.

Every field and button has an accessible name, every control shows a visible focus indicator, and text reaches WCAG AA contrast (4.5:1, or 3:1 for large text) in both themes. Under `prefers-reduced-motion: reduce`, nothing animates, moves by transition or scrolls smoothly.

_Done when_ the toolbar is one row at 1024 px and wider, a fixed-size preset shows its whole frame below the toolbar, the review panel spans the content width, every item's visual stays at least half in view beside its comment fields at both widths, the first item's heading starts within the first screen of a laptop with the background cards closed, the content keeps 1000 px beside the rail on a laptop with the navigation collapsed, a visual with a design size reaches it on a 2560 px screen, and every control is labelled, shows focus and reads at AA contrast in both themes.

## 5. Add the mode's controls

Both modes carry one reflection block of open questions through lenses the items may have missed. The reader writes the answers, so the page shows no agent-written answer, hint or answer key beside a prompt.

**`decide`**

- Each item takes the response that fits it: boolean, single choice or multiple choice, behaving as the [feedback contract](references/feedback-contract.md#responses-resets-and-drafts) says.
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
- The Next action offers only the allowed Next actions, preset as the [feedback contract](references/feedback-contract.md#next-action-and-approval-decide) says.

**`explain`** teaches decisions someone else already made, with no picks: follow [explain mode](references/explain-mode.md).

_Done when_ every item carries its mode's controls, and the page holds its mode's blocks: Before you approve and the Next action in `decide`, reflection and Questions? in `explain`.

## 6. Hand back the feedback

Apply the [feedback contract](references/feedback-contract.md): Copy as prompt and Save carry the reviewer's responses and comments back to you, verbatim, with no server. The contract says where Copy as prompt sits and what it copies.

_Done when_ the page names its [feedback file](references/feedback-contract.md#save) or the caller's destination.

## 7. Deliver and verify

The page loads with no network: inline all CSS and JavaScript, embed every asset, and draw diagrams as inline SVG.

### Page contract

The page carries these attributes; everything else on it is yours to shape.

- `<html>`: `data-page-id`, a lowercase slug stable across revisions; `data-revision`, a positive integer from 1; `data-mode`, `decide` or `explain`; `data-offline="partial"` only on the [diagram fallback](references/diagrams.md#fallback-without-a-browser-tool).
- Each item: `data-item`, a stable id unique on the page; `data-fidelity`, `diagram`, `wireframe`, `mock` or `prototype`; `data-depth`, `simple`, `detailed` or `both`. In `decide`, its reset button carries `data-reset` and clears only that item.
- Each Option, inside its item: `data-option`, a stable id unique in its item; `data-recommended`, `true` or `false`; `data-before` and `data-after` on the before and after visuals of an Option that changes something existing.
- Each `<script type="text/x-mermaid">`: `data-diagram`, a unique name; the script holds the diagram's source.
- Each `both` item's depth toggle: `data-depth-toggle`, exactly one per `both` item, on the control that reveals the detailed layer; none elsewhere.
- Once per page: `data-reflection` on the reflection block, in `decide` above the Next action; `data-copy-prompt` on Copy as prompt; `data-save` on Save, which downloads the feedback file.
- Once in `decide`: `data-next-action` on the block holding the `<select>` or radio inputs that choose the action; `data-reset-all` on Reset all.
- Once in `explain`: `data-questions` on the Questions? block, holding the editable `<textarea>` for the reader's questions.
- Optional: `data-visual` on the visual a comment is about, and on a laptop the content column the grader measures: put it on the box that fills the column. Without it, the grader takes the largest `svg`, `img`, `canvas`, `video` or `iframe` in the comment's Option, else in its item.
- Optional: `data-design-width`, a positive integer of CSS px, on a visual with a design size, such as `1920` on a preview. At 2560 × 1440 the grader expects it at least as wide as the smaller of that size and the screen less the navigation (if still shown), the rail and three 48 px gutters.

### Hand over

Open the page with the platform's opener, then print three lines: the page's absolute path and its mode; the feedback file's name or the caller's destination; and how to continue: after Save, say "saved feedback"; after Copy as prompt, paste the prompt into this or any agent session. A person who wants to check the page follows [verification](references/verification.md).

_Done when_ the page is inlined, the person has it open and has those three lines.

## Evaluation

The evaluation process grades the skill; a use of the skill delivers its page ungraded. When this skill changes, run the grader (`node scripts/grade-page.ts <page.html>`), the fixture proof (`npm run review:prove`) and the evals. The grader proves mechanics, not taste: whether a page looks right and explains well stays with human review.
