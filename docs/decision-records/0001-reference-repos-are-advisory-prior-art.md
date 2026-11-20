---
type: decision-record
title: Reference repos are advisory prior art, pinned and cached
status: accepted
---

# Reference repos are advisory prior art, pinned and cached

The Operator approved this on 2026-11-20, in the reference-repos grill. Three public repos hold most of the practice this repo learns from: `addyosmani/agent-skills`, `mattpocock/skills` and `cursor/plugins` (its `pstack/` folder only). Until now agents reached them ad hoc, with shallow clones in a session scratchpad that vanished with the session, and cited nothing anyone could re-check. The index is [`docs/agents/reference-repos.md`](../agents/reference-repos.md).

## Decisions

1. **Advisory prior art.** The reference repos sharpen options and recommendations; they never decide. When one disagrees with a Decision record, an Archgate ADR or `writing-for-agents`, the local document wins, and the agent surfaces the disagreement rather than following the repo.
2. **Repo-only.** Only this repo's agents use them. No shipped skill names a reference repo, so consumers carry no context load for it.
3. **Three layers: pointer, index, source.** One `AGENTS.md` line is the pointer: before recommending an answer on how this repo builds, evals, governs, tests or ships skills, or on a skill's content, check the index and cite what you used. The index maps each lifecycle area and each skill topic to the repo strongest at it and the paths to open. The source is a local cache, read with grep, never summarised into a digest.
4. **Pinned.** Each repo's URL, subfolder and commit live in the index's front matter. Pins move only on purpose, with `npm run refs -- --bump`, and the map is updated in the same commit. Citations outside the index read `name@sha7:path`, so any claim can be re-checked at the commit it was made against.
5. **Cached once per clone.** `npm run refs` shallow-sparse-clones each pin into `.references/<name>/` in the main checkout (gitignored) and symlinks `.references` into the current worktree. An agent that finds no cache runs it; offline, it reads the pinned commit through `gh api` and says so.
6. **One source per repo.** mattpocock's skills vendored in `.agents/skills/` are installed tools, not reference material; the cache is the copy agents cite.

## Considered options

- **Live fetch every time (`gh api`, raw URLs).** Rejected as the default: slow, rate-limited, and not searchable. Kept as the offline fallback.
- **Git submodules.** Rejected: committed weight, and they clash with worktrees and the `npx skills` installer.
- **Vendored copies.** Rejected: they go stale silently and bloat the repo.
- **Digests of each repo's practices.** Rejected: they duplicate the source and go stale; the index names paths instead.
- **The repos as default best practice.** Rejected: the Operator keeps the decisions; evidence feeds them.
- **A scheduled bump.** Rejected: a stale pin costs freshness, never correctness, because every citation names its commit.

## Consequences

- Grills and drive's Define and Reason phases gain checkable evidence for one `AGENTS.md` line of context load.
- A bump is a reviewable diff: pins and map move together.
- Enforcement: `npm run refs -- --check` (every index path exists at its pin) runs at bump and in pre-push when the index changes; the `refs` script's slow test runs on a local bare-repo fixture, since `ARCH-003-testing` forbids remote network in tests. Whether the pointer fires is checked by a dogfood grill, not mechanically.
