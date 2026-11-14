# Evals

The eval harness runs frozen cases headless, once per arm, grades each run and shows the results in skill-creator's viewer. Run `npm` commands from the repository root; run `node evals/...` commands from the skill folder.

## Open item

Re-run both cases against the references; paid runs need Han's go-ahead.

## Local validation

`npm test` runs pure judges and runner logic. `npm run test:slow` runs the offline browser grader, eval view capture and frozen-case checks. `npm run decision-html:prove` proves every valid and single-defect fixture using Chromium. These three lanes call no model and need no provider credentials; they write temporary browser artifacts outside the skill tree and clean them up.

The commands below generate or model-grade runs and require Han's approval. `EVAL_JUDGE=off` disables model grading, not agent generation.

## Run

First prove the grader: `npm run decision-html:prove` from the repository root grades every fixture and fails when one does not prove its check. Run it before each iteration and after any grader change; this browser lane stays out of `npm run verify`.

```sh
node evals/run.ts --case architecture-round --runs 1
```

`--case` (repeatable; default every case in the manifest), `--arm` (repeatable; default `with_skill` and `without_skill`), `--runs` (default 1), `--model`, `--parallel` (default 2) and `--timeout-minutes` (default 30) are optional. Each run is a full agent session that spends real tokens, about $3 to $6 and 15 to 25 minutes, so run the smallest set that answers the question: one case at `--runs 1` to try a change, the benchmark only to compare versions.

The benchmark is both cases × both arms at k = 3, 12 sessions:

```sh
node evals/run.ts --runs 3 --parallel 4
```

The command prints the path of `review.html`.

It needs the `claude` CLI logged in, the repo's Playwright Chromium, Python 3.10 or newer (`EVAL_PYTHON` names one), and the skill-creator plugin (`SKILL_CREATOR_DIR` overrides where it is found). Grading also calls a model for the judge and the probe; see [Quality](#quality).

To regrade saved runs after a grader changed, without rerunning any agent:

```sh
node evals/regrade.ts evals/workspace/iteration-N        # every run, then a fresh benchmark and viewer
node evals/regrade.ts evals/workspace/iteration-N/eval-architecture-round/with_skill/run-1   # one run; prints its grading.json
```

## Fidelity sweep

The sweep asks whether the skill honours the fidelity rung it is asked for, and how the rung moves quality. It runs `architecture-round` with the skill only, once per rung (`diagram`, `wireframe`, `mock`, `prototype`) × k. Each variant's calibration is the frozen one with only its Fidelity rung rewritten (`runner/calibration.pure.ts`). The sweep stays out of the benchmark.

```sh
node evals/sweep.ts --runs 3          # 12 sessions; --rung (repeatable) narrows the rungs, --runs 1 tries a change
node evals/sweep.ts --regrade evals/workspace/sweep-N   # grade and report saved runs again
```

`--model`, `--parallel` (default 4) and `--timeout-minutes` work as in `run.ts`. It writes `evals/workspace/sweep-N/eval-architecture-round-<rung>/with_skill/run-k/`, laid out like an iteration, then `sweep.md` and `sweep.json` with one row per rung:

- **Rung honoured:** runs whose page passed `mechanical fidelity-match`, every item built at the rung asked.
- **Judge** and **Probe:** `judge` and `probe` items passed out of items graded, summed over the rung's runs.

## What a run sees

Each run gets a fresh temp folder holding `prompt.md`, its attachments and `calibration.md`; a skill arm also gets a copy of its skill in `skill/`, without `evals/`. `claude -p` starts there in safe mode, with no slash commands or MCP servers, so no CLAUDE.md, installed skill or plugin reaches it. The invocation text (`runner/invocation.pure.ts`) is identical across arms except one line that names `skill/SKILL.md`.

## Layout

The workspace `evals/workspace/` is gitignored. The `eval-` prefix is how skill-creator's aggregation finds a case.

```text
iteration-N/
  benchmark.json  benchmark.md  review.html
  eval-<case>/
    eval_metadata.json
    <arm>/run-<k>/
      run.json            case, mode, arm, model, sandbox paths, skill digest
      eval_metadata.json  the viewer reads the prompt here
      transcript.jsonl    the stream-json transcript
      tools.json          every tool call, subagents included
      timing.json         duration, tokens, cost
      grading.json        skill-creator's grading shape, plus `judge`: the models that judged and read the page
      quality.json        the judge's and the reader's raw answers, models and cost
      pages/              the .html pages the agent wrote
      outputs/            what the viewer shows: the three screenshots the judge saw
```

## Grading

`runner/grade-run.ts` reads only the run folder and its case's `checklist.json` and `probe.json`, and writes `grading.json`. Each grader contributes expectations, concatenated in `expectationsOf`:

- **Mechanical:** one expectation per check in `scripts/checks/`, run on the largest page in `pages/`. Checks for another mode than the case's are left out, so both arms face the same checks; a check skipped although it applies means the page declared the wrong mode, and fails. With no page, every check fails. `fidelity-match` needs the rung the calibration asked: it applies only when the Fidelity line reads `` `<rung>` for every item ``, recorded in `run.json` `asked`.
- **Isolation:** isolation is about what context reaches the run. Reads may reach only the workspace and system and tool paths (`/usr`, `/bin`, `/sbin`, `/System`, `/Applications`, `/opt/homebrew`, Playwright's browser cache); writes only the workspace and the system temp folder (`/tmp` and the sandbox's parent). In the temp folder a run may read back only what it wrote there, or what a script it wrote names; it may also read the tool output the CLI spills into the run's own folder under `~/.claude/projects/`. Anything else fails: the home folder, `~/.npm`, another repository, another sandbox. File tools are read by their path fields. Shell commands are read by token, following `cd`, and a token counts as a path only from a real root folder, so markup such as `</script>` does not. Whether a token is read or written is a heuristic over the program and redirections, so each problem names its token for a person to judge.
- **Judge**, **probe** and **vs-reference:** see [Quality](#quality).

Pages stay out of `outputs/`: the viewer embeds text files inside a `<script>`, which a page's own `</script>` would break. Instead `review.html` links each run to its pages above its screenshots.

## Quality

Three model graders read the page the way a person does, in the ArtifactsBench style. `runner/views.ts` loads it offline at 1440 × 900 and saves three screenshots (on load, after picking the recommended Option in the first item with choices, and with every depth toggle and disclosure open) plus the visible text. A view the page cannot give, such as a pick on an explain page, is left out and noted. Each model works in a folder holding only those files. The reference grader applies only to a case with a reference page.

- **Checklist judge:** answers the confidence bar for the case's mode (`judge/confidence-bar.json`), then the case's `checklist.json`, each item `yes`, `no` or `unknown`. Only `yes` passes. Prompt: `judge/judge.md`.
- **Reader probe:** answers the case's `probe.json` questions from the page alone, choosing lettered choices or `unknown`, and passes only on exactly the keyed set. The key never reaches the reader. Prompt: `judge/probe.md`.

- **Reference grader:** compares the run's page with the case's frozen reference page, which a person judged good, so a skill change is measured against a page known to work. Prompt: `judge/pairwise.md`. See [Reference grader](#reference-grader).

Each answer carries a verbatim quote as evidence; a quote the page text lacks is flagged, since it came from a screenshot or was invented. A failed model call fails its items and is noted for review.

The judge's family should differ from the executor's (Claude) to avoid self-preference, so a `gemini` CLI on `PATH` is used when present. Otherwise Claude judges, and every `grading.json` lists the self-preference risk under `user_notes_summary.uncertainties`. `EVAL_JUDGE` overrides the choice (`auto`, `gemini`, `claude` or `off`, which grades mechanically only and spends nothing) and `EVAL_JUDGE_MODEL` names a model. The Gemini path follows the CLI's documented `-p` and `--output-format json` flags with `@file` attachments.

Model grading spends tokens for checklist, probe and reference comparisons.

### Reference grader

`runner/reference.ts` renders the reference's three views once per grading pass (`views.ts`, in a temp folder removed when the pass ends) and every run of that case reuses them. The judge sees the run's views and the reference's, labelled `Page 1` and `Page 2`, and answers `1`, `2` or `same` for each item: every item of the case's `checklist.json`, plus `overall` ("Which page lets the reader decide faster and with more confidence?"). Each answer carries a critique before the verdict and a verbatim quote after it. The confidence bar stays with the checklist judge.

The judge is called twice, once with the run first and once with the reference first, to cancel a leaning towards the first page. Each item becomes one expectation, `vs-reference <id>`, and passes when the run is not worse than the reference in both orders: `same` or the run's page, twice. A failed call, an `unknown` or a missing answer fails the item. `quality.json` `reference` holds both orders' raw replies, models and cost, and `grading.json` `judge.referenceModel` names the model. Model choice, `EVAL_JUDGE=off` (skips it) and the self-preference note work as for the checklist judge. A reference that cannot render fails its items.

To check the grader, regrade a saved run of the reference itself (copy `reference.html` into a run folder's `pages/`): every `vs-reference` item must pass.

To freeze a reference for a case:

1. Pick a page a person judged good, built from the case's own inputs.
2. Save it beside the case, for example `cases/<case>/reference.html`.
3. Add `"reference": "<case>/reference.html"` to the case in `cases/manifest.json`, and its sha256 to `hashes` under the same path.
4. Note in `source.reference` where the page came from and who judged it.

A run never sees the reference. A case with a reference needs a `checklist.json`, since its items are what the judge compares.

## Benchmark

skill-creator's aggregation computes pass rate, time and tokens per arm, across all cases, from `grading.json` and `timing.json`. `runner/consistency.pure.ts` then adds what it lacks for repeated runs:

- **Per case and arm:** the pass rate as mean ± stddev, one line each in `benchmark.json` `notes`, which the viewer lists under Analysis Notes.
- **Per assertion:** pass^3, the chance that 3 fresh runs all pass it, estimated as C(passed, 3) / C(runs, 3). With exactly 3 runs it is 1 when every run passed and 0 otherwise; with fewer it stays open. It sits in `benchmark.json` `consistency` and in the table at the end of `benchmark.md`.

- **Per reference:** for each case with a reference, the `vs-reference` items passed out of items graded, per arm and summed over runs, one line each in `benchmark.json` `notes`.

A run that lacks an assertion, for example because its judge failed, counts as failing it.

## Cases

| Case                 | Mode     | Input                                                                                                            |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `architecture-round` | `decide` | Ten code-level decisions from an architecture round, for a reader who judges principles, benefit and cost.       |
| `episode-spec`       | `decide` | An Episode's Title slide and four Slides with their mock Options, for a reviewer who picks one Option per Slide. |

`cases/manifest.json` lists each case's prompt, attachments, mode, calibration answers, `checklist` and `probe`, its provenance, and the sha256 of every frozen file. A run refuses a case whose hashes no longer match, and `runner/cases.slow.test.ts` checks those files in the slow lane. A run sees the prompt, attachments and calibration answers, never the checklist or probe.

A case's `checklist.json` holds 3 to 12 `items`, one per rule the person set, each `{ "id", "question", "source" }`, where the question is answerable yes or no from the page. Its `probe.json` holds `questions`, each `{ "id", "question", "choices": { "a": "…" }, "answer": ["a"], "source" }`; `unknown` is offered on every question, so no choice takes that id. A `source` is `{ "file", "quote" }`: a verbatim quote from the prompt, an attachment or the calibration answers, because a key comes from what the run itself sees and never from a generated page. A checklist item may instead cite a rule a person set, `{ "session", "round", "quote" }`, with the quote held in the case's provenance-only `rounds.md`; `episode-spec` does this because its calibration states none of the page's rules. `runner/cases.slow.test.ts` checks every key's source and choices.

A case may name a `reference`: a page a person judged good, frozen beside the case, hashed with its other files and never shown to a run (`referenceOf` in `runner/cases.ts` reads it). Both references are Han-approved, byte-exact baselines. Their source provenance lives in the manifest. A baseline's approval does not imply that every mechanical check passes it.

To change a case, freeze a new one. Append it to the manifest: a case's eval id is its position there, and earlier iterations keep theirs. A case without a mode and `calibration.md` cannot run headless.
