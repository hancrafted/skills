---
workflow: reference-repos
date: '2026-11-20'
fortify: engaged
---

# reference-repos

The Workflow that made addyosmani/agent-skills, mattpocock/skills and cursor/plugins (`pstack/`) advisory prior art for this repo: a pinned shared cache, an index and an AGENTS.md pointer (spec #86, Integration PR #92). Two review rounds found two Medium and fifteen Low items; CI on #92 showed four checks passed and none failed at the time of writing.

## tickets-written-without-dispatch-lines

- **Correction:** (Orchestrator, mine) Tickets #87–#89 were published without the `Files:`, `Describes:`, `ADRs:`, `Evidence from:` lines dispatch.md requires; added after the gate when `drive dispatch check` asked. Cause: I wrote tickets from to-tickets' template and did not read dispatch.md before Reason.

## skill-names-setting-that-does-not-exist

- **Correction:** (Orchestrator, mine) The grill ran in /grilling's format, not `grill.format`: `project.yml` has no `grill.format` key and `docs/agents/grilling-format.md` does not exist (drive SKILL.md Define names it).

## bare-cd-moves-session-into-another-worktree

- **Correction:** (Orchestrator, mine) A fact-finding `cd` into `.worktrees/feat-skill-governance` moved the session's working directory into another Workflow's worktree; nothing was written there. Cause: a bare `cd` in a check command.

## headless-dogfood-run-denied-compound-command

- **Correction:** (Orchestrator, mine) #89 ran inline (headless `claude -p`) with `--allowedTools`; rtk's command rewrite made a compound command need approval, so run2 could not run `npm run refs`. The dogfood harness, not the pointer, cost that run its citation.

## review-subagent-cannot-start-code-review-sub-agents

- **Correction:** (Reviewer) Review 1 had no sub-agent tool, so code-review's Standards and Spec passes ran in sequence, not in parallel.
- **Evidence:** review 2 repeats it: "No sub-agent tool was available here, so I ran both axes in sequence" (`review.md`, method note)

## agent-search-skips-gitignored-symlinked-cache

- **Evidence:** Glob from the repo root finds 0 files under the `.references` symlink, 123 when path-scoped; dogfood run2 read that as a missing cache (`review-1.md` K1, decisions log Implement log #89); fixed in review fix 1
- **Evidence:** the fix's presence test, `.references/<name>/.git` exists, cannot be seen by a file search either (`review.md` N1); fixed in review fix 2

## skill-reference-contradicts-itself

- **Evidence:** the index's Use step 5 said to edit the map only with `--bump`, while requirement 11 and DR-0001 allow hand edits guarded by pre-push `--check` (`review-1.md` K2, Medium); fixed in review fix 1

## noop-run-rewrites-shared-cache

- **Evidence:** the L9 fix made every `npm run refs` run `git sparse-checkout` on the shared cache, rewriting `.git/index`; with `index.lock` present it exits 128 (`review.md` N2, `git-cache.ts:60-63`); fixed in review fix 2

## path-predicate-misses-trailing-slash

- **Evidence:** `isUnder('pstack/x.md', 'pstack/')` returns false, and the predicate in `refs.ts:9` had only slow-test coverage (`review.md` N3 and Standards 2); fixed in review fix 2

## index-section-lists-path-without-its-line

- **Evidence:** `docs/agents/reference-repos.md:76` names two repos while `:84` lists a cursor-plugins path (`review.md` S1; missed by review 1); fixed in review fix 2
