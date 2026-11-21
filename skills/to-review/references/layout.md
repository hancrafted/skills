# Page layout

Step 4 of the skill: how to lay out the page. `../assets/page-skeleton.html` and `../assets/toolbar.html` carry the markup.

Copy `../assets/page-skeleton.html` and fill its slots; its comments say where each part goes. A banner `<header>` holds the `<h1>` and a sentence stating purpose and scope. A `<nav>` links to every item and stays visible while the page scrolls; collapsed, it gives back all of its width, leaving only the page gutter. Build for laptop (1440 px) and landscape tablet (1024 px): the page never scrolls sideways, and no box clips or spills its text. On a laptop with the navigation collapsed, the content keeps at least 1000 px with the rail beside it: the Options sit in a rail to the right of the visual, and no empty column wider than the 48 px gutter remains at the left. The page **grows** with the screen: a visual with a design size the caller names (a 1920 × 1080 frame) widens up to that size, so the content column's cap is the widest design size, not a reading width.

While the reviewer types, pastes or dictates a comment, at least half of the visual it is about stays in view, even with tall content and long comments. Take this arrangement unless another keeps visual and comment in view together better: the item's decision and visual sticky in the main column, a sticky right-hand rail beside it, and a collapsible left navigation to win back width. The rail holds, top to bottom:

- **Row 1:** the pick bar (step 5), with its Redesign segment last, a "Show details" toggle button (`aria-expanded`) and the item's Reset.
- **The Option cards**, under row 1 and collapsed until Show details. An Option that needs its own before/after (not one that is merely long) is its own section, with its own `data-visual` and its own comment; the rail then holds only the pick bar (row 1), and cards stay for Options that share one visual. A card keeps its description, its build notes and a View button, shows Recommended once, and leaves picking to the pick bar.
- **Row 2:** the item's comment, a `<textarea>` of 4 rows by default.
- **Supporting text**, below the comment: text the reader consults about an item rather than decides on (its background, rationale or the words behind it) sits in the rail as collapsibles, closed by default, so the visual leads the main column.

A sticky top toolbar holds the page-wide reviewer tools in **one row** at every width from 1024 px up; below 1024 px the row scrolls inside itself, and the page never scrolls sideways. Copy `../assets/toolbar.html` into the page: its comment says where each of its three blocks goes. It carries the outline dropdown, one segmented bar of the render presets the caller names (such as desktop, laptop, tablet, mobile; one selection that re-renders every preview at that size at once), the theme switch and a reserved slot at the end for more tools. Supply the presets as the asset's JSON data. A preset's label is its name only; its size sits in the tooltip and the accessible name ("Laptop, 1440 px"). Add a new tool to the reserved slot, so the bar stays one row. A Copy as prompt button belongs there too when it fits the row (`feedback-contract.md` says which button carries `data-copy-prompt`). An item adds its own tools, such as state or motion controls, where it needs them.

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
