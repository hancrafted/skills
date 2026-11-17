# Fortify candidates: Drive workflow

Source: the first Drive run, the Workflow that takes a spec to a merged pull request (spec #663, PR #695). All counts are 1 or 0: this is the first Workflow, so no failure mode is a smell yet (a smell is count 3 or more). The Operator may pick at most one quick win (a narrow, deterministic fix of 15 to 30 minutes) and one architectural fix, or none for either.

## Quick-win candidates

### QW-1 Hung slow test

- **Failure mode:** a Subagent left a hung slow-test run inside its worktree, so `wt:done` refused to tear the worktree down.
- **Evidence:** observed failure 3: a vitest run hung for 7+ minutes and the Orchestrator killed the process tree by hand.
- **Existing state:** the per-test timeout exists (`vitest.slow.config.mts`: testTimeout 60_000 since 2026-11-13) and the hang happened anyway. A timeout is not the missing piece; what let it hang was a process left running in the worktree, which `wt:done` then refused to tear down.
- **Proposed Enforcer:** test-runner: `test:slow` timeouts, reframed around the leftover process.

### QW-2 Half-made worktree

- **Failure mode:** `wt:new` leaves a half-made worktree when its install step fails.
- **Evidence:** observed failure 1: the first `wt:new -- decisions/drive` created the branch, then ended in a Node stack trace. A rerun failed with "branch already exists", and `npm ci` had to be rerun by hand.
- **Proposed Enforcer:** test-runner: `test:slow` with an injected install failure.

### QW-3 `core.bare` flipped

- **Failure mode:** the main checkout's git config was set to `core.bare=true` mid-run.
- **Meaning:** `core.bare=true` tells git the folder is storage only, with no working files to build in.
- **Evidence:** observed failure 2: a Subagent reset it to false. The cause is unknown; a test may have leaked into the real repo.
- **Proposed Enforcer:** a new check in `npm run preflight`.

### QW-4 Stale Binding

- **Failure mode:** the Binding (`docs/drive/binding.yml`, which names the skill each DRIVE phase runs) names a skill that is no longer installed, and nothing fails.
- **Evidence:** on 2026-11-17 `main` renamed the installed skill `to-decision-html` to `to-review`; `docs/drive/binding.yml` still named the old one and nothing failed. The Orchestrator found it by hand while merging `main` into `feat/drive` (merge 283abde8).
- **Proposed Enforcer:** a test or `drive setup` check that fails when a skill named in the Binding is not installed.

## Architectural candidates

### AR-1 Phase marker

- **Failure mode:** a step started without naming the DRIVE phase, the resulting branch state or the Operator's decision points.
- **Evidence:** two Operator corrections (see Corrections). The review round already added a prose rule, "announce each phase"; a mechanical check would add a failure the Orchestrator cannot skip.
- **Proposed Enforcer:** a new hook on `wt:new` plus a `drive status` test.

### AR-2 SubagentStop verify-done

- **Failure mode:** a Subagent stops before committing and merging its Task branch.
- **Evidence:** observed failure 4, below: it happened twice and each time needed a SendMessage.
- **Proposed Enforcer:** a new SubagentStop hook, or a `wt:done` precheck, tested.

### AR-3 File-overlap check

- **Failure mode:** parallel tickets edit the same file, and the Orchestrator relays rules between them by hand.
- **Evidence:** observed failure 7, below: two text tickets and fix Subagents shared `learnings.md` and `binding.yml`; one sync conflicted.
- **Proposed Enforcer:** a new check in dispatch that compares each ticket's declared files for overlap, tested.

## Corrections

- The Operator stopped `wt:new -- decisions/drive` and asked "are we starting to implement? or is this prep work? are we already on a new integration branch?". The Orchestrator had started a step without saying which DRIVE phase it was in or what branch state would follow.
- The Operator asked "can this session run until end or does it require a human?" and asked for a guide to reviewing the PR. The Orchestrator had not stated the Operator's decision points, or how to review, up front.
- The Operator asked to resume automatically after a quota reset. There is no built-in recovery, so the Orchestrator added a session-only watchdog (a cron job that dies with the session).

## Observed failure modes (Orchestrator notes for Fortify)

1. The first `wt:new -- decisions/drive` created the branch, then ended in a Node stack trace. A rerun failed with "branch already exists", and `npm ci` had to be rerun by hand in the half-made worktree.
2. Mid-run, the main checkout's git config was found set to `core.bare=true`, and a Subagent reset it to false. The cause is unknown; a test may have leaked into the real repo.
3. A Subagent left a hung slow-test run (vitest, 7+ minutes) inside its worktree, so `wt:done` refused to tear it down. The Orchestrator killed the process tree by hand.
4. Twice, a Subagent stopped before committing and merging ("waiting on monitor") and needed a SendMessage to finish the brief's last steps.
5. Spec drift: #654 and #638 merged while the spec was being written, so stories and tickets had to be rechecked and re-decided (Q33–Q35).
6. Review checkpoint 2 found a guard bug that would have blocked every conflicting merge of `main`. It was fixed before merge. The guard's first slow tests did not cover a merge.
7. Parallel text tickets (#667, #668) and fix Subagents shared files (`learnings.md`, `binding.yml`). The Orchestrator relayed rules between them by SendMessage, and one sync conflicted.
8. A rib-engineering-pack hook blocked a git command that overrides `core.hooksPath`, even in a throwaway repo during a guard check.
9. The Decision-doc guard will block ordinary branches that edit feature docs: 50 commits on `main` did so in the last 60 days.

