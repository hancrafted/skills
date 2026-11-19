import { describe, expect, it } from 'vitest';
import { guardViolations, isDecisionBranch, parseGuardArgs } from './guard.pure.ts';
const GLOBS = ['docs/decision-records/**', 'docs/features/**', '**/GLOSSARY*.md'];

describe('success cases', () => {
  it('passes a glossary change on a decisions/* branch', () => {
    // ARRANGE
    const changed = ['docs/GLOSSARY.md'];
    // ACT
    const violations = guardViolations('decisions/drive', changed, GLOBS);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('ignores changes outside the Decision docs on any branch', () => {
    // ARRANGE
    const changed = ['src/app.ts', 'docs/agents/worktrees.md', 'docs/adrx.md'];
    // ACT
    const violations = guardViolations('feat/x', changed, GLOBS);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('names the file and the rule for each Decision doc changed elsewhere', () => {
    // ARRANGE
    const changed = ['GLOSSARY.md', 'docs/decision-records/0001-x.md', 'docs/features/a/b.md', 'src/a.ts'];
    // ACT
    const violations = guardViolations('feat/x', changed, GLOBS);
    // ASSERT
    expect(violations).toEqual([
      "GLOSSARY.md is a Decision doc (decisionDocs: **/GLOSSARY*.md); it changes only on a decisions/<topic> branch, this is 'feat/x'",
      "docs/decision-records/0001-x.md is a Decision doc (decisionDocs: docs/decision-records/**); it changes only on a decisions/<topic> branch, this is 'feat/x'",
      "docs/features/a/b.md is a Decision doc (decisionDocs: docs/features/**); it changes only on a decisions/<topic> branch, this is 'feat/x'",
    ]);
  });
});

describe('failure cases', () => {
  it('reads --against with a ref and rejects anything else', () => {
    // ARRANGE
    const argvs = [[], ['--against', 'origin/main'], ['--against'], ['--against', '--x'], ['origin/main']];
    // ACT
    const results = argvs.map(parseGuardArgs);
    // ASSERT
    expect(results).toEqual([
      { against: null },
      { against: 'origin/main' },
      { error: 'usage: drive guard [--against <ref>]' },
      { error: 'usage: drive guard [--against <ref>]' },
      { error: 'usage: drive guard [--against <ref>]' },
    ]);
  });
});

describe('edge cases', () => {
  it('admits decisions/<topic> and its subagent branches but not a bare decisions', () => {
    // ARRANGE
    const branches = ['decisions/drive', 'decisions/drive--1-term', 'decisions/', 'decisions', 'feat/decisions/x'];
    // ACT
    const results = branches.map(isDecisionBranch);
    // ASSERT
    expect(results).toEqual([true, true, false, false, false]);
  });

  it('guards nothing when the config names no Decision docs', () => {
    // ARRANGE
    const changed = ['GLOSSARY.md'];
    // ACT
    const violations = guardViolations('feat/x', changed, []);
    // ASSERT
    expect(violations).toEqual([]);
  });
});
