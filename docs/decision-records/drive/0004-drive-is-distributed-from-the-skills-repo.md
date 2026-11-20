---
type: decision-record
title: Drive is distributed from the skills repo
status: accepted
---

# Drive is distributed from the skills repo

The Operator approved this on 2026-11-19, in the drive-to-skills grill. `/drive` and its `drive` CLI grew in `hancrafted/content-library`, but the Workflow is meant for any TypeScript repo, this one first. While the source lives in one product repo, no other repo can install it, and every Fortify edits a copy only that repo runs. Terms: [Drive glossary](../../../skills/drive/GLOSSARY.md).

## Decisions

1. **This repo owns the source.** `skills/drive/` here is the only copy that is edited. Every other repo, content-library included, installs it with `npx skills add hancrafted/skills --skill drive`, pinned in its `skills-lock.json`, and never edits the installed copy.
2. **The skill ships; the project state stays.** `SKILL.md`, the Drive glossary, `references/`, `catalog/` and `scripts/` with their tests ship. `docs/drive/` (Binding, project config, Profiles, Enforcers, review calibration, learnings) stays in each consuming repo, and so do project hooks and lock modules named in `project.yml`.
3. **Drive's design records live here.** Records 0001 to 0003 moved from content-library Decision records 0027, 0028 and 0030; content-library keeps a pointer for each. They sit in `docs/decision-records/drive/`, outside the skill folder, so no consumer receives them; the installer ships every file in a skill folder.
4. **Fortify routes each option by its target.**
   - Project context (`docs/drive/*`, the repo's own Enforcers): a branch in that repo.
   - The skill, installed: an issue on the repo `skills-lock.json` names as its source.
   - The skill, authored in `skills/` (as here): a branch in this repo.
5. **A failure mode lives where its fix lives.** Records, the evidence, stay in the repo whose Workflow wrote them. A failure mode about drive itself is an issue on this repo; the consumer's failure-mode file carries `status: ticket` and the issue's URL, so recurrences are still counted locally.
6. **Drive's code meets this repo's gate on arrival.** The port brings tests to `ARCH-003-testing`'s three suite blocks and AAA marks, `yaml` to `ARCH-001-dependency-admission-bar`'s tilde range, scripts to the dependency-cruiser rules (`pure-no-node-io`, `no-cross-skill-scripts`) and names to `GEN-007-naming`. Fixtures name no content-library facts.
7. **Two releases.** `1.0.0` is the port: today's behaviour, passing this repo's gate, run by this repo and content-library. `2.0.0` is setup v2 (`docs/decision-records/drive/0005-drive-setup-is-a-scan-an-interview-and-an-apply.md` to `docs/decision-records/drive/0007-drive-runs-on-four-harnesses.md`). Both consumers reach `2.0.0` through its own migration path.

## Considered options

- **content-library stays the source and syncs out.** Rejected: two copies drift, and each fact must live in one place.
- **Consumers symlink a local checkout of this repo.** Rejected: the path is machine-specific and breaks in CI and in every other clone.
- **Fortify edits the installed copy and opens a sync PR upstream.** Rejected: `npx skills update` overwrites the edit, and the lock hash no longer matches.
- **One shared failure-mode catalogue in the skill.** Rejected: every consumer would need a cross-repo read and write at Fortify time.
- **Move under the in-flight fortify sweep.** Rejected: nine tickets would become cross-repo ports; the move starts after that sweep merges.

## Consequences

- A drive fix found in content-library reaches it only through an issue here, a release and `npx skills update`; the learning is not lost, but it is no longer instant.
- This repo becomes drive's second consumer and dogfoods it, which surfaces the content-library assumptions the code still carries.
- About 30 of content-library's failure modes are about drive itself; the port files them here, so this repo's Fortify starts with history.
- Enforcement: this repo's `npm run verify` (vitest fast and slow lanes, dependency-cruiser, archgate, `mh check` per skill) covers the code; `skills-lock.json` pins each consumer; Fortify's routing is checked by review only.
