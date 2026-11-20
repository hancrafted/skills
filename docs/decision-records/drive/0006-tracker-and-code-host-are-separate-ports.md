---
type: decision-record
title: Tracker and code host are separate ports
status: accepted
---

# Tracker and code host are separate ports

The Operator approved this on 2026-11-19, in the drive-to-skills grill. Drive assumed GitHub for both tickets and pull requests. Repos it should run in keep tickets in Jira through MCP, in GitLab, or as local markdown, and some push to GitHub while tracking in Jira. Terms: [Drive glossary](../../../skills/drive/GLOSSARY.md).

## Decisions

1. **Two ports in `project.yml`.**
   - `tracker`: where the spec and tickets live, `github`, `gitlab`, `jira-mcp`, `local` or `prose`. Setup reuses `docs/agents/issue-tracker.md` when it exists, and the Reason skills follow it.
   - `host`: where branches are pushed and PRs open, `github`, `gitlab` or `none`.
2. **The CLI speaks GitHub.** `drive push`, `drive pr watch` and `drive pr ready` call `gh`. On GitLab the Orchestrator follows prose in `references/` and uses `glab` itself; there is no host interface in code.
3. **No code host, no PR.** With `host: none` the Decision gate is the Operator's approval in the conversation, and Verify ends at a local merge with the checks green.

## Considered options

- **One port, the tracker implying the host.** Rejected: Jira tickets with GitHub PRs, a common mix, cannot be expressed.
- **A `Host` interface with GitHub and GitLab adapters.** Rejected for now by the Operator: GitLab has no consumer yet, and prose is enough until one arrives.

## Consequences

- On GitLab the gate watch is not mechanical: the Orchestrator polls with `glab` by prose, so a missed comment is possible until a GitLab adapter exists.
- The tracker can change without touching the CLI.
- Enforcement: tests cover the `project.yml` schema and the `host: none` paths of `push` and `pr`; tracker use is checked by review only.
