---
type: decision-record
title: Learnings move to the learnings skill
status: accepted
---

# Learnings move to the learnings skill

The Operator approved this on 2026-11-20, in the skill-governance Workflow. Every skill in this repo now gets drive's learning loop, not only drive. Keeping the scripts inside drive would make each other skill either copy them or depend on drive. This record amends `docs/decision-records/drive/0003-drive-learnings-are-records-and-failure-modes.md`, Decisions 1–3: where the store lives and who owns the scripts. The format of records and failure modes is unchanged. Terms: [Drive glossary](../../../skills/drive/GLOSSARY.md), [Learnings glossary](../../../skills/learnings/GLOSSARY.md).

## Decisions

1. **A `learnings` skill owns the loop.** It records a run, lists failure modes with computed counts, finds similar ones, checks the store and files upstream. drive keeps Fortify's harness hardening (Enforcers, options, the decision page) and calls `learnings` for everything else.
2. **One store, per skill.** The store moves from `docs/drive/learnings/` to `docs/learnings/<skill>/{records,failure-modes}/`, the learnings skill's own home. drive's store becomes `docs/learnings/drive/`.
3. **One switch.** `docs/learnings/README.md` is the home's contract and lists the skills whose learning is turned off.
4. **The scripts move.** `drive learnings list|similar|check` become `learnings list|similar|check|record|file-upstream --skill <name>`. `learnings check` replaces `drive learnings check` in the docs check and validates every skill's store.
5. **Record only what went wrong.** A skill's last step asks "Record learnings from this run?" only after a human correction or a failed step. A clean run asks nothing.
6. **Upstream per skill.** At a count of three or more (a smell), or on request, `learnings file-upstream` files an issue on the `source` repo from `skills-lock.json`, behind a human gate. Labels: `fortify` and `skill:<name>`. At most one open per skill, not per repo.
7. **drive depends on learnings.** drive's Entry check requires `/learnings`; drive's setup installs it and moves an existing `docs/drive/learnings/` to `docs/learnings/drive/` with `git mv`, in one step the Operator approves. The trigger is the version record in `docs/drive/README.md` (`generated.by`). Every other skill skips its Learn step when `learnings` is absent.
8. **Freshness.** Records are append-only logs and carry `type` only. Failure modes carry `type` and `stale_after`, set to one month after their last write.

## Considered options

- **A prose protocol block in each skill, no scripts.** Rejected: every skill would re-implement counting and similarity by hand.
- **Shared scripts vendored into each skill.** Rejected: copies drift, and one fix needs a release of every skill.
- **Keep `docs/<skill>/learnings/`.** Rejected: the learnings skill would write into other skills' homes, which breaks one writer per skill home.
- **One `fortify` ticket per repo.** Rejected: one skill's open ticket would block every other skill's.

## Consequences

- Every skill improves the same way, and one `learnings list` shows every smell in the repo.
- drive is thinner but can no longer run without `learnings`.
- Repos with an installed drive migrate once, at setup.
- Enforcement: `learnings check` in the docs check; the scripts' tests move with them; asking the Learn question only after a correction is left to review.
