# Setup

Run once per project, and again whenever a skill was installed or removed: `node scripts/drive.ts setup` from this skill's folder, at the project's root (`--agent-type <type>` and `--tier mid|top` seed a new Binding only; `--approve-learnings` approves the learnings step below). It is idempotent and prints each file it wrote, or that `docs/drive/` is up to date.

## What it writes

| File            | Setup's part                                                                                                                                                                            | The Operator's part                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `binding.yml`   | seeds each phase with the installed skills it recognises, a model tier per phase and the agent type; later adds new skills                                                              | every edit; `seen` keeps a removed skill from coming back        |
| `project.yml`   | seeds the base branch, the install command a lockfile implies, the parallel defaults, the `models` tier mapping and the `decisionDocs` globs it finds; later adds only missing sections | every value; preflight, lock and hooks are the Operator's to add |
| `enforcers.yml` | rewrites it each run from the project's manifests, hook folders and checkers                                                                                                            | none: change the repo, then rerun setup                          |
| `profiles.md`   | the empty headings                                                                                                                                                                      | the project's rules per Profile                                  |
| `README.md`     | the home's contract, with the version record `generated: {by: drive@<version>, at}`; later only that record, after the learnings step                                                   | the body, if the project wants more                              |
| `review.md`     | an empty template when missing, never rewritten                                                                                                                                         | the calibration answers every decision page uses                 |

Skills are found in the skills lockfile and in the project's skill folders, authored ones first.

## The learnings step

drive depends on `/learnings`. Setup never creates a store: `/learnings` and Fortify write `docs/learnings/drive/`. One approved step does three things together: it installs `/learnings` when it is missing (`npx skills add hancrafted/skills --skill learnings`), moves an old `docs/drive/learnings/` to `docs/learnings/drive/` with `git mv` (history kept; it stops if the target exists), and records `drive@<version>` in `docs/drive/README.md`. Without `--approve-learnings`, setup changes none of these and prints the step as pending; show it to the Operator, and on a yes rerun `drive setup --approve-learnings`. A repo with `/learnings` installed and no old store has nothing to approve: setup only writes or updates the README's version record. Commit the move yourself.

## The checks setup wires

`mh check --root docs/learnings/drive --config <skill>/markdown-harness.config.yaml` and `learnings check` go into the project's docs check only once `/learnings` is installed (setup installs it first, or prints the install command), so a record or failure-mode file that breaks the format fails the docs lane. Two async hooks, `SubagentStart` and `SubagentStop`, in `.claude/settings.json` run the skill's Claude adapter, which writes each Subagent's session and transcript path into `.scratch/<topic>/drive.log.jsonl` for `drive transcript`. `drive setup --check` writes nothing and reports Binding entries whose skill is not installed; it runs inside `npm run preflight`, so a renamed skill fails there. When the skill sits outside the repo, setup prints the line to add by hand instead of editing the file.

## The decision-doc guard

`drive guard [--against <ref>]` fails when a change touches a path listed in `decisionDocs` and the branch does not start with `decisions/<topic>` (which covers its Task branches `decisions/<topic>--…`), naming the file and the rule. Without `--against` it checks the staged changes, so it runs at commit time; with it, `HEAD` against its merge-base with `<ref>`, for CI. Setup wires it into the pre-commit hook, or into CI when the project has no hooks; check after setup that it runs. A Subagent that needs a Decision doc changed proposes it under **Terms** instead.

## Model tiers

Setup seeds each phase's `model` from `PHASE_TIERS` in `scripts/core/binding.pure.ts`: reason and verify `top`, the rest `mid`. `project.yml` maps each tier to a provider's model (`models: { claude: { mid: sonnet, top: opus } }`); add an entry for another provider and its harness resolves the tiers the same way. Change a phase's tier in `binding.yml` when experience shows its Subagents need more or less, and log why in a record under `docs/learnings/drive/records/`. The Orchestrator's own session override, when the Operator gives one, beats the Binding for that session.

## The review file

`review.md` holds the calibration answers for every decision page: mode, audience, layout, depth, fidelity, feedback route and review width. Setup writes the empty template once; the Operator fills it. Reason and Fortify pass it to the page skill as the caller's inputs.

## Optional inputs

`drive status` prints three project inputs, each `filled`, `missing` or `empty`: the grill format (`grill.format` in `project.yml`, and whether the file it names exists), `review.md` (empty when every section is blank) and `profiles.md` (empty when `## Live or scheduled` is missing or blank). Name the input in an instruction and point at `drive status`, never at a file that may not exist.

- **Grill format missing:** fall back to /grilling's own format, and say so once at Define.
- **`review.md` or `profiles.md` empty or missing:** the first time the Orchestrator needs it (a decision page; the pre-flight list), ask the Operator once, write the answers to the file, and never ask again.

## After setup

Read the Binding with the Operator: a phase with no skill is done inline by the Orchestrator, and one skill may sit in several phases. Fill `profiles.md` with what is specific to this project, such as the rule that its ADRs bind or the extra branch types it admits.
