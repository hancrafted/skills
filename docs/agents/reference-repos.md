---
repos:
  agent-skills:
    url: https://github.com/addyosmani/agent-skills
    commit: 8c99fa36d90068c82d547f7c12a9d67a3e95f4ee
  mattpocock-skills:
    url: https://github.com/mattpocock/skills
    commit: abeeaf95660ba9e8b7c753eb38f441ca707a8823
  cursor-plugins:
    url: https://github.com/cursor/plugins
    subfolder: pstack
    commit: aaeb0ea3a0584995aa8f55ce44c6c5259414b896
---

# Reference repos

Advisory prior art: these repos sharpen options and recommendations and never decide. A Decision record, an Archgate ADR or `writing-for-agents` wins any disagreement; surface the disagreement. See [the decision record](../decision-records/0001-reference-repos-are-advisory-prior-art.md). Pins live in the front matter above.

## Use

1. A repo's cache is present when `.references/<name>/.git` exists; run `npm run refs` when it does not. It fills the cache and symlinks `.references` into the worktree.
2. Offline: `gh api -H 'Accept: application/vnd.github.raw' 'repos/<owner>/<repo>/contents/<path>?ref=<sha>'` reads the pinned file (`<path>` includes `pstack/` for cursor-plugins); say you did.
3. Search with the path set to `.references/<name>` (Glob, Grep): a search from the repo root skips `.references` (gitignored symlink), and an empty root result does not mean the cache is missing.
4. Start from the paths below; grep the cache for anything else.
5. Cite as `name@sha7:path` (name from the front matter, first 7 characters of its commit), for example `agent-skills@<sha7>:scripts/lib/skill-lint.js`.
6. Move pins only with `npm run refs -- --bump`, then fix the paths below by hand in the same commit. Hand edits any time are fine: `npm run refs -- --check` (pre-push) verifies every `.references/<name>/<path>` below.

Repos: `agent-skills` (addyosmani), `mattpocock-skills` (mattpocock), `cursor-plugins` (cursor/plugins, `pstack/` only).

## Harness

### Write (author a skill)

Strongest: `agent-skills` for the required anatomy; `mattpocock-skills` for a small, composable catalog; `cursor-plugins` for deleting prose.

- `.references/agent-skills/docs/skill-anatomy.md`
- `.references/agent-skills/CONTRIBUTING.md`
- `.references/mattpocock-skills/skills/productivity/writing-for-agents/SKILL.md`
- `.references/mattpocock-skills/skills/productivity/writing-for-agents/SKILL-MECHANICS.md`
- `.references/cursor-plugins/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md`
- `.references/cursor-plugins/pstack/skills/principle-minimize-reader-load/SKILL.md`

### Eval (does a skill work)

Strongest: `agent-skills`, with three tiers (structural, trigger ranking, behavioral). `cursor-plugins` for blinded manual experiments.

- `.references/agent-skills/evals/README.md`
- `.references/agent-skills/scripts/run-evals.js`
- `.references/agent-skills/evals/skill-impact.md`
- `.references/cursor-plugins/pstack/skills/poteto-mode/playbooks/eval.md`
- `.references/cursor-plugins/pstack/skills/arena/SKILL.md`

### Govern (lint, scope, drift)

Strongest: `agent-skills` for skill lint and link checks; `mattpocock-skills` for installer-parity frontmatter checks and written scope limits.

- `.references/agent-skills/scripts/lib/skill-lint.js`
- `.references/agent-skills/scripts/validate-skills.js`
- `.references/agent-skills/scripts/validate-reference-links.js`
- `.references/mattpocock-skills/scripts/check-frontmatter.mjs`
- `.references/mattpocock-skills/.out-of-scope/new-skills.md`
- `.references/mattpocock-skills/SCOPE.md`

### Test (tests for a skill's scripts and hooks)

Strongest: `agent-skills` for script tests beside each script and hook test suites; `cursor-plugins` for tests inside a skill's `scripts/`.

- `.references/agent-skills/scripts/lib/skill-lint-test.js`
- `.references/agent-skills/hooks/session-start-test.sh`
- `.references/agent-skills/hooks/sdd-cache-test.sh`
- `.references/cursor-plugins/pstack/skills/statechart/scripts/test/config-fuzz.test.ts`
- `.references/cursor-plugins/pstack/skills/statechart/scripts/test/differential.test.ts`

### Ship (manifests, versions, release, install)

Strongest: `mattpocock-skills` for changesets releases and plugin version sync; `agent-skills` for a real install test in CI and multi-host manifests.

- `.references/mattpocock-skills/.github/workflows/release.yml`
- `.references/mattpocock-skills/scripts/sync-plugin-version.mjs`
- `.references/mattpocock-skills/.claude-plugin/plugin.json`
- `.references/agent-skills/.github/workflows/test-plugin-install.yml`
- `.references/agent-skills/scripts/validate-versions.js`
- `.references/agent-skills/.claude-plugin/marketplace.json`
- `.references/cursor-plugins/pstack/.cursor-plugin/plugin.json`

## Skill content

Topic, then the paths to open.

- Grilling, interviewing:
  - `.references/mattpocock-skills/skills/productivity/grilling/SKILL.md`
  - `.references/mattpocock-skills/skills/engineering/grill-with-docs/SKILL.md`
- Spec and ticket breakdown:
  - `.references/mattpocock-skills/skills/engineering/to-spec/SKILL.md`
  - `.references/mattpocock-skills/skills/engineering/to-tickets/SKILL.md`
- Mapping big work, orchestration:
  - `.references/mattpocock-skills/skills/engineering/wayfinder/SKILL.md`
  - `.references/agent-skills/references/orchestration-patterns.md`
- Implementing:
  - `.references/mattpocock-skills/skills/engineering/implement/SKILL.md`
  - `.references/mattpocock-skills/skills/engineering/implement-spec/SKILL.md`
- TDD:
  - `.references/mattpocock-skills/skills/engineering/tdd/SKILL.md`
  - `.references/agent-skills/skills/test-driven-development/SKILL.md`
- Debugging:
  - `.references/mattpocock-skills/skills/engineering/diagnosing-bugs/SKILL.md`
  - `.references/agent-skills/skills/debugging-and-error-recovery/SKILL.md`
- Code review:
  - `.references/mattpocock-skills/skills/engineering/code-review/SKILL.md`
  - `.references/agent-skills/skills/code-review-and-quality/SKILL.md`
- Architecture, module design:
  - `.references/mattpocock-skills/skills/engineering/codebase-design/SKILL.md`
  - `.references/mattpocock-skills/skills/engineering/improve-codebase-architecture/SKILL.md`
- Domain language, ADRs:
  - `.references/mattpocock-skills/skills/engineering/domain-modeling/SKILL.md`
  - `.references/agent-skills/skills/documentation-and-adrs/SKILL.md`
- PRs, git, shipping:
  - `.references/mattpocock-skills/skills/engineering/pr/SKILL.md`
  - `.references/agent-skills/skills/git-workflow-and-versioning/SKILL.md`
- Research:
  - `.references/mattpocock-skills/skills/engineering/research/SKILL.md`
  - `.references/agent-skills/skills/source-driven-development/SKILL.md`
- Handoff, context management:
  - `.references/mattpocock-skills/skills/productivity/handoff/SKILL.md`
  - `.references/agent-skills/skills/context-engineering/SKILL.md`
- Verification skills, principles:
  - `.references/cursor-plugins/pstack/skills/create-verification-skill/SKILL.md`
  - `.references/cursor-plugins/pstack/skills/principle-prove-it-works/SKILL.md`
