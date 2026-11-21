---
type: record
workflow: drive-fortify-batch
date: 2026-11-22
fortify: pending
---

# drive-fortify-batch

The Workflow that shipped drive 2.1.0 from the Fortify picks of skill-governance (spec #95, Integration PR #113): status inputs, the repo grill format and drive's template, `--strict` archgate, the `pr ready` base-ahead and quote refusals, one setting-name list. Two review rounds; one interrupt (a missed Operator comment).

## define-misses-operator-comment-on-spec

- **Correction:** I1 (Operator: 1): ship the bare drive grilling-format template inside the skill; a missing grill.format falls back to it and drive says so. Setup proposals, per-project buckets and calibration stay out of scope (follow-up Intent Workflow). New ticket T9 before #112; fix round after T9 (both touch SKILL.md and setup.md).
- **Evidence:** Review 1 P3 (Medium): setup.md fell back to /grilling's own format while the Operator's 2026-11-21 21:51 design-change comment on #95 said a bare drive template; 'Settled in Define' neither adopted nor rejected it, and no ticket shipped the template; decisions.md logged P3 INTERRUPT 'Define missed it' and #114 was filed (review-1.md P3; 114-grill-template.report.md)

## preflight-claims-no-scheduled-jobs-unchecked

- **Correction:** Pre-flight Q11 said "no scheduled jobs"; nightly and weekly cron jobs exist (review 1 P4). The Orchestrator's error, accepted by the Operator on its word. (Orchestrator, mine)
- **Evidence:** Review 1 P4: nightly.yml runs the slow lane on cron '0 3 * * *' and security.yml weekly; Q6 and Q11 wrote 'scheduled jobs: none', and #106 was about to write it into docs/drive/profiles.md; review 2 P1 carried the correction into the PR body's Live or scheduled section (review-1.md P4, review-2.md P1)

## subagent-misreads-instruction-abbreviation

- **Evidence:** Orchestrator finding O4: docs/agents/grilling-format.md:13 and skills/drive/assets/grilling-format.md:8 read 'W or H question' as the labels W (wayfinder) and H (grill-with-docs), while CLAUDE.md rule 3 means a question that starts with a W word (what, which, why, where, who) or with How; fixed in fix-review-1 (decisions.md; 106-repo-grill-format.report.md; 114-grill-template.report.md; fix-review-1.report.md)

## adr-trim-drops-qualifying-clauses

- **Evidence:** Finding O1 (Orchestrator, accept): the GEN-006 tightening for the briefing cap dropped qualifying clauses from Decision, beyond Q8's 'meaning unchanged': 'names have no length cap', 'a test named for it', lint off 'with its reason', 'unstaged hunks included', 'says what to do instead', 'reasons sit beside their entries'; review 1 S2 found more ('never a pointer', 'directly above', 'Decision anchor'); fix-review-1 restored them in a Decision details section under Compliance, and review 2 O1/S2 confirmed (decisions.md; review-1.md S2; review-2.md section 1)

## fast-test-creates-git-repo

- **Evidence:** Review 1 S1 (Medium): a ticket asked for 'a pure drive test' for the setting names, and the Subagent read live disk in settings.pure.test.ts and verify.pure.test.ts, against ARCH-003 §4.3; no rule flags it and the ticket conflicted with the ADR with no exception recorded; the real-disk cases moved to settings.slow.test.ts and verify.slow.test.ts with rerun triggers (decisions.md S1 accept; review-1.md S1; 109-setting-names.report.md)

## worktree-starts-behind-integration-branch

- **Evidence:** The #110 Subagent reported: 'Worktree was behind the Integration branch (not containing it), so I fast-forwarded it first' (110-reason-dispatch-check.report.md, Trade-offs); brief Rule 1 makes each Subagent confirm containment by hand

## gate-check-reads-state-the-fix-round-changes

- **Evidence:** drive pr ready 113 refused: review.md's Contradictions quotes lines as they were before the fix round, which then removed them, and run from the main checkout branch-only files reported 'file not found'; Q10 made the quote check read the checkout, so every review, fix, ready cycle with a contradiction failed; fixed in #111's I2 task by reading files at Reviewed: <sha> (decisions.md INTERRUPT I2; i2-reviewed-sha.report.md)
- **Correction:** I2 (Operator: 1): the review report records Reviewed: <sha>; drive review quotes reads each quoted file at that commit
