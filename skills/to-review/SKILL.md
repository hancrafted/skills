---
name: to-review
description: Creates standalone HTML for human review and revises it from feedback. Use when a person needs to choose between Options, approve or comment on proposals, or understand decisions already made.
compatibility: The local grader requires Node.js with TypeScript support, @playwright/test, cheerio and Playwright Chromium. Page authoring works without the grader.
---

# To review

## Overview

A **decision page** is one standalone HTML file. In mode `decide` a person decides open decisions from it with confidence; in mode `explain` a reader understands decisions already made. Every item leads with its decision, and each visual serves that decision. You write the page and stop there: the caller owns what happens next, including implementing what the page proposes.

## When to Use

- A person must choose between Options, or approve or comment on proposals (mode `decide`).
- A reader must understand decisions already made (mode `explain`).
- A caller wants only the items, with its own page frame and feedback route.
- NOT for: implementing what a page proposes, which the caller owns; or a page the reader only skims for status.

## Human gates

- Before building items, when the caller left an input open: one batched calibration round asks the page's mode, audience, depth and rung, and without an answer the page proceeds with each chosen value marked assumed.

## When the caller owns the frame

When the caller owns both the frame (the page, its layout and controls) and the feedback (its format, rounds and approval), write content only: the items, their Options and visuals, built by steps 1 to 3 in the caller's markup and at the fidelity it names, handed back where it says. The caller's frame takes the place of steps 4 to 7.

## Gather

### 1. Gather the inputs

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

### 2. Calibrate once

Skip this step when the caller supplied every input. Otherwise ask one round, in the repository's grilling format when it has one. Show a table: the page's mode, audience and feedback route, then one row per item with its [depth](#depth) (`simple`, `detailed` or `both`) and fidelity rung. A cell the caller supplied shows its value as fixed; propose a value only in each missing cell, and "yes" accepts every proposal.

Without an answer, proceed, and mark each value you chose as _assumed_ on the page.

_Done when_ the page has a mode and every item a depth and rung, each confirmed or marked assumed.

## Build

### 3. Build each item: decision → evidence → rendering

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

#### Fidelity ladder

`diagram` (diagram or sketch) → `wireframe` → `mock` (real-content mock) → `prototype` (interactive). Pick the lowest rung that settles the decision, unless the caller names one. The ladder guides rather than limits. Each item states its rung and why that rung is enough, so the reviewer can ask for a higher one, and a revision may raise it.

#### Depth

Each item has a depth, set per item like its rung. The simple view alone, with every collapsible closed, clears the confidence bar; the detailed layer adds what a reader needs to verify the item, never the decision itself.

The simple view is an **inverted pyramid**, one slot per line: the plain-words name; the problem, for a **cold reader**; the proposal, led by its principle where one applies; the before/after visual. Everything else (evidence, door, effort, cost, impact, the analogy) opens on demand. Everything longer belongs in the detailed layer, which **teaches**: for a principle, what it means, where it comes from and why it helps here, then the precise detail and references.

| Depth      | The item shows                                                                                             | Choose it when                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `simple`   | The pyramid's four slots alone; the labelled evidence and, in `decide`, the recommendation open on demand. | The audience is new to the domain, or the item has no detail worth checking. |
| `detailed` | The simple view plus context, precise technical detail and references, all shown at once.                  | Every reader will verify the claims.                                         |
| `both`     | The simple view first, and one toggle that reveals the detailed layer.                                     | The audience mixes newcomers with readers who verify.                        |

Without caller input, propose `both` for an item whose references or technical detail stand behind a simple decision, and `simple` otherwise.

#### Diagrams and motion

Keep each Mermaid diagram's source word for word in `<script type="text/x-mermaid" data-diagram="<name>">`, so it can be copied into documentation, and render it beside the script, in the same parent element. With a browser tool, pre-render the source to inline SVG while you build the page; without one, use the fallback, which shows the source as text until Mermaid renders it. [Diagrams](references/diagrams.md) gives both procedures.

Animate with CSS transitions and the Web Animations API, and honour `prefers-reduced-motion`. Inline a library only when the caller names it, such as a motion library's core at the caller's pinned version; the diagram fallback is the one exception.

#### Confidence bar

An item is finished when a reader can answer from the page alone:

1. Can a cold reader say, per Option, what it is and what runs differently after? (`decide`; in `explain`, per item, what it is and what changes)
2. What is the decision, in one sentence?
3. What changes for me?
4. Which statements are evidence, which are proposals, which are unknown?
5. Which Option is recommended, and why? (`decide`)
6. Is the fidelity enough to judge it?
7. Is it a one-way or two-way door, and how much effort does it take? (`decide`)

_Done when_ every item clears the bar for its mode.

## Page

### 4. Lay out the page

Copy [the page skeleton](assets/page-skeleton.html) and fill its slots; its comments say where each part goes. Lay the page out as [the layout reference](references/layout.md) says: a banner header, a visible navigation, the item's decision and visual beside a sticky rail holding the pick bar, the Option cards and the comment, a one-row toolbar from [the toolbar asset](assets/toolbar.html), and one review panel at the bottom. Build for laptop (1440 px) and landscape tablet (1024 px): the page never scrolls sideways, and no box clips or spills its text. Follow the caller's design guidance and tokens; without them use design tokens with light and dark themes. Every field and button has an accessible name, every control shows a visible focus indicator, and text reaches WCAG AA contrast (4.5:1, or 3:1 for large text) in both themes. Under `prefers-reduced-motion: reduce`, nothing animates.

_Done when_ the toolbar is one row at 1024 px and wider, a fixed-size preset shows its whole frame below the toolbar, the review panel spans the content width, every item's visual stays at least half in view beside its comment fields at both widths, the first item's heading starts within the first screen of a laptop with the background cards closed, the content keeps 1000 px beside the rail on a laptop with the navigation collapsed, a visual with a design size reaches it on a 2560 px screen, and every control is labelled, shows focus and reads at AA contrast in both themes.

### 5. Add the mode's controls

Both modes carry one reflection block of open questions through lenses the items may have missed. The reader writes the answers, so the page shows no agent-written answer, hint or answer key beside a prompt.

**`decide`**: follow [the decide controls](references/decide-controls.md): each item takes a response, a pick bar that starts on the recommendation, Redesign, Reset, comments on every item and Option, the Before you approve block and the allowed Next actions.

**`explain`** teaches decisions someone else already made, with no picks: follow [explain mode](references/explain-mode.md).

_Done when_ every item carries its mode's controls, and the page holds its mode's blocks: Before you approve and the Next action in `decide`, reflection and Questions? in `explain`.

### 6. Hand back the feedback

Apply the [feedback contract](references/feedback-contract.md): Copy as prompt and Save carry the reviewer's responses and comments back to you, verbatim, with no server. The contract says where Copy as prompt sits and what it copies.

_Done when_ the page names its [feedback file](references/feedback-contract.md#save) or the caller's destination.

## Deliver

### 7. Deliver and verify

The page loads with no network: inline all CSS and JavaScript, embed every asset, and draw diagrams as inline SVG.

#### Page contract

The page carries the attributes in [the page contract](references/page-contract.md): `data-page-id`, `data-revision` and `data-mode` on `<html>`, `data-item`, `data-fidelity` and `data-depth` on each item, `data-option` and `data-recommended` on each Option, and the hooks for reflection, Copy as prompt, Save and the Next action.

#### Hand over

Open the page with the platform's opener, then print three lines: the page's absolute path and its mode; the feedback file's name or the caller's destination; and how to continue: after Save, say "saved feedback"; after Copy as prompt, paste the prompt into this or any agent session. A person who wants to check the page follows [verification](references/verification.md).

_Done when_ the page is inlined, the person has it open and has those three lines.

## Common Rationalizations

| Excuse                                                                         | Rebuttal                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The reader was in the session, so the page can skip explaining the decision." | The default audience is a **cold reader**: no recall of the session, under high load. A page asked for a decision before explaining it, and the reader said the content was not explained or visualized well enough to decide (`docs/learnings/to-review/records/2026-11-17-explain-before-deciding.md`).                                               |
| "More text makes the page thorough."                                           | Visible words in that run went 736 (haiku), 815 (sonnet) to 1077 (opus), and the reader found it far too much to parse. Haiku had the fewest words and the worst page, so the fault was composition, not length: lead with the inverted pyramid and close every collapsible (`docs/learnings/to-review/records/2026-11-17-explain-before-deciding.md`). |
| "A count is evidence enough."                                                  | A label says what the evidence shows, never only how many: an incident gives what happened, when and its cost, or `unknown` (`docs/learnings/to-review/failure-modes/explain-before-deciding.md`, rule "evidence that says what it shows").                                                                                                             |
| "I will compose the layout from scratch."                                      | A weak model's layout was "terrible" and inline code wrapped one letter per line. Copy the page skeleton and the toolbar asset; the grader's overflow check fails a word that wraps mid-word (`docs/learnings/to-review/records/2026-11-17-explain-before-deciding.md`).                                                                                |
| "An analogy makes the Option clear on its own."                                | An analogy explains and never proves. Give it a toggle on its Option, closed by default, and name where it breaks down (`docs/learnings/to-review/failure-modes/explain-before-deciding.md`, rule "closed collapsibles").                                                                                                                               |
| "This Option changes nothing existing, so it needs no before and after."       | Show before and after for every change, fixes included; the before comes from evidence or the page says unknown. `data-before` and `data-after` come as a pair of visuals the grader checks (`docs/learnings/to-review/failure-modes/explain-before-deciding.md`, rule "`data-before` and `data-after`").                                               |

## Red Flags

- The first screen asks for a pick before a visual or an example explains the decision.
- The simple view makes no sense until a collapsible is opened.
- An Option has `data-before` without `data-after`, or the reverse.
- Inline code, an After list or any word wraps mid-word in a preview.
- Evidence is labelled with a count alone, or a research question is stated as a finding.
- An analogy is open by default or names no point where it breaks down.
- An agent-written answer, hint or answer key sits beside a reflection prompt.
- The page loads a script, stylesheet or image over the network.
- The agent implements what the page proposes.

## Verification

- [ ] `grep -nE '<(script|link|img)[^>]+(src|href)="https?:' <page.html>` prints nothing, so the page loads with no network (the `data-offline="partial"` diagram fallback is the one exception).
- [ ] `grep -o 'data-mode="[a-z]*"' <page.html>` prints the page's mode, and `<html>` also carries `data-page-id` and `data-revision`.
- [ ] With every collapsible closed, each item answers the confidence-bar questions for its mode from the page alone.
- [ ] The hand-over printed the page's absolute path and mode, the feedback file or the caller's destination, and how to continue.
- [ ] When this skill itself changed: `node scripts/grade-page.ts <page.html>` and `npm run review:prove` both exit 0, and the evals pass. The grader proves mechanics, not taste: whether a page looks right and explains well stays with human review.

### 8. Learn

When the person faults how a page works rather than what it says (picking, amount of text, framing, layout, controls), or a step failed, and `/learnings` is available, ask "Record learnings from this run?" and on yes run `/learnings` for skill `to-review`, then revise the page as usual. A clean run asks nothing.

_Done when:_ the question was asked and answered, or the run was clean and the step skipped.
