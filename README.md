# skills

My personal collection of agent skills.

## Install

```sh
npx skills add hancrafted/skills
```

Project scope — the default — so the skills are committed and work for every clone
and in CI. Never `--copy`: the `commit` skill's git hook depends on a single
canonical path, which copy mode destroys.

## Local development

This repository consumes its own skills through live symlinks in `.agents/skills/`
and `.claude/skills/`, pointing directly at `skills/`. Local edits are immediately
available to both agent systems without reinstalling published snapshots.

The local package is also named `skills` and has no executable, so bare `npx skills`
is shadowed here. A version-qualified command such as
`npx skills@1.8.1 add hancrafted/skills` works, but installs snapshots rather than
linking to the working source.

## Skills

| Skill                                    | What it does                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`commit`](skills/commit/SKILL.md)       | Authors a commit message git history can be mined from, and carries the zero-dependency shell gate that enforces it. `--setup-husky` wires that gate into a repository's git hooks. |
| [`cleanup`](skills/cleanup/SKILL.md)     | Cleans up local branches and worktrees after a merged PR, or classifies repository-wide cleanup candidates for approval.                                                            |
| [`to-review`](skills/to-review/SKILL.md) | Creates standalone HTML for human review with feedback controls, an offline browser grader and two approved eval baselines.                                                         |
