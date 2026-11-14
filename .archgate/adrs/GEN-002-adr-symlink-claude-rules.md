---
type: adr
id: GEN-002
title: 'ADR Symlink for Claude Code Rules'
domain: general
rules: true
files: ['.archgate/adrs/**/*.md', '.claude/rules/**/*.md', 'AGENTS.md', 'CLAUDE.md']
paths: ['.archgate/adrs/**/*.md']
description: 'Runtime instructions have one canonical source: one .claude/rules symlink per scoped ADR, no orphans, and root CLAUDE.md pointing to AGENTS.md.'
---

# ADR Symlink for Claude Code Rules

## Context

A commit-time check rejects work already written. Loading the governing ADR into agent context _before_ the code is written moves the same constraint onto the authoring path, where obeying it costs nothing. Claude Code's `.claude/rules/` carries that channel: a rule file declaring `paths:` loads on Read of any matching file.

Rejected: a generator copying each ADR body into `.claude/rules/`. A symlink needs no build step and can't go stale.

## Decision

### 1. One symlink per scoped ADR (📜 Rule: `adr-claude-rules-symlink`)

1. An ADR with a non-empty `paths:` MUST have `.claude/rules/<basename-lowercased>.md` resolving to it — `gen-002-adr-symlink-claude-rules.md → ../../.archgate/adrs/GEN-002-adr-symlink-claude-rules.md`.
2. An ADR with empty or absent `paths:` MUST NOT have one.
3. Every ADR-named entry MUST have a backing ADR with a non-empty `paths:`. Hand-written, non-ADR-named rule files are left alone.
4. The entry MUST be a symlink, never a copied body.
5. Always-on scope is `paths: ['**/*']`; every entry declares its scope.

### 2. Scope of the channel

1. `files:` spans both the ADRs and `.claude/rules/`, because an orphan is only visible from the runtime side; `paths:` steers only the ADR author. Check broad, steer narrow.
2. The channel steers; it gates nothing. `archgate check` stays authoritative.

### 3. Root instructions (📜 Rule: `claude-agents-entry`)

1. Root `CLAUDE.md` MUST be a symlink to `AGENTS.md`; a copied body or another target is forbidden.
2. Both harnesses MUST read the same canonical instructions.

## Do's and Don'ts

### Do's

1. **DO** give every ADR with a non-empty `paths:` its lowercased symlink in `.claude/rules/`. (Decision 1, 📜 Rule: `adr-claude-rules-symlink`)
2. **DO** create the entry with `ln -s`, never `cp`. (Decision 1)
3. **DO** write always-on scope as `paths: ['**/*']` rather than omitting `paths`. (Decision 1)
4. **DO** remove the entry in the change that deletes its ADR or drops its `paths:`. (Decision 1)
5. **DO** edit the ADR, never the runtime entry. (Decision 1)
6. **DO** keep root `CLAUDE.md → AGENTS.md`. (Decision 3, 📜 Rule: `claude-agents-entry`)

### Don'ts

1. **DON'T** attach an entry to an ADR without `paths:`. (Decision 1)
2. **DON'T** leave an orphaned ADR-named entry. (Decision 1)
3. **DON'T** copy an ADR body into `.claude/rules/` — a copy freezes while every check stays green. (Decision 1)
4. **DON'T** treat the channel as a gate. (Decision 2)
5. **DON'T** maintain a second root instruction body. (Decision 3)

## Consequences

**Positive:**

1. **Just-in-time steering:** the ADR reaches context when a governed file opens, before the commit check can reject.
2. **No build step:** a symlink can't drift from its target.
3. **Orphans caught:** an entry outliving its ADR fails the check.

**Negative:**

1. **Two verification layers:** RuleContext exposes entry names and resolved content, not link identity; filesystem verification checks symlinks and their targets.
2. **Content equality is insufficient:** a frozen copy can match today; the symlink check must reject it.
3. **Upkeep:** one entry per scoped ADR to keep in sync.

**Risks:**

1. **Windows symlinks:** default git (`core.symlinks=false`) checks entries out as plain files. **Mitigation:** Developer Mode plus `git config core.symlinks true` and re-checkout.
2. **Loader drift:** `.claude/rules` is a versioned harness feature. **Mitigation:** verify the runtime channel against the harness documentation.

## Compliance and Enforcement

1. **Rule** `adr-claude-rules-symlink` (archgate, error): §1.1–§1.3, across both directories.
2. **Rule** `claude-agents-entry` (archgate, error): root instructions are readable and identical (§3).
3. **Filesystem verification:** each runtime entry is a symlink to its own ADR, and root `CLAUDE.md` points exactly to `AGENTS.md`.

**Manual review duties:** each entry is a symlink resolving to its canonical source; an ADR deletion or dropped `paths:` removes its entry in the same change.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Claude Code — `.claude/rules` path-scoped rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/) — `paths:`, glob matching on Read, symlink support.
- [archgate](https://archgate.dev/) — `files:` scoping and the rule model.
