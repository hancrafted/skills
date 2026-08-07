# skills

My personal collection of agent skills.

## Install

```sh
npx skills add hancrafted/skills
```

Project scope — the default — so the skills are committed and work for every clone
and in CI. Never `--copy`: the `commit` skill's git hook depends on a single
canonical path, which copy mode destroys.

## Skills

| Skill                              | What it does                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`commit`](skills/commit/SKILL.md) | Authors a commit message git history can be mined from, and carries the zero-dependency shell gate that enforces it. `--setup-husky` wires that gate into a repository's git hooks. |
