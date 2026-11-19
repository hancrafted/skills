---
type: decision-record
status: accepted
---

# Workflow phases are ports bound per project

`/drive` must run the same Workflow in any repo, whichever skills that repo has installed. So the skill names five abstract phases, DRIVE, and never a concrete skill; each project binds the phases to its own skills in a Binding that setup detects and the Operator edits. The phases are the ports, the Binding the adapter: the Workflow depends on phases, not on a vendor's skills. Terms: [Drive glossary](../../skills/drive/GLOSSARY.md). Spec: hancrafted/content-library#663. Moved from content-library Decision record 0027 when drive moved to this repo (Decision record 0004).

## Decisions

1. **Five phases, by verb.** Define (_clarify_), Reason (_specify_), Implement (_codify_), Verify (_verify_), Evolve (_fortify_). Grilling is a mode used inside the first two, not a phase. A phase with no bound skill is done inline by the Orchestrator, so a sparse repo still runs the Workflow.
2. **The Binding is n:m.** One skill may serve several phases (`/improve-codebase-architecture` serves Reason, Verify and Evolve) and one phase several skills. Each phase also carries the model its Subagents run on, and the Binding names the agent type every agent uses.
3. **Setup detects, the Operator owns.** Setup reads the skills lockfile and the skill folders, seeds the Binding and the per-phase model presets the skill ships, and lists the project's Enforcers. Re-running setup adds what is newly installed and keeps every hand edit.
4. **Project state lives beside the docs, not in the skill.** The Binding, the project config, the Profile extension and the learnings live in `docs/drive/`, mirroring the skill's name. An installed skill stays read-only: `npx skills update` overwrites a copy edited in place, so everything a project changes lives in its own docs.
5. **Words travel with the skill.** The Drive glossary ships inside the skill folder and `GLOSSARY-MAP.md` lists it as its own context, so a repo that installs `/drive` gets its words with it.

## Considered options

- **Live detection every session, no file.** Rejected: the mapping would differ per machine and could not be reviewed or overridden.
- **Hard-wire Matt Pocock's skills, with generic fallbacks.** Rejected: couples a portable skill to one vendor; dependency inversion is the point.
- **Nine phases** (requirements, design, architecture, specification, planning, implementation, review, integration, retrospective). Rejected for five verbs with an n:m Binding: fewer columns to bind, and no skill forced into one box.
- **The terms in the Factory or the content library glossary.** Rejected: they would stay behind when the skill moves to another repo.

## Consequences

- Swapping a skill (another vendor's spec skill, a repo's own reviewer) is an edit to the Binding; the skill's text never changes.
- A skill that runs on Drive, as `new-episode` is to, can supply its domain specifics through the Binding instead of reimplementing the Workflow.
- The Binding can drift from what is installed until setup is re-run; setup is cheap and idempotent.
- Enforcement: the `drive` CLI's setup is tested against fixture repos with and without a skills lockfile; the skills gate (markdown-harness frontmatter rules and the name-matches-folder test) covers the skill's text. Whether a run follows the Binding is checked by review only.
