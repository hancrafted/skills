# The context window is a budget: Slide Options

Decisions to make: for the Title slide and each of the four Slides below, which Option to build. Each Option is a real-content mock of the Slide at 1920 × 1080; its Build notes name what it costs. The Option marked recommended is the design agent's proposal; the reviewer still makes the pick.

## Brief

The Brief is the context the Slides serve; it is read, not decided, on the page.

### Format

Short, about eight minutes: two Sections of two Slides each, recorded in one take.

### Audience

Developers who use a coding agent every day and have watched it forget an instruction halfway through a long session.

### Style

Editorial: developers read code-heavy Slides fast, and sober, self-explanatory ones keep their attention on the one idea.

### Learning goal

The viewer can explain why an agent forgets in a long session and decide what to put into its context and what to leave out.

### Actionables

1. Start a new session when the task changes, instead of steering an old one.
2. Move standing instructions into a file the agent reads at start, and delete them from the chat.
3. Before pasting a log or a file, cut it to the lines the task needs.

### Hook

You told the agent once, clearly, and an hour later it does the opposite. It did not ignore you. It ran out of room.

### Red thread

Every token costs attention, so the viewer's job is budgeting: what earns a place in the window, and what is waste that crowds out the instruction that mattered.

### Analogy

A household budget: rent is the system prompt, groceries are the task, and every pasted log is an impulse buy that leaves less for the rent.

### Constraints

- Every number on a Slide comes from a research file; the afternoon session is told, never measured.
- No model or product names: the Episode outlives them.

### Research questions

1. Why does a language model's recall of an instruction degrade with its position in a long context?
2. Why does starting a fresh session restore instruction following that a long session lost?

## Other context

The Visual language (`visual-language.html`) and the Episode page (`episode-page.html`) come as attached fragments. The reviewer may leave a note on the Visual language.

## Episode

### 0. Title slide and section slides {#top}

Purpose: Each Option is a set: the Title slide, which sets the Hero motif, and under it the section slide of every Section, which echoes the motif and brings in its own Section. Picking an Option picks the set.

Words:

Title slide on-screen title: "The context window is a budget". Section 1, "Why the agent forgets", voice script: **Not a bug** — Forgetting is not a bug in one agent. It is what a fixed budget does when you keep spending. Section 2, "Spend the budget on purpose", voice script: **Three cheap habits** — Once the window is a budget, three habits follow, and each one is cheap.

#### Option 0a (recommended)

The window as a budget bar: empty on the Title slide, filling up in Section 1, kept lean in Section 2. The bar every page Slide uses is the motif. Build cost: Scene.

Build notes: The record's `title` Slide: a Scene from `SlideFrame` holding the h1, the caption and the bar; the instruction block a `card-hover--raise` so Han can point at it. Each section slide a Scene over the section layout: its h2 and the bar at that Section's fill, blocks in `bg-card` on `bg-muted`, the instruction in `bg-primary`. Motion none. i18n keys `title`, `caption`, `windowLabel`.

Mock:

```html
  <div data-spec="mock" class="flex flex-col justify-between gap-12 bg-background p-12">
    <div>
      <p class="text-hero font-semibold">The context window is a budget</p>
      <p class="mt-4 max-w-2xl text-body text-muted-foreground">
        Why your agent forgets the instruction you gave it, and three cheap habits that keep it in view.
      </p>
    </div>
    <div class="flex flex-col gap-3">
      <div class="flex justify-between text-caption text-muted-foreground">
        <span>Context window</span>
        <span class="font-semibold text-foreground">200k tokens, nearly all of it still free</span>
      </div>
      <ol class="flex h-24 gap-1 rounded-xl border border-border bg-muted p-2" aria-label="An empty window">
        <li
          class="card-hover card-hover--raise flex w-1/6 items-end rounded-md bg-primary p-2 text-caption font-semibold text-primary-foreground"
        >
          Your instruction
        </li>
        <li class="flex-1 rounded-md border-2 border-dashed border-border"></li>
      </ol>
    </div>
  </div>
  <ol data-spec="echoes" class="spec-echoes">
    <li data-spec="echo" data-section="why-the-agent-forgets">
      <p>Section 1 · Why the agent forgets</p>
      <div data-spec="mock" class="flex flex-col justify-between gap-6 p-6">
        <h2 class="text-subheading font-semibold">Why the agent forgets</h2>
        <ol class="flex h-12 gap-1 rounded-lg bg-muted p-1" aria-label="A window filling up">
          <li class="w-1/12 rounded-sm bg-primary"></li>
          <li class="w-1/6 rounded-sm bg-card"></li>
          <li class="w-1/4 rounded-sm bg-card"></li>
          <li class="w-1/6 rounded-sm bg-card"></li>
          <li class="w-1/4 rounded-sm bg-card"></li>
        </ol>
      </div>
    </li>
    <li data-spec="echo" data-section="spend-the-budget-on-purpose">
      <p>Section 2 · Spend the budget on purpose</p>
      <div data-spec="mock" class="flex flex-col justify-between gap-6 p-6">
        <h2 class="text-subheading font-semibold">Spend the budget on purpose</h2>
        <ol class="flex h-12 gap-1 rounded-lg bg-muted p-1" aria-label="A window kept lean">
          <li class="w-1/12 rounded-sm bg-primary"></li>
          <li class="w-1/6 rounded-sm bg-card"></li>
          <li class="flex-1 rounded-sm border-2 border-dashed border-border"></li>
        </ol>
      </div>
    </li>
  </ol>
```

#### Option 0b

A stack of token chips: a full stack on the Title slide, nearly spent in Section 1, sorted into deliberate piles in Section 2. Build cost: Scene.

Build notes: The record's `title` Slide: a Scene, the chip stack an inline SVG with `fill-muted` chips and the instruction chip `fill-primary`. Section slides draw the same chips at their Section's state. Motion none. i18n keys `title`, `caption`, `budget`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-2 items-center gap-12 bg-background p-12">
    <div>
      <p class="text-hero font-semibold">The context window is a budget</p>
      <p class="mt-4 text-body text-muted-foreground">Every message you send is paid for in attention.</p>
    </div>
    <svg viewBox="0 0 320 320" class="h-72 w-full" aria-hidden="true">
      <rect x="80" y="250" width="160" height="28" rx="14" class="fill-primary"></rect>
      <rect x="80" y="214" width="160" height="28" rx="14" class="fill-muted stroke-border" stroke-width="2"></rect>
      <rect x="80" y="178" width="160" height="28" rx="14" class="fill-muted stroke-border" stroke-width="2"></rect>
      <rect x="80" y="142" width="160" height="28" rx="14" class="fill-muted stroke-border" stroke-width="2"></rect>
      <rect x="80" y="106" width="160" height="28" rx="14" class="fill-muted stroke-border" stroke-width="2"></rect>
      <text x="160" y="80" text-anchor="middle" class="fill-foreground text-caption">200k tokens to spend</text>
    </svg>
  </div>
  <ol data-spec="echoes" class="spec-echoes">
    <li data-spec="echo" data-section="why-the-agent-forgets">
      <p>Section 1 · Why the agent forgets</p>
      <div data-spec="mock" class="flex items-end justify-between gap-6 p-6">
        <h2 class="text-subheading font-semibold">Why the agent forgets</h2>
        <svg viewBox="0 0 120 120" class="h-24 w-24" aria-hidden="true">
          <rect x="20" y="96" width="80" height="14" rx="7" class="fill-primary"></rect>
          <rect x="20" y="78" width="80" height="14" rx="7" class="fill-muted" opacity="0.4"></rect>
        </svg>
      </div>
    </li>
    <li data-spec="echo" data-section="spend-the-budget-on-purpose">
      <p>Section 2 · Spend the budget on purpose</p>
      <div data-spec="mock" class="flex items-end justify-between gap-6 p-6">
        <h2 class="text-subheading font-semibold">Spend the budget on purpose</h2>
        <svg viewBox="0 0 120 120" class="h-24 w-24" aria-hidden="true">
          <rect x="10" y="96" width="44" height="14" rx="7" class="fill-primary"></rect>
          <rect x="66" y="96" width="44" height="14" rx="7" class="fill-muted"></rect>
          <rect x="66" y="78" width="44" height="14" rx="7" class="fill-muted"></rect>
        </svg>
      </div>
    </li>
  </ol>
```

#### Option 0c

A spotlight on the instruction: wide and faint once the window fills in Section 1, narrow and bright in Section 2. Build cost: Scene.

Build notes: The record's `title` Slide: a Scene on `bg-foreground`, the beam an inline SVG in `fill-primary` at an opacity per Section. Its dark ground departs from the Editorial Style's light pages, so the page Slides would need a matching band. Motion none. i18n keys `title`, `caption`.

Mock:

```html
  <div data-spec="mock" class="flex">
    <div
      class="relative flex flex-1 flex-col justify-end gap-6 overflow-hidden rounded-2xl bg-foreground p-12 text-background"
    >
      <svg viewBox="0 0 1200 400" class="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points="600,0 380,400 820,400" class="fill-primary" opacity="0.25"></polygon>
        <rect x="520" y="330" width="160" height="40" rx="8" class="fill-primary"></rect>
      </svg>
      <p class="relative text-hero font-semibold">The context window is a budget</p>
      <p class="relative max-w-2xl text-body">Attention is a spotlight: it covers so much, and no more.</p>
    </div>
  </div>
  <ol data-spec="echoes" class="spec-echoes">
    <li data-spec="echo" data-section="why-the-agent-forgets">
      <p>Section 1 · Why the agent forgets</p>
      <div data-spec="mock" class="flex">
        <div
          class="relative flex flex-1 flex-col justify-end overflow-hidden rounded-2xl bg-foreground p-6 text-background"
        >
          <svg viewBox="0 0 400 200" class="absolute inset-0 h-full w-full" aria-hidden="true">
            <polygon points="200,0 0,200 400,200" class="fill-primary" opacity="0.1"></polygon>
          </svg>
          <h2 class="relative text-subheading font-semibold">Why the agent forgets</h2>
        </div>
      </div>
    </li>
    <li data-spec="echo" data-section="spend-the-budget-on-purpose">
      <p>Section 2 · Spend the budget on purpose</p>
      <div data-spec="mock" class="flex">
        <div
          class="relative flex flex-1 flex-col justify-end overflow-hidden rounded-2xl bg-foreground p-6 text-background"
        >
          <svg viewBox="0 0 400 200" class="absolute inset-0 h-full w-full" aria-hidden="true">
            <polygon points="200,0 150,200 250,200" class="fill-primary" opacity="0.4"></polygon>
          </svg>
          <h2 class="relative text-subheading font-semibold">Spend the budget on purpose</h2>
        </div>
      </div>
    </li>
  </ol>
```

## Section 1: Why the agent forgets

### 1. Every token is spent attention {#every-token-is-spent-attention}

Purpose: the window fills and every message takes a share, so the Hook's instruction had less left

Words:

- Visual idea (master: basic-page, motion: none): A window drawn as a bar that fills with blocks, one per message, while the share left for the newest answer shrinks.
- Voice script: **Whole window, every turn** — A model reads its whole window on every turn. Each line you add takes a share of the attention the next answer gets. **Not seen, but how much** — So the question is never whether the agent saw your instruction. It is how much attention was left for it.
- Speaker notes: **Attention sums to one** — a softmax normalises each token's attention weights over the window, so every token added dilutes the share of the rest [1]. Source [1]: Attention Is All You Need, https://arxiv.org/abs/1706.03762. **The window has a size** — a model's context window is a fixed maximum number of tokens it can reference at once [2]. Source [2]: Context windows, https://docs.claude.com/en/docs/build-with-claude/context-windows. Target: the bar in the visual.

#### Option 1a (recommended)

One bar of message blocks, the newest in the accent: the fill alone tells the story. Build cost: Scene.

Build notes: Keeps `basic-page`, motion none. The Slide header (Eyebrow, title, caption) is the wrapper's; the Scene from `SlideFrame` draws the bar alone. Blocks in `bg-muted`, the newest in `bg-accent`, the free share as a bordered block. Hover: the blocks are `focus-group__item`s of a `focus-group--dim-others`, the percentage a `hover-reveal__detail`. Context markers (`ContextMarker`): inline after "Each message takes a share" opens the Speaker note "Attention sums to one"; beside the "Context window" label opens "The window has a size". i18n keys `title`, `caption`, `messages`, `newest`.

Mock:

```html
  <div data-spec="mock" class="flex flex-col justify-between gap-10 bg-background p-12">
    <div>
      <p class="flex justify-between text-caption uppercase text-muted-foreground">
        <span>Why the agent forgets</span><span>1 / 2</span>
      </p>
      <h3 class="mt-6 text-subheading font-semibold">Every token is spent attention</h3>
      <p class="mt-2 max-w-2xl text-body">
        The model reads the whole window on every turn. Each message takes a share (<span
          data-spec="context-marker"
          data-note="Attention sums to one"
          role="img"
          aria-label="Speaker note: Attention sums to one"
          class="inline-flex align-middle text-primary"
          ><svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
            <path
              d="M2.5 2.5h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7l-3.5 3v-3h-1a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"
              class="fill-none stroke-current"
              stroke-width="1.5"
              stroke-linejoin="round"
            ></path></svg></span
        >); the newest answer gets what is left.
      </p>
    </div>
    <div class="flex flex-col gap-3">
      <div class="flex items-end justify-between text-caption text-muted-foreground">
        <span>Turn 1</span>
        <span class="inline-flex items-center gap-1 font-semibold text-foreground"
          >Context window · 200k tokens
          <span
            data-spec="context-marker"
            data-note="The window has a size"
            role="img"
            aria-label="Speaker note: The window has a size"
            class="inline-flex align-middle text-primary"
            ><svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
              <path
                d="M2.5 2.5h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7l-3.5 3v-3h-1a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"
                class="fill-none stroke-current"
                stroke-width="1.5"
                stroke-linejoin="round"
              ></path></svg></span
        ></span>
        <span>Turn 40</span>
      </div>
      <ol
        class="focus-group focus-group--dim-others flex h-28 gap-1 rounded-xl border border-border bg-muted p-2"
        aria-label="Messages in the window"
      >
        <li
          class="focus-group__item flex w-1/6 items-end rounded-md bg-primary p-2 text-caption font-semibold text-primary-foreground"
        >
          Your instruction
        </li>
        <li class="focus-group__item w-1/12 rounded-md bg-card shadow-sm"></li>
        <li class="focus-group__item w-1/6 rounded-md bg-card shadow-sm"></li>
        <li class="focus-group__item w-1/12 rounded-md bg-card shadow-sm"></li>
        <li class="focus-group__item w-1/4 rounded-md bg-card shadow-sm"></li>
        <li class="focus-group__item w-1/12 rounded-md bg-card shadow-sm"></li>
        <li class="focus-group__item w-1/6 rounded-md bg-card shadow-sm"></li>
        <li
          class="flex w-1/12 items-end rounded-md border-2 border-dashed border-primary p-2 text-caption text-primary"
        >
          Next answer
        </li>
      </ol>
      <svg viewBox="0 0 1200 120" class="h-24 w-full" aria-hidden="true">
        <path d="M0 20 C 300 40, 600 80, 1200 108" class="fill-none stroke-primary" stroke-width="4"></path>
        <circle cx="60" cy="22" r="8" class="fill-primary"></circle>
        <circle cx="1140" cy="105" r="8" class="fill-background stroke-primary" stroke-width="4"></circle>
      </svg>
      <div class="hover-reveal flex justify-between text-caption text-muted-foreground">
        <span>Share of attention left for the instruction</span>
        <span class="font-semibold text-primary"
          >a sliver by turn 40 <span class="hover-reveal__detail">(1 message of 40)</span></span
        >
      </div>
    </div>
  </div>
```

#### Option 1b

Before and after: the instruction's share of attention at turn 1 against turn 40, as two stacks. Build cost: Master slide copy of `grid-2x2`.

Build notes: Overrules `basic-page`: copies the `grid-2x2` Master slide down to two cells. Tokens `bg-accent` and `bg-muted`; i18n keys `turnFirst`, `turnLate`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-2 gap-4 bg-card p-4">
    <div class="flex flex-col gap-2">
      <p class="text-body font-semibold">Turn 1</p>
      <div class="h-16 bg-accent"></div>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-body font-semibold">Turn 40</p>
      <div class="h-2 bg-accent"></div>
      <div class="h-16 bg-muted"></div>
    </div>
  </div>
```

### 2. The middle goes quiet first {#the-middle-goes-quiet-first}

Purpose: the afternoon session's instruction now sits in the middle, where recall drops

Words:

- Visual idea (master: three-column, motion: none): three columns: start, middle, end of the window.
- Voice script: **Start and end, not the middle** — Models recall the start and the end of a long window better than the middle. Your instruction from an hour ago now sits in the middle.
- Speaker notes: **A longer window does not help** — extended-context models show the same drop in the middle; size alone does not make it reliable [1]. Source [1]: Lost in the Middle, https://arxiv.org/abs/2307.03172.

#### Option 2a (recommended)

The library's three columns as is, the middle one faded where the instruction sits. Build cost: library entry.

Build notes: The Slide library entry `three-column` used as is, motion none. The middle column in `text-muted-foreground`; i18n keys `start`, `middle`, `end`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-3 gap-4 bg-card p-4">
    <div class="flex flex-col gap-2">
      <p class="text-body font-semibold">Start</p>
      <div class="h-16 bg-primary"></div>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-body font-semibold text-muted-foreground">Middle</p>
      <div class="h-16 bg-accent opacity-40"></div>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-body font-semibold">End</p>
      <div class="h-16 bg-primary"></div>
    </div>
  </div>
```

#### Option 2b

A U-shaped bar chart of recall by position, the instruction's bar in the accent at the low point. Build cost: Scene.

Build notes: Overrules `three-column` for `basic-page`: a Scene with five bars from the cited curve's shape, not its numbers. Tokens `bg-primary`, `bg-muted`, `bg-accent`; i18n keys `title`, `axis`.

Mock:

```html
  <div data-spec="mock" class="flex flex-col justify-between bg-card p-4">
    <p class="text-heading font-semibold">The middle goes quiet first</p>
    <div class="flex items-end gap-1 h-16">
      <div class="flex-1 h-full bg-primary"></div>
      <div class="flex-1 h-16 bg-muted"></div>
      <div class="flex-1 h-8 bg-accent"></div>
      <div class="flex-1 h-16 bg-muted"></div>
      <div class="flex-1 h-full bg-primary"></div>
    </div>
    <p class="text-caption text-muted-foreground">recall by position: start … end</p>
  </div>
```

## Section 2: Spend the budget on purpose

### 3. Start fresh when the task changes {#start-fresh-when-the-task-changes}

Purpose: a fresh session spends the whole budget on the work at hand

Words:

- Visual idea (master: basic-page, motion: none): an old window beside an empty one.
- Voice script: **Rent on the past** — A new task in an old session pays rent on everything that came before. A fresh session spends the whole budget on the work in front of you.
- Speaker notes: **The start is weighted most** — attention carries a built-in bias toward the start of the input, so a fresh session puts the new task where it counts most [1]. Source [1]: Found in the Middle, https://arxiv.org/abs/2406.16008.

#### Option 3a (recommended)

Two bars side by side, the old one full and the fresh one nearly empty: the Visual language's bar, twice. Build cost: Scene.

Build notes: Keeps `basic-page`, motion none. Reuses the bar from Option 1a as a local part; tokens `bg-muted`, `bg-accent`; i18n keys `old` and `fresh`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-2 gap-4 items-center bg-card p-4">
    <div class="flex flex-col gap-2">
      <div class="flex gap-1 h-8">
        <div class="flex-1 bg-muted"></div>
        <div class="flex-1 bg-muted"></div>
        <div class="flex-1 bg-muted"></div>
        <div class="flex-1 bg-accent"></div>
      </div>
      <p class="text-caption text-muted-foreground">old session</p>
    </div>
    <div class="flex flex-col gap-2">
      <div class="flex gap-1 h-8">
        <div class="w-1/3 bg-accent"></div>
        <div class="flex-1 border"></div>
      </div>
      <p class="text-caption text-muted-foreground">fresh session</p>
    </div>
  </div>
```

#### Option 3b

A decision rule instead of a picture: when the task changes, the session does too. Build cost: Scene.

Build notes: Keeps `basic-page`, motion none. Two rows, each a block and a label; tokens `bg-muted`, `bg-accent`; i18n keys `title`, `ifTask`, `thenSession`.

Mock:

```html
  <div data-spec="mock" class="flex flex-col gap-2 bg-card p-4">
    <p class="text-heading font-semibold">Start fresh</p>
    <div class="flex gap-2 items-center">
      <div class="w-1/2 h-8 bg-muted"></div>
      <p class="text-body font-semibold">→ new task?</p>
    </div>
    <div class="flex gap-2 items-center">
      <div class="w-1/3 h-8 bg-accent"></div>
      <p class="text-body font-semibold">→ new session</p>
    </div>
  </div>
```

#### Option 3c

Three sessions as three windows, one per task, the third still empty. Build cost: Master slide copy of `grid-2x2`.

Build notes: Overrules `basic-page`: a three-cell copy of the `grid-2x2` Master slide. Tokens `bg-muted`; i18n keys `taskOne`, `taskTwo`, `taskThree`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-3 gap-2 bg-card p-4">
    <div class="h-full bg-muted"></div>
    <div class="h-full bg-muted"></div>
    <div class="h-full border"></div>
  </div>
```

### 4. Cut what you paste {#cut-what-you-paste}

Purpose: the afternoon ends with ten lines pasted instead of a full log

Words:

- Visual idea (master: basic-page, motion: none): a long log cut down to its ten lines.
- Voice script: **Impulse buy** — A full log is an impulse buy. Paste the ten lines that matter, and keep standing instructions in a file the agent reads at start.
- Speaker notes: **Why the file works** — text read at the start of a session sits where recall is strongest, so standing instructions there survive a long session [1]. Source [1]: Lost in the Middle, https://arxiv.org/abs/2307.03172.
- Production note: The counter overlay from the Brief's open ideas would sit on this Slide if it is built.

#### Option 4a (recommended)

The log beside its kept lines, the kept lines in the accent on both sides. Build cost: Scene.

Build notes: Keeps `basic-page`, motion none. Two columns of line stubs; kept lines in `bg-accent`, the rest in `bg-muted`. i18n keys `log` and `kept`.

Mock:

```html
  <div data-spec="mock" class="grid grid-cols-2 gap-4 items-center bg-card p-4">
    <div class="flex flex-col gap-1">
      <div class="h-2 w-full bg-muted"></div>
      <div class="h-2 w-3/4 bg-muted"></div>
      <div class="h-2 w-full bg-accent"></div>
      <div class="h-2 w-1/2 bg-muted"></div>
      <div class="h-2 w-full bg-muted"></div>
      <div class="h-2 w-3/4 bg-accent"></div>
      <div class="h-2 w-full bg-muted"></div>
    </div>
    <div class="flex flex-col gap-1">
      <div class="h-2 w-full bg-accent"></div>
      <div class="h-2 w-3/4 bg-accent"></div>
    </div>
  </div>
```

#### Option 4b

Back to the budget bar: the cut log hands its share back to the task. Build cost: Scene.

Build notes: Keeps `basic-page`, motion none. The bar part from Option 1a with three labelled shares; tokens `bg-muted`, `bg-accent`; i18n keys `system`, `log`, `task`.

Mock:

```html
  <div data-spec="mock" class="flex flex-col justify-between bg-card p-4">
    <p class="text-heading font-semibold">Cut what you paste</p>
    <div class="flex gap-1 h-8">
      <div class="w-1/3 bg-muted"></div>
      <div class="w-1/2 bg-muted opacity-40"></div>
      <div class="flex-1 bg-accent"></div>
    </div>
    <p class="text-caption text-muted-foreground">system · log (cut) · task</p>
  </div>
```

