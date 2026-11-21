---
type: record
workflow: skill-governance
date: 2026-11-20
fortify: pending
---

# skill-governance

## decision-reversed-before-gate-for-lack-of-examples

- **Correction:** Operator (2026-11-20, after the Decision PR opened): "I want to revist the idea of markdown hanress governing Skill.md ... the free form inside the frame can be governed by ADR" — reversed Q41 (no body rules); gate held, SKL-002 rewritten to Addy Osmani's anatomy before merge.

## adr-prose-unreviewed-before-decision-pr

- **Correction:** Operator: "set archgate:developer as default profile for this repo. then have 3 opus /archgate:adr-author review and fix each created ADR." — ADR prose was not reviewed by an ADR author before the Decision PR opened.

## tickets-written-without-dispatch-lines

- **Correction:** Orchestrator (mine): tickets were published without the dispatch lines (Files/Describes/ADRs/Evidence from); added after the gate, which surfaced the #78/#80 shared-config overlap only then (#80 gained blocker #78).

## ticket-blocker-flag-lost-in-shell

- **Correction:** Orchestrator (mine): `gh issue create ${3:+--blocked-by $3}` passed the flag as one word in zsh; #80 was created without its blocker and fixed by hand.

## adr-rule-marker-before-rule

- **Correction:** Orchestrator (mine): ADRs written with 📜 markers for rules that did not exist yet; GEN-001 failed them; switched to `planned rule:` (departure from the GEN-001 marker form until each ticket).

## adr-description-yaml-unparsed

- **Correction:** Orchestrator (mine): SKL-002 description held an unescaped apostrophe in single-quoted YAML; archgate listed the ADR as unparsed until #80 fixed it.

## ticket-ownership-misses-flagged-files

- **Correction:** Orchestrator (mine): #82's brief missed two drive references its rules would flag; ownership extended mid-task.
- **Evidence:** review 3 P2: a ticket's Files line missed a change its own decision required: R1's frame-config intents pointing at docs/skills/skill-anatomy.md, owned by no ticket, fixed in fix-review-3 (review-3.md, decisions.md Review 3 triage)

## integration-branch-not-synced-with-base

- **Correction:** Orchestrator (mine): the Integration branch never synced main; PR #85's drive-port learnings would have landed in the retired store (caught by the final review).
- **Evidence:** review 2 S1 (high): origin/main 5de5bb2 (PR #85) added 28 files under docs/drive/learnings/ after this branch moved the store at 5b55e5d; git merge-tree merged cleanly and kept them in the retired store (review.md)
- **Evidence:** PR #91 review round: main moved twice while the PR waited (PR watch exit 11, then a second sync); the first sync was 3451ff0 with a conflict in skill-names-setting-that-does-not-exist.md (decisions.md, PR #91 review round, Implement resumed)

## test-inherits-git-env-corrupts-host-repo

- **Correction:** Incident: the main checkout's .git/config was rewritten to core.bare=true twice during parallel Subagent runs (cause not found; GIT_DIR inheritance proven possible); fenced globally in the slow-test setup and the hook test.
- **Evidence:** the main checkout's .git/config read core.bare=true at 16:31 and again before fix-review-1's run; GIT_DIR inheritance proven possible, cause not found; fenced in setup.slow.test.ts, then globally in vitest.slow.config (decisions.md, Pre-flight and Implement log)
- **Evidence:** review 2 S5: tests/harness-hooks.test.ts:19 passes inherited GIT_* to a real drive guard, safe only through PATH shadowing; fixed in fix-final (review.md)

## review-subagent-cannot-start-code-review-sub-agents

- **Evidence:** review 1 and review 2 both ran /code-review without a sub-agent tool: one agent ran the Standards and Spec axes in turn (review-1.md and review.md, Not run)

## skill-reference-contradicts-itself

- **Evidence:** review 2 S4: skills/commit/SKILL.md:24 says there is no approval stop, while :20 and :54 declare a human gate for a bare /commit; fixed in fix-final (review.md)

## stateful-protocol-names-home-nothing-writes

- **Evidence:** review 2 S2, S3: learnings SKILL.md:34-36 tells the agent to run a setup learnings lacks, and drive SKILL.md:30-31 names homes (docs/learnings/drive/, docs/decision-records/) with no README that anything writes; fixed in fix-final, docs/decision-records/README.md deferred to #93 (review.md)

## rationalization-row-without-incident

- **Evidence:** review 2 S6: cleanup rows 1, 2, 6 and learnings rows 2, 4, 5 cited no incident, against SKL-002 3.4; removed in fix-final (review.md)

## cli-argument-becomes-path-unvalidated

- **Evidence:** review 1 finding 1 (hard): learnings record --skill ../../escape wrote escape/records at the repo root and --failure ../../../pwn wrote docs/pwn.md, both exit 0; fixed in fix-review-1 (review-1.md)

## readme-contract-disagrees-with-parser

- **Evidence:** review 1 findings 2 and 6b: docs/learnings/README.md said the Off list is one skill per line but the parser read only '- ' bullets, and the README template was copied into code; fixed in fix-review-1 (review-1.md)

## setup-wires-check-for-skill-it-does-not-install

- **Evidence:** review 1 spec finding 1: drive setup wrote 'learnings check' into check:docs without installing learnings; fixed by #81 (review-1.md)

## adr-prose-invents-check-name

- **Evidence:** review 3 S2: #96 put skill-description-purpose-first into SKL-001 Decision 1.4, a name no rule or config defines; dropped in fix-review-3, Compliance 3 names agentskills-spec and the description pattern (review-3.md, 98-skl-checks.report.md)

## report-token-count-differs-from-rule

- **Evidence:** review 3 S4/S5: #97 reported token estimates from bytes / 4 while SKL-001 says ceil(characters / 4); drive's 4,995 was re-measured by the rule and passes, SKL-001 now says whole SKILL.md (review-3.md, 97-skills-meet-adrs.report.md, fix-review-3.report.md)

## fix-edits-decision-doc-the-gate-blocks

- **Evidence:** review 3 P3: the fix reached skills/learnings/GLOSSARY.md:9, a Decision doc; the pre-commit gate refused it, so it was deferred to #102 (fix-review-3.report.md, decisions.md Review 3 triage)
