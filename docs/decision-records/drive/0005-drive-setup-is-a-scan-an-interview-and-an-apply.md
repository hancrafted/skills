---
type: decision-record
title: Drive setup is a scan, an interview and an apply
status: accepted
---

# Drive setup is a scan, an interview and an apply

The Operator approved this on 2026-11-19, in the drive-to-skills grill. Drive should run in any TypeScript repo after one install and one `/drive`. Today's setup seeds `docs/drive/` but leaves the wiring, the missing skills, the lock and the grilling format to the Operator, and it knows Matt Pocock's skills only. This record extends `docs/decision-records/drive/0001-workflow-phases-are-ports-bound-per-project.md`. Terms: [Drive glossary](../../../skills/drive/GLOSSARY.md).

## Decisions

1. **One entry point.** `npx skills add hancrafted/skills --skill drive`, then `/drive`. The Entry check runs setup when `docs/drive/` is missing or out of date (5).
2. **Three steps.**
   - `drive setup --scan` prints JSON: code host, tracker, hook manager, package manager, harnesses, installed skills with candidate phases, and what is missing.
   - The interview, in `references/setup.md`, takes one section at a time, recommendation first, and skips a section the scan already settled, in the shape of `/setup-matt-pocock-skills`. It reuses `docs/agents/*` that skill wrote and never asks twice.
   - `drive setup --apply <answers.json>` writes everything, idempotently.
3. **Preflight stops before writing.** Node ≥ 22.18 (runs `.ts` without a loader), a git repo, the code host CLI authenticated when there is a code host, and a package manager (npm, pnpm, yarn or bun). A missing one fails with its fix, and nothing is written.
4. **Apply wires the consumer.**
   - Package scripts for the CLI in the detected package manager's syntax, pointing at the installed skill; `worktree.invoke` follows.
   - The `drive guard` line in the existing hook manager (husky, lefthook or simple-git-hooks), or husky when there is none.
   - `yaml` and `@hancrafted/markdown-harness` as devDependencies; `.scratch/` and the worktree folder in `.gitignore`; `.claude/skills` linked to `.agents/skills`.
5. **Drive is versioned.** `metadata.version` (semver) in `SKILL.md` frontmatter, the spec's extension point, and `CHANGELOG.md` in the skill folder. Apply stamps `driveVersion` into `project.yml`. A stamp that differs from the installed version is out of date: setup runs the migrations between them, one `scripts/migrations/<from>-<to>.ts` each, with a test.
6. **Skills from any source.** One catalog per known source in `catalog/` (`mattpocock`, `pstack`, `agent-skills`) maps skills to phases. The scan reads `skills-lock.json`, `.agents/skills`, `.claude/skills` and plugin folders. A skill in no catalog gets phases the agent proposes from its description, confirmed in the interview; Fortify then proposes it for a catalog here.
7. **Fill only the empty phases.** Setup recommends `mattpocock/skills` for each phase no installed skill covers, installs what the Operator accepts, and never installs a duplicate for a covered phase.
8. **The lock is a choice.** Drive ships a file lock (exclusive create on a file in `.git/`, portable). The interview offers it, a module the project provides (`worktree.lock`), or none with a warning.
9. **The grilling format has two layers.** The skill ships `references/grilling-format.md`, the fixed shape: question numbers run across rounds (Q1 to Q###), each question one decision with a category and a wh-question, numbered options, a recommendation, an example per option, and a list of what was decided without asking. Setup writes `docs/drive/grilling.md`, the project's categories that are asked; the interview recommends contract, architecture and workflow, and the Operator edits them. The Orchestrator applies both over every Define skill's own round format.
10. **macOS and Linux are promised.** Windows is best-effort under WSL or Git Bash, and the README says so.

## Considered options

- **Setup all in prose, the agent writing files.** Rejected: detection and writing must be testable.
- **An interactive terminal script.** Rejected: it cannot run inside an agent session.
- **Vendor `yaml`, or switch `docs/drive/` to JSON.** Rejected: vendoring is hand-updated code; JSON loses the comments that document `project.yml`.
- **A README listing the wiring to add by hand.** Rejected: a skipped step leaves the guard unenforced.
- **Catalogs only, or the agent classifying every skill.** Rejected: the first leaves unknown skills unbound; the second makes the common case non-deterministic.
- **A version in a `package.json`, or the lock hash.** Rejected: harnesses read the frontmatter, and a hash cannot say which migration to run.
- **One grilling-format file copied into each project.** Rejected: improvements to the shape would never reach consumers.
- **A three-OS CI matrix now.** Rejected: no consumer runs Windows; promoting it is a later Fortify ticket.

## Consequences

- A new repo needs one install and one `/drive`; rerunning setup after `npx skills update` migrates it.
- Every migration is code with a test, so a release that changes `docs/drive/` costs a migration.
- pstack ships as a plugin, not through `skills-lock.json`, so the scan must read plugin folders, and their layout can change under drive.
- Enforcement: tests cover `--scan` against fixture repos, `--apply` idempotence, preflight failures, each migration and the lock; markdown-harness covers `grilling.md`; whether the Orchestrator applies the grilling format is checked by review only.
