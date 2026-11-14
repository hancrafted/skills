# Decisions on the Worth-exploring candidates

The agent's decision on each of the ten Worth-exploring candidates from the two architecture reviews, after reading the code on `feat/ecology-eval` (after PR #551). Items run most consequential first. Each Option's second line is what changes; a recommended Option carries its reason.

## 1. Should the tour and the headless judge get every beat’s steps from one `beatsOf` plan?

- **Id:** `beat-plan`
- **Decision:** Yes: a pure `beatsOf(preset, t0k)` in `factory-beats.pure.ts` gives each beat its settings, sample start, end step and keys; the tour and the judge both read it.
- **What changes:** Nothing on screen or in `ecology:sim` output. A future change to how a beat is sampled is made once, not twice.
- **Door:** two-way. **Effort:** medium (half a session).
- **Rung:** diagram, enough because the decision is where one computation lives.

### Evidence

- **Evidence:** `aimAtStep` (`factory-tour.pure.ts:44`) computes a beat’s end as `t0k + stepsTo(st.run)` and its sample start from the beat before.
- **Evidence:** `playSteps` (`factory-scenario.pure.ts:51`) and `readBeats` (`:112`) compute the same end and sample window for the judge.
- **Evidence:** design-ADR 0024 §10/§12 requires the tour on the page and the headless judge to read the same steps; today only the tour-equals-headless test enforces it.
- **Agent proposal:** One plan makes that agreement structural; the test stays as the guard.

### Before

```text
factory-tour.pure.ts
  aimAtStep()  → end, sample start, keys
factory-scenario.pure.ts
  playSteps()  → end
  readBeats()  → sample window, keys
        ↑ two derivations, one test keeps them equal
```

### After

```text
factory-beats.pure.ts
  beatsOf(p, t0k) → [{ set, from, end, keys }]
        ↓                    ↓
factory-tour.pure.ts   factory-scenario.pure.ts
  aimAtStep(beat)        playSteps / readBeats(beat)
```

### Detail

Files: `factory-tour.pure.ts`, `factory-scenario.pure.ts`, new `factory-beats.pure.ts` with a sibling test (ARCH-003-sibling-tests). Characterisation pins and expect ranges stay unchanged; `ecology:sim --seeds 10` must pass both scenarios after the commit.

### Options

- **One `beatsOf` plan** (`one-plan`, recommended): Both callers read one plan; the derivation lives in one module.
  - **Why recommended:** It is the only candidate the review called top pick, and it turns an ADR rule into structure.
- **Keep two derivations** (`keep-two`): No change; the tour-equals-headless test keeps guarding the agreement.

## 2. Where should a tour’s aim (its stop step and Sampler) live?

- **Id:** `tour-state`
- **Decision:** Keep it on `FactoryRun`, against the review’s proposal: the run is the only place that can stop mid-frame, and the tour already has its own module.
- **What changes:** Nothing. `FactoryRun` keeps `aim`, `stopAt`, `arrived`, `sampled` and `sampledMean`.
- **Door:** two-way. **Effort:** none (option A) or large (B, C).
- **Rung:** diagram, enough because the decision is which module owns a piece of state.

### Evidence

- **Evidence:** The frame loop (`use-factory.ts:141`) calls `run.advance(dt, speed)` and knows nothing about tours; `stepDue` (`factory-run.pure.ts:191`) caps each frame’s steps at `stopAt`.
- **Evidence:** Only `factory-tour.pure.ts` and `use-tour.ts:98` call `run.aim`; the page reads tour progress from the pure `Tour` value, not from the run.
- **Evidence:** The review’s smell (tour state on `FactoryRun`) was found before the Sampler refactor (PR #551) took `got` and the cursor off it.
- **Agent proposal:** Moving the aim out (B or C) would make the frame loop carry tour state, which spreads it rather than concentrating it.

### Before

```text
use-factory frame loop ──advance(dt, speed)──▶ FactoryRun
                                              aim ◀── factory-tour
                                              (stop step, Sampler)
```

### After

```text
A (unchanged):  same as before
B: frame loop ─▶ Tour ─▶ FactoryRun   # frame loop must know the Tour
C: frame loop ─advance(dt, speed, aim)─▶ FactoryRun
   # aim held in a React ref in use-factory
```

### Detail

“Stop at step k and sample on the way” is a run-level primitive: honouring it inside the frame’s step budget needs the run’s step loop. Revisit if a second, non-tour client ever needs to stop the run.

### Options

- **A. Keep the aim on `FactoryRun`** (`keep`, recommended): No change.
  - **Why recommended:** The stop has to be honoured inside the run’s per-frame step loop, and the tour already lives in `factory-tour.pure.ts`.
- **B. A Tour module wraps `FactoryRun`** (`wrap`): `FactoryRun` loses five members; the frame loop drives the Tour instead of the run while a tour plays.
- **C. The caller passes the aim to `advance`** (`arg`): `FactoryRun` holds no tour state; `use-factory.ts` keeps the aim in a ref.

## 3. Should the judge and `FactoryRun` share one start routine (`startOf`)?

- **Id:** `start-routine`
- **Decision:** No new module: pin the two starts together with one equivalence test, and drop the redundant `startSettings` argument in `backTour`.
- **What changes:** One new test; one argument removed. The start sequence stays written in two places, now guarded.
- **Door:** two-way. **Effort:** small.
- **Rung:** diagram, enough because the decision is about duplication of five lines.

### Evidence

- **Evidence:** `scenarioStart` (`factory-scenario.pure.ts:42`) is five lines: create, return if clear, warm `WARM_WEEKS`, pile the start backlog.
- **Evidence:** `FactoryRun` (`factory-run.pure.ts:72–84`) does the same in chunks, because the page warms up over several frames.
- **Evidence:** `backTour` (`factory-tour.pure.ts:113`) passes `s: startSettings(B, p)`, which `FactoryRun` already defaults to.
- **Agent proposal:** Deletion test: removing a `startOf` would put back five lines in two callers. That is a shallow module; a test buys the same safety.

### Before

```text
scenarioStart: create → warm(WARM_WEEKS) → pile
FactoryRun:    create → warmChunk()… → loaded() → pile
               # nothing checks they agree
```

### After

```text
A: same two starts
   + test: new FactoryRun({ now: true }) ≡ scenarioStart()  # same weeks, same floor
B: startOf() → { f, warmSteps, load() }  ← both callers
```

### Detail

The test compares the model state (weeks and a reading hash) after both starts, for a loaded and a clear preset, on two seeds.

### Options

- **A. Equivalence test, no module** (`test`, recommended): One test pins the two starts together; `backTour` loses a redundant argument.
  - **Why recommended:** The duplication is five lines; a module would be shallow, and the test catches the drift that matters.
- **B. A `startOf` module** (`start-of`): Both starts call one routine returning `{ f, warmSteps, load() }`.
- **C. Leave it** (`leave`): No change.

## 4. Should one `enterState` drive preset, tour, reset and use-case changes?

- **Id:** `state-entry`
- **Decision:** No pure `enterState`: the four handlers already run in one order and each ends in a different act. Name the shared pair as one `enter(bundle, id)` inside `useHandlers`.
- **What changes:** Each handler loses two repeated lines. `Parts` and the hooks stay as they are.
- **Door:** two-way. **Effort:** small.
- **Rung:** diagram, enough because the decision is about code shape, not behaviour.

### Evidence

- **Evidence:** `onPreset`, `onTour`, `onReset` and `onUseCase` (`software-ecology.client.tsx:168–186`, `reset-state.ts:37`) each run: dismiss → `show(viewOf(B, id))` → `apply(B, id)` → their own act.
- **Evidence:** Their own acts differ: `setPreset`, `tour.start`, `controls.reset(defaults)`, `setUseCase`.
- **Unknown:** Whether file load (`loadInto`, `use-exchange-wiring.ts:58`) runs the same order was not checked line by line.
- **Agent proposal:** A pure `enterState` returning view, compare, display and settings would be a second description of what the handlers already say in four lines.

### Before

```text
onPreset:  dismiss; show(view); apply(cmp); setPreset
onTour:    dismiss; show(view); apply(cmp); tour.start
onReset:   dismiss; show(view); apply(cmp); controls.reset
onUseCase: dismiss;             apply(cmp); setUseCase
```

### After

```text
A: enter(B, id) = show(view) + apply(cmp)
   onPreset: dismiss; enter; setPreset   # …same for tour, reset
B: enterState(B, id) → { view, compare, display, settings }
   useEnterState().go(intent)            # Parts split into slices
```

### Detail

Option B’s gain (one order) already holds today; its cost is a new pure module and a hook, plus splitting `Parts`. FE-001 transient state and FE-012 §4.1 (the parent owns state) hold either way.

### Options

- **A. One small `enter` helper** (`helper`, recommended): Two repeated lines become one call; nothing else moves.
  - **Why recommended:** The order is already consistent; a pure module would describe the same four lines twice.
- **B. Pure `enterState` and a `useEnterState` hook** (`enter-state`): Callers pass an intent; `Parts` shrinks to named slices.
- **C. Leave it** (`leave`): No change.

## 5. Should the Slide stills come from one `stillOf(useCase, state, locale)` inside the Explorable?

- **Id:** `stills`
- **Decision:** Yes: `stills.pure.ts` in the Explorable returns `FactoryStillState`; the Slide imports only that. The hero preview’s geometry stays until a second reader needs it.
- **What changes:** A painter or layout change can no longer break the Why · How · What Slide without a failing Explorable test.
- **Door:** two-way. **Effort:** medium.
- **Rung:** diagram, enough because the decision is where a seam sits.

### Evidence

- **Evidence:** `slides/why-how-what/factory-still-state.ts` has 13 import lines, most into painter, layout and stage internals of the Explorable.
- **Evidence:** The review found it re-implements the painter’s document merging and rack slots (not re-checked line by line).
- **Evidence:** FE-007-explorable-pages allows Slides to import from `src/explorables`; FE-012-explorables §3 keeps routes and Episode metadata out of the Explorable, which `stillOf` does not touch.

### Before

```text
Slide factory-still-state.ts
  ├─▶ paint-station.ts
  ├─▶ paint-belts.ts
  ├─▶ stage-parts.pure.ts
  └─▶ …10 more internals
```

### After

```text
Slide factory-still-state.ts
  └─▶ stills.pure.ts  stillOf(useCase, state, locale)
        ├─▶ painter, layout, stage   # internals stay internal
```

### Detail

`factory-still-state.test.ts` moves next to `stills.pure.ts`; `software-ecology.test.ts` stays. Hero preview (`slides/hero/factory-preview.tsx`) keeps its own card and slot geometry.

### Options

- **A. `stillOf`, hero preview later** (`still-of`, recommended): The Slide reads one interface; the hero preview is untouched.
  - **Why recommended:** It closes the silent-break path now; the hero geometry has no second reader yet, so sharing it would be speculative.
- **B. `stillOf` plus the hero geometry** (`with-hero`): The hero preview also reads its geometry from the Explorable.
- **C. Leave it** (`leave`): The Slide keeps its 13 imports.

## 6. Should the page’s use-case loader and the CLI’s file loader satisfy one `UseCaseTexts` shape?

- **Id:** `use-case-texts`
- **Decision:** Yes: one shape, with the static-import adapter in `use-case-data.ts` and the file-read adapter in the CLI; the file suffixes are named once.
- **What changes:** A new words file for a use case is added in one place, not two.
- **Door:** two-way. **Effort:** small.
- **Rung:** diagram, enough because the decision is a seam with two adapters.

### Evidence

- **Evidence:** `use-case-data.ts:21` names each use case’s data, `en` and `de` files in `SOURCES`.
- **Evidence:** `loadUseCase` (`ecology-sim.node.ts:50`) builds the same file names itself and reads them from disk.
- **Agent proposal:** Two adapters behind one shape is a real seam, per the codebase-design rule “two adapters means a real one”.

### Before

```text
use-case-data.ts   SOURCES { data, en, de }   (import)
ecology-sim.node.ts loadUseCase()  `${id}.yml`, `${id}.words.yml`…  (fs)
```

### After

```text
UseCaseTexts { data, en, de }
  ├─ use-case-data.ts      static import adapter
  └─ ecology-sim.node.ts   fs adapter   # suffixes from one table
```

### Detail

FE-007 §2.8 (the node entry) is unchanged: the CLI keeps its own `.node.ts` file.

### Options

- **A. One `UseCaseTexts` shape** (`shape`, recommended): Both loaders fill one shape from one suffix table.
  - **Why recommended:** Two real adapters; today they can drift apart.
- **B. Leave it** (`leave`): The CLI keeps its own file naming.

## 7. Should `ecology:sim` read scenario names and claims through the page’s words module?

- **Id:** `sim-words`
- **Decision:** Yes: `simulate` builds one `WordsIn { B, locale: "en", catalog }` and calls `presetName` and `scenarioWords`.
- **What changes:** The CLI prints exactly the names and claims the page shows, catalog fallbacks included.
- **Door:** two-way. **Effort:** small.
- **Rung:** diagram, enough because the decision is which lookup the CLI uses.

### Evidence

- **Evidence:** `ecology-sim.node.ts:94` reads `roles.words.yml` itself and indexes `words.en.scenarios[id].claims` directly.
- **Evidence:** The page goes through `presetName` and `scenarioWords` (`use-case-words.pure.ts`), which apply the catalog fallback.

### Before

```text
page: presetName(), scenarioWords()  → fallback to catalog
CLI:  words.en.scenarios[id].claims  → no fallback
```

### After

```text
page ─┐
      ├─▶ presetName(), scenarioWords()
CLI  ─┘    # one lookup, one fallback
```

### Detail

Builds on the `UseCaseTexts` item: the CLI gets its words from the same shape. A new case in `ecology-sim.node.test.ts` covers the fallback.

### Options

- **A. Through the words module** (`words`, recommended): One lookup for page and CLI.
  - **Why recommended:** A fallback added for the page then shows in the CLI with no extra work.
- **B. Leave it** (`leave`): The CLI keeps its direct lookup.

## 8. Should the Settings builders move out of `factory-dials.pure.ts`?

- **Id:** `settings-split`
- **Decision:** Yes: `idealSettings`, `realisticSettings`, `presetSettings`, `startSettings` and `custOf` move to `start-settings.pure.ts`.
- **What changes:** Import lines change in the files that build a start; nothing else.
- **Door:** two-way. **Effort:** small (import churn).
- **Rung:** diagram, enough because the decision is which module a group of functions belongs to.

### Evidence

- **Evidence:** `factory-dials.pure.ts` is 244 lines (cap 250) and holds tunables, dial lookup (`dials`, `catches`, `pressureOf`) and the builders (`:167–244`).
- **Agent proposal:** The builders change when a preset or start changes; the dials change when the model does. Two reasons, two modules.

### Before

```text
factory-dials.pure.ts (244)
  tunables · dial lookup · Settings builders
```

### After

```text
factory-dials.pure.ts (~170)   tunables · dial lookup
start-settings.pure.ts (~80)   ideal / realistic / preset / start, custOf
```

### Detail

The new file joins the MODEL and INTERNAL lists in `factory-model-seam.test.ts`; its sibling test takes the builder cases from `factory-dials.pure.test.ts`.

### Options

- **A. Move the builders** (`split`, recommended): One new module; dials shrink by a third.
  - **Why recommended:** It separates two reasons to change and frees the file from the lint cap.
- **B. Leave it** (`leave`): Six lines from the cap.

## 9. Should the flow-cell indexing move out of `factory-traffic.pure.ts` into `flow-cells.pure.ts`?

- **Id:** `flow-cells`
- **Decision:** Yes: `Cell`, `fi`, `cells` and `KIND_CELLS` move; the flow equations stay.
- **What changes:** Import lines change; traffic drops well under the cap.
- **Door:** two-way. **Effort:** small.
- **Rung:** diagram, enough because the decision is a file split.

### Evidence

- **Evidence:** `factory-traffic.pure.ts` is 249 of 250 lines.
- **Agent proposal:** The indexing has its own vocabulary (cells, the defect-kind bit) and can be tested alone; the two lines freed by the Ctx trim would be gone with the next change.

### Before

```text
factory-traffic.pure.ts (249)
  Cell, fi, cells, KIND_CELLS · Ctx · flow equations
```

### After

```text
flow-cells.pure.ts    Cell, fi, cells, KIND_CELLS
factory-traffic.pure.ts   Ctx · flow equations
```

### Detail

Joins the model seam test’s lists; a sibling test covers the indexing.

### Options

- **A. Move the indexing** (`split`, recommended): One new module, traffic well under the cap.
  - **Why recommended:** A separate idea with its own tests; the cap no longer blocks the next change.
- **B. Leave it** (`leave`): Traffic stays at the cap.

## 10. How far should the traffic context `Ctx` be trimmed?

- **Id:** `ctx-trim`
- **Decision:** Delete only the two dead fields, `rework` and `consts.inspect`; keep the precomputed `consts`.
- **What changes:** Two fields and their setup lines go. Speed and output stay the same.
- **Door:** two-way. **Effort:** tiny.
- **Rung:** diagram, enough because the decision is two fields.

### Evidence

- **Evidence:** `Ctx` (`factory-traffic.pure.ts:47–67`): no non-test code reads `ctx.rework` or `consts.inspect` (grep, this session).
- **Evidence:** The solve runs up to 800 passes; the precomputed `consts` avoid a lookup in that loop.
- **Unknown:** How much speed reading `constOf` in the loop would cost: not measured.

### Before

```text
Ctx { …, rework, consts: { inspect, redo, keepExtra, maxBounces } }
```

### After

```text
A: Ctx { …, consts: { redo, keepExtra, maxBounces } }
B: Ctx { … }   + constOf(ctx.s, …) in the hot loop
```

### Detail

Option B would need a benchmark of the solve before and after; not worth it for one fewer field group.

### Options

- **A. Dead fields only** (`dead`, recommended): Two fields go; nothing else changes.
  - **Why recommended:** Free and safe; option B needs a benchmark for little gain.
- **B. Also drop the precomputed `consts`** (`all`): One way to read constants, at an unmeasured speed cost.
