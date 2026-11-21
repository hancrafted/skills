# Monitor a session

`/drive monitor <session-id>` watches another session, usually a grill the Operator runs elsewhere, and records what it learns for Fortify. It writes only `.scratch/<topic>/monitor.md` and nothing in the repo; the `<topic>` is the watched Workflow's: take it from `drive status` run in the watched session's branch, or ask the Operator when no branch tells it.

1. **Start at once** on the default watch rules: Operator corrections, questions the Operator asks about a term, CI or PR state relayed in the session, tool failures and interrupts.
2. **Calibrate without blocking.** Ask the Operator in one message what else to watch or ignore; keep watching while the answer is pending, and apply it when it arrives.
3. **Loop.** On each tick run `drive transcript <session-id> --since-last`, which prints only what is new since the last run, and append each finding to `monitor.md` with the session's name, a time and the Operator's words verbatim.
4. **End** when the session ends or the Operator says stop. At Verify the record folds each finding in with `(source: monitor)`.

_Done when:_ the session ended or the Operator said stop, and `monitor.md` holds each finding with the session's name, a time and the Operator's words verbatim.
