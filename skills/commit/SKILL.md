---
name: commit
description: Author a commit message that git history can be mined from later — a Conventional Commits header, a Keep a Changelog body, and a Source trailer pointing back at the cause of the change. Carries a zero-dependency shell gate that enforces the contract at commit time, and a --setup-husky argument that wires that gate into a repository's git hooks. Use when the user wants to commit, asks for a commit message, or wants commit-message enforcement set up in a repository.
---

An AI agent is the primary author of commits in these repositories, so git history
is not a courtesy log — it is the main record a later agent or human mines to
answer "why did this change happen?". A documented convention is an instruction; a
gate is a guarantee. This skill carries both, in one directory, so the enforced
contract and the documented contract cannot disagree.

**`--setup-husky` is the only argument.** With it, wire the gate into this
repository's hooks and stop. Without it, author a commit.

## The contract — three blocking conditions

The gate is `scripts/commit-msg`. It reads the proposed message and exits 0 or 1.
Where this prose and that script differ, **the script is the contract**.

**1. Header.** `type(scope)!?: subject` on line 1, then a blank line 2.

- `type` is one of eleven: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`,
  `test`, `perf`, `build`, `ci`, `revert`.
- `scope` is optional and freeform. Keep changes scoped to one domain.
- `subject` is present tense, and otherwise unconstrained — no length, mood, or
  trailing-period rule.
- `!` is tolerated and carries no meaning. Do not use it to signal anything.

**2. Body shape.** At least one `### <category>` heading at H3, drawn from Keep a
Changelog v1.1.0's six — `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
`Security` — each followed by at least one numbered item (`1. `).

- Headings outside those six are rejected; the set is closed so the body stays
  machine-readable.
- Prose paragraphs are allowed anywhere. Explain the **why** and the **how**, not
  the what — the diff already carries the what.
- The gate checks the _shape_ of numbering, never the sequence. Number correctly
  anyway; that is your job, not the gate's.

**3. `Source:` trailer.** At least one non-empty `Source:` **git trailer**, so
every commit's cause is retrievable with one command:

```sh
git log --format='%(trailers:key=Source,valueonly)'
```

- Value is `<canonical ref> | <prompt summary>`. Either part alone is valid.
- Format the canonical reference the way **this repository's own tracker
  documentation** says to — a URL for a hosted tracker, a repository-relative path
  for a local one. The gate does not police the form, with one exception: a
  reference that is only a bare issue number is **rejected**, because `#123`
  resolves to nothing in a fork, a mirror, or a corpus. Expand it to a full URL.
- With no ticket, a prose summary of the prompt that caused the change is enough.
- It must be a real trailer, which means the **last paragraph**, preceded by a
  blank line. A `Source:` line placed directly under a numbered item is not a
  trailer, and neither is one followed by another prose paragraph — both look
  fine to a human and return nothing to `git log`. A following
  `Co-Authored-By:` is fine; it is part of the same trailer block.
- Repeats are allowed when a change has more than one cause.

**Never attribute the commit to an AI agent** — no `Co-Authored-By` for a model,
no "generated with" line. Provenance already lives in `Source:`. The gate does not
check this, because detecting model names and vendor domains is brittle and stale
on every release. It is your job.

### Two exemptions

1. **A local merge commit.** Detected by probing for an in-progress merge, not by
   matching a message beginning with "Merge" — so `feat: merge two resolvers` is
   still judged.
2. **`fixup!` and `squash!`**, so `--autosquash` keeps working.

There is no release carve-out. `git revert`, `git cherry-pick`, and merges made
through GitHub's UI never fire the hook at all, so they need no exemption.

## Authoring a commit

The authoring flow — how staging gets reviewed, what is automated versus confirmed
with the user — is **not specified yet**, and is deliberately not invented here.
[Issue #1](https://github.com/hancrafted/skills/issues/1) covers the gate and the
wiring only; the flow will be specified separately.

Until then, satisfy the contract above, and note two mechanics of doing so:

- **Write the message to a file and use `git commit -F <file>`.** The body's blank
  lines are load-bearing for the trailer and do not survive repeated `-m` flags
  reliably.
- **Never reach for `--no-verify`.** A rejection names the condition that failed
  and shows what you wrote; repair the message instead.

**Done when:** the commit exists and
`git log -1 --format='%(trailers:key=Source,valueonly)'` prints a non-empty value.

## `--setup-husky`

Run one script and report what it changed:

```sh
sh .agents/skills/commit/scripts/setup-husky
```

It installs husky if absent, writes `.husky/commit-msg` delegating to the gate,
sets `core.commentChar` so the body's `### ` headings survive git's own cleanup,
and is safe to run twice. It aborts with an explanation rather than a raw shell
error when the gate cannot be located — the likeliest cause is an install
performed with `--copy`.

Mechanics, the canonical hook body, the non-Node alternative, and troubleshooting
live in [`assets/setup-husky.md`](assets/setup-husky.md). Consult it when a step
surprises you.

**Done when:** the script reports success, and `.husky/commit-msg` is staged for
the user to commit.

## Installing this skill

```sh
npx skills add hancrafted/skills
```

Project scope — the default — because it is meant to be committed, and that is
what lets the hook run for every clone and in CI. **Never `--copy`**: copy mode
creates independent per-agent copies and destroys the single canonical path the
hook depends on.
