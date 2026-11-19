# Drive profiles

Project rules that extend the Profiles the `/drive` skill ships: the architect's, which the Orchestrator reasons by,
and the implementer's, which every Subagent brief points at. Write only what is specific to this project.

## Architect

- Decision records `docs/decision-records/0001`-`0007` and the Archgate ADRs in `.archgate/adrs/` bind every design; read them before a Decision doc.
- `docs/decision-records/**` and `**/GLOSSARY*.md` change only on a `decisions/<topic>` branch.

## Implementer

- Verify with `npm run verify`, `npm run test:slow` and `npm run archgate:full`; commit with the `/commit` skill.
- Never edit installed skills (`.agents/skills/*` that are not symlinks into `skills/`).
