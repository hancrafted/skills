# The Intent step

The first step of Define: the Operator's approved why, in the problem space, before any spec. The **Intent** entry in [GLOSSARY.md](../GLOSSARY.md) defines the words; this file is how to run them.

- [Start](#start)
- [Each turn](#each-turn)
- [Read-back and approval](#read-back-and-approval)
- [Grill first](#grill-first)
- [After approval](#after-approval)
- [A changed intent](#a-changed-intent)
- [The record's Intent section](#the-records-intent-section)

## Start

The step always runs, scaled: when the request already answers most fields, it is the read-back plus questions on the missing ones.

1. Analyse the Operator's first prompt and print a first `INTENT:` pitch: at most a couple of plain lines on who really uses the result, what impact it should have and why now.
2. Ask which order: refine the intent first (intent first), or start the requirements grill (grill first). Either way no Reason work starts without an approved Intent statement.
3. Write `Mode: intent-first` or `Mode: grill-first` as a line of its own at the top of `decisions.md`. `drive status` reads it; without it the next stop is "mode missing".

## Each turn

Not a grill: no options, no recommendation, no examples to pick from. Each turn is one open question, then the updated `INTENT:` pitch. The Operator answers, edits the pitch directly, or both.

- Stay in the problem space. Do not ask about or write solution detail; the grill takes it.
- Ask about what the pitch still leaves open (user, impact, why now, success, limits).
- Log each answer in `decisions.md` as it comes.
- Repeat until the Operator approves the pitch or gives up.

**Giving up.** Stop the Workflow: no grill, no spec. Write `### Intent statement (unconfirmed)` in `decisions.md` with the latest pitch and the open points, and tell the Operator.

## Read-back and approval

Once the pitch settles, write the eight fields once, from the pitch and the answers: Outcome, User, Why now, Success, Constraint, Out of scope, Appetite, Tradeoff order. Appetite is a feel for size; never check, count or limit by it. Read the statement back and ask for explicit approval. Silence or "ok" to a different question is not approval.

On approval, write it to `decisions.md` as `### Intent statement (confirmed <date>)`, the pitch first, then the fields. `drive status` reads that heading. It heads the spec's `## Intent` section and the shared brief ([dispatch.md](dispatch.md) "The shared brief").

## Grill first

1. Run the requirements grill with the grill format. Its opening lines use the first pitch as an unapproved working draft.
2. After the grill, draft the pitch from its decisions (most of it should be there) and sharpen it turn by turn as above, then read back the statement and get approval.
3. Recheck every grill decision against the approved statement and mark each: kept as a deliberate bet, dropped, or grilled again. Log the marks in `decisions.md`.
4. Reason starts only after step 3.

## After approval

- The statement replaces the grill format's two opening lines. Judge each later question against it: one that would widen, cut or change the scope says so, and the Operator decides it as a bet.
- Each ticket names the part of the intent it serves. A ticket serving two separate outcomes splits; one serving none is cut or logged in `decisions.md` as a deliberate bet.
- Before Implement, every agent (you and each Subagent) checks its actions against the statement and raises a drift concern to the Operator.
- From Implement on, nobody interrupts the Operator: every agent records drift or contradiction as an `Intent:` line in its report ([dispatch.md](dispatch.md) "The report"; [review.md](review.md)), and you gather them under `## Intent drift` in the Integration PR's body.
- Do not judge whether a scope change is good: it is a bet, stated and recorded.

## A changed intent

The Operator may change the intent in any phase. Go back to the Intent step on the same Integration branch and reuse existing artifacts only where they match the new intent.

After Implement started:

1. Running Subagents finish and merge; dispatch nothing new.
2. Add a dated "changed" note to the spec's Intent section and a new statement to `decisions.md`.
3. Recheck every ticket and merged task against the new statement: keep, change or revert it, with the reason in `decisions.md`.
4. A new Decision gate follows.

## The record's Intent section

The Workflow's record carries one `## Intent` section ([fortify.md](fortify.md) "The record"): turns, how far the pitch moved from first to last, confirmed or gave up, and the drift found later and whether it was real. Collect these from `decisions.md` as the Workflow runs.
