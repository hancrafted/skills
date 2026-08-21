---
name: commit
description: Author a commit message and commit it — Conventional Commits header, Keep a Changelog body, Source trailer, enforced by a commit-time husky gate if setup (--setup-husky). Use before every `git commit`, whether a human or an agent initiates it, including a run split across commits.
---

Author a commit by running the steps in order. With `--setup-husky`, wire the husky commit-msg hook
into this repository instead, and stop.

## Authoring a commit

Run the steps in order. A split run repeats steps 2 to 6 once per commit.

**1. Read the argument.** It names the staging sets and the commit count —
`/commit stage /folder1 and /folder3 into 2 commits`. A bare `/commit` means you
decide both. An argument overrides a pre-existing index, being the more explicit
of the two signals.
_Done when_ you can state the staging set of every commit you are about to make.

**2. Read the change.** `git status`, `git diff --staged`, `git diff`. A
non-empty index is expressed intent: honour it. An empty index you fill
yourself. Changes outside the staging sets stay uncommitted and get reported,
rather than swept into the last commit. Report unstaged changes either way:
pre-commit verification judges the working tree and not the staged snapshot, so
a half-finished file that is _not_ in this commit can still fail it.
_Done when_ the index holds exactly this commit's set, and you hold the list of
what you left out.

**3. Resolve `Source:`.** Search the prompt, then the conversation context, then
the worktree or branch name — in that order.

| Invocation           | Nothing found                                               |
| -------------------- | ----------------------------------------------------------- |
| `/commit`            | **Ask.** Nothing in the run says what caused the change.    |
| `/commit <argument>` | **Never ask.** The prompt itself becomes the prose summary. |

A hint taken from the worktree or branch name is usable only once **expanded to
a full canonical reference**: `feature/78-commit-skill` yields `78`, which you
expand using this repository's own tracker documentation plus the git remote.
Where mechanical expansion is not possible, drop the hint and keep searching. A
change with no ticket at all is a normal case rather than an error to escalate —
a prose summary of the prompt is a valid value.
_Done when_ you hold a canonical reference, a prose summary, or both.

**4. Author the message, and write it to a file.** Satisfy the three conditions
below. Repeated `-m` flags lose the blank line the trailer block needs, so the
message goes in a file.
_Done when_ the file's last paragraph is the trailer block, preceded by a blank
line.

**5. Commit with `git commit -F <file>`, letting every hook run.** The
repository's hooks are the gate, so run no verification of your own. In a
harness repository `verify:commit` runs at pre-commit; a standalone repository
has no such script at all; either way the rule is the same — rely on the hooks
the repository has. **Never pass `--no-verify`.**
_Done when_ git reports the commit, or names the condition that failed.

**6. On rejection, repair the named cause and retry the same file.** A rejection
names a condition, not a wording problem, so fix that condition in place and
re-run the same command.
_Done when_ the commit exists and
`git log -1 --format='%(trailers:key=Source,valueonly)'` prints a non-empty
value.

**7. Report, and stop.** The commit stays in the local clone: **pushing is the
human's act**, and it is where a local mistake becomes permanent.
_Done when_ every commit made and every change left uncommitted is named in the
report.

There is no approval stop anywhere in this run. The commit is local and
reversible, so `git reset` and `git commit --amend` are the review mechanism,
and the human reviews a real commit with `git show` rather than a proposal.

## The contract — three blocking conditions

The gate is `scripts/commit-msg`. It reads the proposed message and exits 0 or 1.

**1. Header.** `type(scope)!?: subject` on line 1, then a blank line 2.

- `type` is one of eleven: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`,
  `test`, `perf`, `build`, `ci`, `revert`.
- `scope` is optional and freeform. Keep changes scoped to one domain.
- `subject` is present tense, and otherwise unconstrained — no length, mood, or
  trailing-period rule.
- `!` is tolerated and carries no meaning.

**2. Body shape.** At least one `### <category>` heading at H3, drawn from Keep a
Changelog v1.1.0's six — `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
`Security` — each followed by at least one numbered item (`1. `).

- The set is closed, so headings outside those six are rejected and the body
  stays machine-readable.
- Prose paragraphs are allowed anywhere. Explain the **why** and the **how** —
  the diff already carries the what.
- The gate checks the _shape_ of numbering, never the sequence. Number correctly
  anyway; that is your job, not the gate's.

**3. `Source:` trailer.** At least one non-empty `Source:` **git trailer**, so
every commit's cause is retrievable with one command:

```sh
git log --format='%(trailers:key=Source,valueonly)'
```

- Value is `<canonical ref> | <prompt summary>`. Either part alone is valid.
- The canonical reference resolves without context — a full URL for a hosted
  tracker (`https://github.com/hancrafted/skills/issues/2`), a
  repository-relative path for a local one (`docs/specs/0001-commit-gate.md`).
  Where this repository's own tracker documentation states a citation form,
  follow it. A reference that needs the reader to already know the repository —
  `#123`, `78`, `GH-78` — is not canonical, and the gate catches only `#123`.
- It must be a real trailer, which means the **last paragraph**, preceded by a
  blank line. A `Source:` line placed directly under a numbered item is not a
  trailer, and neither is one followed by another prose paragraph — both look
  fine to a human and return nothing to `git log`.
- Repeats are allowed when a change has more than one cause.

**Provenance is `Source:` alone.** Agent harnesses append a `Co-Authored-By`
naming the model by default, so strip it — and any "generated with" line —
before committing. A human co-author's `Co-Authored-By` is fine; it is part of
the same trailer block. The gate does not check this, because detecting model
names and vendor domains is brittle and stale on every release. It is your job.

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

_Done when_ the script reports success, and `.husky/commit-msg` is staged for the
user to commit.

## Installing this skill

```sh
npx skills add hancrafted/skills
```

Project scope — the default — because it is meant to be committed, and that is
what lets the hook run for every clone and in CI. **Never `--copy`**: copy mode
creates independent per-agent copies and destroys the single canonical path the
hook depends on.
