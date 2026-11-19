---
type: decision-record
title: Drive learnings are records and failure modes
status: accepted
---

# Drive learnings are records and failure modes

The Operator approved this on 2026-11-19, in the drive-fortify-sweep Workflow. In the five Workflows before it he skipped Fortify every time, usually just before a deadline. The 34 failure modes stayed in one `docs/drive/learnings.md` file, and three Fortify PRs that appended to it conflicted with each other and with main (hancrafted/content-library#774, hancrafted/content-library#776, hancrafted/content-library#777). Recurrence counts were typed by hand and went stale: a push check marked fixed by hancrafted/content-library#740 broke again, and nobody noticed. Monitor sessions read 10 MB transcripts by hand and edited the drive branch directly. This record amends 0002, _One Decision gate, then the run is unattended_, §7. Moved from content-library Decision record 0030 (0004). Terms: [Drive glossary](../../skills/drive/GLOSSARY.md).

## Decisions

1. **Records cite failure modes; counts are computed.**
   - Each Workflow writes one append-only record, `docs/drive/learnings/records/<date>-<topic>.md`.
   - Each H2 in a record names a failure-mode file, `docs/drive/learnings/failure-modes/<slug>.md`. That file holds the title, the Enforcer and the status (`proposed`, `ticket`, `fixed` or `wontfix`), but no count.
   - `drive learnings` counts the records that cite each failure mode. It reports a failure mode as **regressed** when a record dated after its `fixed-by` cites it.
2. **The skill governs the format.** The drive skill ships a markdown-harness config for the front matter and body template of both kinds of file. The intent fields in that config steer an agent toward writing files ready for Fortify. The check fails in three cases:
   - A record cites a failure mode that has no file.
   - A change recreates the single `learnings.md`.
   - A record that cites a fixed failure mode does not say it regressed.
3. **Duplicates are found before a new failure mode is created.** `drive learnings similar "<failure>"` ranks the closest titles. The writer cites an existing failure mode where one fits.
4. **The record ships with the work.** It is written at the end of Verify, as the last commit on the Integration branch, so no separate learnings PR exists.
5. **Fortify is one explicit question.** After the merge the Orchestrator asks "Fortify now or skip?".
   - A skip writes `fortify: skipped` and the reason into the record, and the Workflow ends.
   - Only a yes builds the top-tier `/to-review` page, and adds corrections made after the merge on a branch from the base branch.
6. **Transcripts are the log; the CLI indexes them.**
   - Every `drive` command appends a JSONL event to `.scratch/<topic>/drive.log.jsonl`.
   - One async SubagentStart/SubagentStop hook links each Subagent's transcript to the topic.
   - `drive transcript` prints only the signal: the Operator's messages, the Orchestrator's questions, tool errors and interrupts.
7. **Monitoring is the default, with a live mode as an option.**
   - The Verify record step runs `drive transcript` over the Orchestrator's own session.
   - `/drive monitor <session>` watches a session live. It starts on the default watch rules and asks for calibration without blocking.
   - It writes only to `.scratch/<topic>/monitor.md`, never to a branch.

## Considered options

- **One file per failure mode with a typed count.** Rejected: two Workflows that raise the same count conflict.
- **`merge=union` on the single file.** Rejected: a union merge silently keeps both the old and the new count.
- **One file per session that holds its own counts.** Rejected: its counts go stale as soon as another session writes, and every Fortify would have to reread every file.
- **Silence as a skip after 24 hours, or picks carried into the next Workflow's gate.** Rejected: skipping must be an explicit decision, and the next Workflow should not inherit leftovers.
- **A hook on every tool call.** Rejected: it duplicates the transcript and spawns one process per call across parallel Subagents.
- **A shared run log with new-episode's adapter.** Rejected: it would couple a portable skill to `src/pipeline`.

## Consequences

- Parallel Workflows never write the same file, so learnings never conflict.
- A skip costs one answer, and the learnings are still recorded.
- Sessions that still run the old skill and write `learnings.md` fail the docs check once, and must migrate.
- Monitoring a Claude Code session is mechanical. Another provider's sessions need their own transcript adapter.
- Enforcement:
  - markdown-harness checks the format and the citations.
  - `drive learnings` tests cover the counts, regressions and similarity.
  - `drive transcript` is tested against a fixture from a real session.
  - Writing the record at Verify and asking the Fortify question are left to review.
