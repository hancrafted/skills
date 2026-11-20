---
type: record
workflow: drive-port
date: '2026-11-20'
fortify: skipped
skip-reason: skip
---

# drive-port

The Workflow that moved the drive skill and its CLI from content-library to hancrafted/skills as 1.0.0 (spec #29, Integration PR #57); Fortify was skipped: "Fortify: Operator answered "skip" (2026-11-20). Record written with fortify: skipped, skip-reason "skip"."

## fortify-record-missing-at-pr-ready

- **Evidence:** "Mine: no Fortify record was written at the end of Verify before `drive pr ready 57` (fortify.md "The record, at the end of Verify"). Cause: skipped the step under the review-2 rush. It is written now, on a branch from skills main." (`.scratch/drive-port/decisions-from-content-library.md`, Corrections)

## installed-skills-copied-flat

- **Evidence:** "Mine: commit 007fb1d copied the 26 Matt Pocock skills flat into `.agents/skills/` (colliding SKILL.md files); neither the Subagent nor review 1 nor I checked the tree shape. Found during the Q30 rebase." (decisions log, Corrections)
- **Evidence:** the Q30 rebase amended 007fb1d (feat/drive-port--binding, merged d85b49b) to the Binding only; backup tag `backup/drive-port-pre-rebase` (d2cabd0)

## spec-issue-named-as-integration-pr

- **Evidence:** "Correction (Orchestrator): the sweep's Integration PR is content-library#813 (draft); #789 is its spec. #31 updated. Implement waits for #813 to merge." (decisions log, Corrections)
- **Evidence:** "Mine: named content-library#789 as the sweep Integration PR (it was #813)." (decisions log, Corrections)

## decision-records-folder-guessed

- **Correction:** "Operator: records folder is docs/decision-records (not docs/adr), AGENTS.md + docs/agents/domain.md analog to content-library; Operator authorised the Orchestrator to merge the Decision PR itself." (decisions log, Corrections)
- **Evidence:** "Gate passed: Decision PR hancrafted/skills#47 merged by the Orchestrator (Operator-authorised), with docs/decision-records rename (ad95d28) and Archgate GEN-001/GEN-006 update (cc07b70, Subagent, report checked). feat/drive-port synced to 0528264; decisions/drive-port removed." (decisions log, Corrections)

## test-writes-live-workflow-log

- **Evidence:** "Review 2: the `--help` slow test wrote to the live `.scratch/*/drive.log.jsonl` on every run." (decisions log, Corrections)
- **Evidence:** review 2 finding 1 (major): `drive.slow.test.ts:282` ran the CLI with the repo as cwd; `.scratch/drive-port/drive.log.jsonl` held 31 `"cmd":"--help"` entries, from bf32a1f; fixed in fc88539 (`review-2.report.md`, `review-2-fix.report.md`)

## rule-exemption-merged-without-escalation

- **Evidence:** "Mine: the to-review exemption from the new module rule was merged by a Subagent without a GEN-004 escalation; triaged by scoping the rule to drive." (decisions log, Corrections)
- **Evidence:** review 2 finding 2 (major): `.dependency-cruiser.cjs:18` `pathNot: '^skills/to-review/scripts/'` had no `// tech-debt:` marker, #75 no label, cost or undo; the scripts-modules report listed it as "escalate per GEN-004" (d0f1daf, `scripts-modules.report.md` trade-off 1)

## subagent-ticks-unmet-acceptance-criterion

- **Evidence:** #35 ticked "/writing-for-agents applied" although the skill was not invoked (2c76f41; decisions log Implement, confirmed by review 1)
- **Evidence:** #32 ticked "`docs/drive/learnings/{records,failure-modes}` created", but git tracked only `README.md`, so a clone lacked both folders (ea8738e; `review-1.report.md` Spec axis)

## subagent-reports-worktree-failures-as-code-failures

- **Evidence:** the #35 report described knip and `learnings.slow.test.ts` failures; on feat/drive-port both passed ("the Subagent's failures were its worktree, not the code", decisions log Implement; refuted by `review-1.report.md` Checks)

## review-subagent-cannot-start-code-review-sub-agents

- **Evidence:** review 2 ran `/code-review` "both axes inline (no sub-agent tool in this session)" (`review-2.report.md`, d0f1daf)
- **Evidence:** the scripts-modules Task's review ran "inline on both axes (no subagent tool in this session)" (`scripts-modules.report.md`, f44e8ea)

## fast-test-creates-git-repo

- **Evidence:** `learnings.test.ts`, `setup.test.ts`, `worktree-merge.test.ts` and `worktree-remove.test.ts` created git repos in the fast suite against ARCH-003-testing §4.3, single tests up to 882 ms (#31 at 2e945ed, `review-1.report.md`); moved to the slow lane in d2cabd0

## test-waits-on-fixed-sleep

- **Evidence:** `worktree-merge.test.ts:226` slept 500 ms (#31 at 2e945ed, `review-1.report.md`); replaced by a wait on the child's output in d2cabd0

## test-leaks-spawned-child

- **Evidence:** `worktree-signal.test.ts:10` spawned `sleep 30` with no kill in a `finally`, so a failing assertion left it running (`review-1.report.md`); cleaned up in d2cabd0

## pure-sibling-test-runs-cli

- **Evidence:** `usage.pure.slow.test.ts` spawned `drive.ts --help` instead of testing `usage.pure.ts` (bf32a1f, `review-1.report.md`); the case moved into `drive.slow.test.ts` in d2cabd0

## skill-runtime-dependency-undeclared

- **Evidence:** `binding.pure.ts`, `config.pure.ts` and `learnings.pure.ts` import `yaml` at runtime while SKILL.md `compatibility` named only git and Node (`review-1.report.md`, major); 1.0.0 names it, the install step deferred to #38

## skill-reference-contradicts-itself

- **Evidence:** `references/fortify.md` gave an installed-copy test that this repo's symlinks contradict, a circular skills-lock route, two conflicting `fortify` label rules and "the tracker its Target names" for routes that name a branch (`review-1.report.md`, lines 50, 63, 66, 70); fixed in d2cabd0

## ported-skill-names-source-repo-facts

- **Evidence:** SKILL.md:93 named content-library's `docs/agents/grilling-format.md` as the `grill.format` example (`review-1.report.md`); deferred to #43
- **Evidence:** `dispatch-fixtures.ts` and `config.pure.test.ts` carried content-library paths (`docs/drive/learnings.md`, `tools/**/preflight*`, `docs/agents/grilling-format.md`) and pre-refactor flat paths (`review-2.report.md` finding 10); neutralised in fc88539
- **Evidence:** `catalog/catalog.json:24` ships `docs/features` as a Decision folder, content-library's layout (`review-2.report.md` finding 12); deferred to the 2.0.0 setup scan

## decision-record-cited-by-number

- **Evidence:** `docs/decision-records/drive/0004-drive-is-distributed-from-the-skills-repo.md:15` cites "Records 0001 to 0003", and spec #29 and #34 cite pre-move root paths or bare numbers (`review-2.report.md` finding 11); deferred to the next decisions branch, issue bodies fixed by the Orchestrator
- **Evidence:** skill text and code still cited "Decision record 000N" after the records moved; rewritten to paths in the scripts-modules Task (decisions log, PR #57 review grill)

## pure-module-loads-io-through-index

- **Evidence:** `guard/guard.pure.ts:2` and six other `*.pure.ts` import `../core/index.ts`, which re-exports `git.ts`, `log.ts` and `project.ts` (`review-2.report.md` finding 3, `scripts-modules.report.md` trade-off 3); deferred to #76

## adr-decision-section-over-briefing-cap

- **Evidence:** GEN-006's Decision section grew from 3344 characters on main to 3394 (review 1) and 3550 (review 2) against a cap of 2000, a warning only (`review-2.report.md` finding 7); shortened to 3270 in fc88539

## rule-help-text-disagrees-with-grammar

- **Evidence:** `.archgate/adrs/GEN-006-comments.rules.ts:73` help text showed `// decision: docs/decision-records/<file>.md` without the `<skill>/` segment the grammar accepts (`review-2.report.md` finding 6); fixed in fc88539

## changelog-misfiles-unreleased-work

- **Evidence:** `skills/drive/CHANGELOG.md` filed the module layout under `[Unreleased]` while `[1.0.0] - 2026-11-19`, never tagged or installed, described a flat `scripts/` (`review-2.report.md` finding 8, major); folded into 1.0.0 in fc88539

## pr-body-stale-after-rebase

- **Evidence:** PR #57's body predated the rebase: it described committing the Matt Pocock skills, told the Operator to delete files now tracked on main, cited d2cabd0 and said `Closes #34` while content-library#817 was open (`review-2.report.md` finding 9, major); rewritten in `.scratch/drive-port/pr-body.md`

## base-branch-ahead-of-origin

- **Evidence:** local `main` held c227528, not on origin/main nor in feat/drive-port, during review 2 (`review-2.report.md` finding 13); the branch was rebased onto it and re-verified before `pr ready`

## skill-install-left-untracked-in-main-checkout

- **Evidence:** the main checkout held an untracked `skills-lock.json` and `.agents/skills/{grilling,to-spec,tdd,code-review,…}`; worktrees did not see them, so setup bound nothing for define and verify (#32 at ea8738e, decisions log Implement)
- **Correction:** "Operator: commit the mattpocock install in hancrafted/skills and rebind." (decisions log Implement)

## setup-lists-nested-folders-as-skills

- **Evidence:** "Setup put agents/scripts in seen → issue filed." (binding Task d85b49b, decisions log Verify; #72)

## drive-help-exits-1

- **Evidence:** `drive --help` exits 1, pinned by `usage.pure.slow.test.ts` (#31 gap, confirmed by `review-1.report.md`); deferred to #71

## cross-repo-workflow-logs-subagents-elsewhere

- **Evidence:** `drive transcript --topic drive-port --tools` exited 1: "no sessions linked in .scratch/drive-port/drive.log.jsonl: the SubagentStart hook has logged none"; the Orchestrator's session ran in content-library, whose hook logged Subagent starts under content-library's `.scratch/drive-switch/` and `.scratch/drive-port-failure-modes/` (this record's Subagent, 2026-11-20)
