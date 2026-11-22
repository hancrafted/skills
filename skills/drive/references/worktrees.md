# Worktrees and merges

The `drive worktree` commands, for the Orchestrator and every Subagent. Below, `drive worktree` stands for the command `worktree.invoke` names in `docs/drive/project.yml`. When the config names none, it is `node <this skill's path from the repo root>/scripts/drive.ts worktree`, which setup seeds as `invoke`. Every project value (worktree folder, base branch, remote, install and preflight commands, lock module, hooks) is in that file's `worktree` section. Each refusal prints the command that fixes it: run that command.

## new

`drive worktree new <branch>` fetches the remote, adds `<worktree.dir>/<branch with / as ->` from the remote base branch, then runs `worktree.install` and `worktree.preflight` inside it. It is ready when it prints `✔ worktree ready`; `cd` there and work. A real dependency install per worktree is the point: never symlink one from another checkout.

`--base <branch>` starts from that local branch instead, with no fetch: a Task branch starts this way from its Integration branch. `new` refuses a `--` branch whose part before the first `--` is missing, is the base branch or differs from `--base`.

## done

Run `drive worktree done <branch>` from the main checkout, never from inside the worktree. First stop everything you started in the worktree (dev servers, watchers, background shells). `done` refuses while a program still has its working directory inside the worktree and names it; stop it and rerun, or add `--kill`, which stops exactly the listed programs and never your own shell. Never kill by name (`pkill`): it can take your shell with it.

Without `--base`, `done` is for a branch whose PR merged: it runs `worktree.beforeRemove`, removes the worktree, runs `worktree.afterRemove`, deletes the branch once git sees it merged and fast-forwards the local base branch. When the local base branch holds unpushed commits it stops and lists them; move them to a branch or a PR, then rerun.

With `--base <branch>` it first runs the project's `worktree.beforeMerge` hooks in the task worktree (a failing hook stops the merge), then merges the branch into that base: one merge commit, built outside any worktree, then fast-forwarded into the worktree that has the base checked out. Merges into one base run one at a time under the project's lock (`worktree.lock`); a waiting run says so, a lock whose holder died is taken over. While the base's worktree is busy (a merge, rebase or cherry-pick in progress, or local changes in the same files) it prints one `is busy` line, retries for up to 10 minutes and rebuilds onto the base's new tip. A conflict names its paths; then the base, the worktree and the branch stay as they were, the lock is released, and nothing is removed. Once merged it runs `worktree.afterMerge`, removes the worktree and deletes the branch. Read what the hooks print: they carry the project's own warnings.

When the OS drops a metadata file (`.DS_Store`) into the folder mid-delete, `done` removes the leftover folder itself as long as every file left is metadata, ignored or identical to the branch; otherwise it names the files that hold unsaved work. A rerun after any half-finished `done` continues the same way.

## sync

`drive worktree sync`, inside a worktree, merges the remote base branch into the current branch; `--base <branch>` merges that local branch instead. It refuses a dirty tree, a detached HEAD and the base branch itself, and it holds the current branch's merge lock, so a `done --base` into this branch waits for it. `--base` naming the current branch merges that branch's remote commits instead: `drive worktree sync --base <Integration branch>` in the Integration worktree is how a merged Decision PR reaches it. A sync stopped by a conflict leaves the merge in progress: resolve, commit, and the waiting merges continue. To catch up any branch, sync inside its worktree; a `git pull` in the main checkout advances whatever branch that checkout holds.

## push

`drive push`, inside a worktree, pushes the current branch (setting the upstream when there is none), fails when the push exits non-zero, then fails unless the remote branch equals `HEAD`. It prints `✔ pushed <branch> <old>..<new>`; hook output streams. Run it in the background and read its exit code: never pipe it through `grep` or `tail`, which hides the exit code. `--spec <epic number>` opens the draft Integration PR when the branch has none (Define pushes the empty Integration branch without it; pass it on the first push after the first merge), with `Closes #n` for every sub-issue of the epic, and fails on a missing one. A branch whose PR already merged is refused. Only the Orchestrator pushes.

## pr watch

`drive pr watch <number>` polls the PR in the background. Exit 0 and `merged <sha>`: merged. Exit 2 and `closed`: closed unmerged. Exit 3 with the bodies: a review, comment or inline review comment (printed as `path:line body`) arrived after the watch started. It skips comments that start with `<!-- drive -->`, so start each reply you post on a PR with it.

`drive pr watch <number> --integration` watches the Integration PR instead and ignores comments. Its exit codes:

| Exit | Meaning                              |
| ---- | ------------------------------------ |
| 10   | a check is failing                   |
| 11   | a merge conflict                     |
| 12   | merged; lists the tickets still open |
| 13   | closed unmerged                      |

`drive pr ready <number>` marks the draft ready. It refuses (exit 1) in three cases: `.scratch/<topic>/review.md` is missing; a `## Contradictions` quote does not check out at the commit the report names in `Reviewed: <sha>` (`drive review quotes`), or that line is missing; or, after fetching both, `origin/<base>` has commits `origin/<Integration branch>` lacks, so a sync that was never pushed still refuses: the message names the count and says to run `drive worktree sync`, then `drive push`. It never syncs.

## How a Subagent finishes

1. Commit, then `drive worktree sync --base <Integration branch>` in the worktree; on a conflict, resolve and commit.
2. Rerun the project's full verification, then stop everything it started in the worktree.
3. From the main checkout: `drive worktree done <Task branch> --base <Integration branch>`. Write the merge commit's hash and `git show --stat <hash>` into the report.

When the brief says the task merges by PR, stop after the first item and report; the Orchestrator pushes the Task branch and opens the PR. Once it merges, `drive worktree done <Task branch> --base <Integration branch>` finds it merged and only removes it.

## Spikes

A spike leaves no worktree behind: commit it, write `git diff <Integration branch>...<spike branch>` to `.scratch/<topic>/<spike>.patch`, then `drive worktree done <spike branch>` and `git branch -D <spike branch>` in the same turn.

## The topic folder

Each Workflow keeps its memory in `.scratch/<topic>/` (gitignored), so it survives compaction and new sessions:

- `brief.md`: the shared brief every Subagent reads first.
- `decisions.md`: the decisions log. Write each settled term and decision in its exact wording the moment it settles, and each Operator correction under **Corrections** at once.
- `<task>.brief.md` and `<task>.report.md`: one **Handoff** per task, [references/dispatch.md](dispatch.md).
- `drive.log.jsonl`: written by the CLI and the Subagent hooks; `drive transcript --topic <topic>` reads the sessions it links. `monitor.md`: the monitor's findings ([monitor.md](monitor.md)).

## Branches

- **Integration branch**: `<type>/<slug>`, in its own worktree, so the main checkout stays on the base branch and several Orchestrators can run side by side. `<type>` is a Conventional Commits type, or one `docs/drive/profiles.md` admits. Create it first, when the Workflow starts, and push the empty branch with `drive push` (Define).
- **Task branch**: `<type>/<slug>--<issue>-<task>`, or `<type>/<slug>--<task>` without a ticket, started with `--base <type>/<slug>`.
- **Decision docs**: `decisions/<topic>`, from the Integration branch, through the Decision PR into the Integration branch; `decisions` is a `<type>` like any other. The Decision docs reach the base branch with the Integration branch's PR.

These names override any worktree path or branch a Handoff or another skill names, and the self-merge ([How a Subagent finishes](#how-a-subagent-finishes)) replaces any skill's merger or per-ticket PR.
