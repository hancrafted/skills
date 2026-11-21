# Drive profiles

Project rules that extend the Profiles the `/drive` skill ships: the architect's, which the Orchestrator reasons by,
and the implementer's, which every Subagent brief points at. Write only what is specific to this project.

## Architect

- Decision records in `docs/decision-records/drive/` (drive's, per `GLOSSARY-MAP.md`) and the Archgate ADRs in `.archgate/adrs/` bind every design; read them before a Decision doc.
- `docs/decision-records/**` and `**/GLOSSARY*.md` change only on a `decisions/<topic>` branch.

## Implementer

- Verify with `npm run verify`, `npm run test:slow` and `npm run archgate:full`; commit with the `/commit` skill.
- Never edit installed skills (`.agents/skills/*` that are not symlinks into `skills/`).

## Live or scheduled

- Pre-commit and pre-push gates: `verify:commit` on commit; `npm run verify` and the changed slow tests on pre-push.
- CI on pull requests.
- Installed skill copies in other repos: the consumers listed in `skills-lock.json`.
- Scheduled jobs: `nightly.yml` (daily 03:00 UTC, the slow lane) and `security.yml` (Mondays 03:00 UTC, the dependency, config and secret scan).
