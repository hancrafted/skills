---
type: decision-record
title: Drive runs on four harnesses
status: accepted
---

# Drive runs on four harnesses

The Operator approved this on 2026-11-19, in the drive-to-skills grill. Drive was written for Claude Code: the Binding names a Claude agent type, the model tiers map to Claude models, and Decision record 0003's transcript index reads Claude transcripts. The Operator wants it to run on Claude Code, GitHub Copilot, Google Antigravity and OpenAI Codex. All four load Agent Skills from `.agents/skills` (Claude Code from `.claude/skills`) and run parallel subagents with a model each; their hooks, transcripts and notifications differ (research of 2026-11-19, partly from secondary sources). Terms: [Drive glossary](../../skills/drive/GLOSSARY.md).

## Decisions

1. **Support has two levels.**
   - **Core**, required on every supported harness: the skill loads, the Orchestrator dispatches Subagents with a model tier (or runs tickets in sequence where it cannot), and the `drive` CLI runs.
   - **Evidence**, where the harness exposes it: the SubagentStart hook, `drive transcript`, `/drive monitor` and the notify port. Elsewhere each reports "unsupported", and Fortify uses the records alone.
   - The README carries a matrix: harness against core, hook, transcript, monitor, notify.
2. **A repo lists its harnesses.** `project.yml` `harnesses:` holds an entry per harness, each with its `agentType` and its `models` (`mid`, `top`). The scan proposes the list from the repo (`.claude/`, `.github/agents` or `hooks`, `.codex/`, `.agents/hooks.json`); the Operator confirms it and the seeded model names. The Orchestrator names its own harness at the Entry check and uses that entry. The Binding stays harness-neutral.
3. **Mechanics in code, behaviour in prose.** A `Harness` interface in `scripts/harness/<name>.ts` holds hook wiring, transcript location and parsing, and the notify command, with tests. `references/harness/<name>.md` holds how that harness spawns a Subagent with a model, read at the Entry check.
4. **Delivery.** `2.0.0` ships Core for all four and Evidence for Claude Code. A later release adds Evidence for Copilot and Codex, each from a transcript captured in a real session as its test fixture. Antigravity has no subagent hooks; it gets transcripts when they are worth it, and its notify adapter is `none`.

## Considered options

- **Full parity on all four before `2.0.0`.** Rejected: Evidence depends on vendor APIs that are missing (Antigravity hooks) or unstable (Codex transcripts).
- **Core on all four, Evidence Claude-only by design.** Rejected: Copilot and Codex expose subagent hooks, so Fortify there can be mechanical too.
- **One harness per repo.** Rejected: a repo is often driven from several harnesses.
- **Everything in prose, or everything in code.** Rejected: transcript parsing feeds Fortify's counts and must be tested; how a model spawns a Subagent cannot be scripted.
- **Evidence fixtures written from the docs.** Rejected: `ARCH-003-testing` asks for real inputs, and the formats are partly undocumented.

## Consequences

- An Operator on Copilot, Codex or Antigravity gets the Workflow at `2.0.0`, but Fortify there runs from records only until the later release.
- Model names change faster than drive; they are seeded, not hard-coded, and the Operator owns them.
- Enforcement: tests per `Harness` adapter against real fixtures; the README matrix is checked by review; whether an Orchestrator names its harness is checked by review only.
