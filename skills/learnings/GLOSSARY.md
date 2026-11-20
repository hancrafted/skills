---
type: glossary
title: Learnings
stale_after: 2027-02-20T00:00:00Z
---

# Learnings

How every skill in this repo records what went wrong in a run and turns repeated failures into an upstream ticket. Decision: `docs/decision-records/drive/0008-learnings-move-to-the-learnings-skill.md`.

**Store**: `docs/learnings/`, the learnings skill's home. One folder per skill, `docs/learnings/<skill>/`, holding records and failure modes. `docs/learnings/README.md` is its contract and lists the skills whose learning is off.

**Record**: one append-only file per run that went wrong, `records/<date>-<topic>.md`. Each H2 names a failure mode and holds its evidence and correction. A clean run writes none. A log: it carries `type`, never `stale_after`.

**Failure mode**: one narrow way a skill went wrong, named so a check could catch it next time. One file each, `failure-modes/<slug>.md`, with a status: `proposed`, `ticket`, `fixed` or `wontfix`. It carries `type` and `stale_after`, one month after its last write. It holds no count.

**Count**: how many records cite a failure mode, computed by `learnings list`, never typed.

**Smell**: a failure mode with a count of three or more. A smell is offered for filing upstream.

**Upstream ticket**: an issue on the skill's `source` repo from `skills-lock.json`, labelled `fortify` and `skill:<name>`. At most one is open per skill. Filing one is a human gate.

**Learn step**: the last step of every skill. After a human correction or a failed step it asks "Record learnings from this run?"; otherwise it asks nothing. It skips when `/learnings` is not installed.
