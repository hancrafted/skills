import { describe, expect, it } from 'vitest';
import { parseArgs, refuseNewBranch } from './args.pure.ts';
const INVOKE = 'npm run drive -- worktree';
const NAMING = { invoke: INVOKE, baseBranch: 'main' };
const newArgs = (argv: string[]) => {
  const args = parseArgs(['new', ...argv], INVOKE);
  if ('error' in args) throw new Error(args.error);
  return args;
};

describe('success cases', () => {
  it('reads a command and branch, based on origin/main by default', () => {
    // ARRANGE
    const argv = ['new', 'feat/12-thing'];
    const expected = {
      command: 'new',
      branch: 'feat/12-thing',
      base: null,
      kill: false,
      parent: null,
      issue: null,
    };
    // ACT
    const args = parseArgs(argv, INVOKE);
    // ASSERT
    expect(args).toEqual(expected);
  });

  it('reads a base branch given after the branch, as a job worktree of a Task passes it', () => {
    // ARRANGE
    const argv = ['done', 'feat/demo--write-research-x', '--base', 'feat/demo'];
    const expected = {
      command: 'done',
      branch: 'feat/demo--write-research-x',
      base: 'feat/demo',
      kill: false,
      parent: 'feat/demo',
      issue: null,
    };
    // ACT
    const args = parseArgs(argv, INVOKE);
    // ASSERT
    expect(args).toEqual(expected);
  });
  describe('subagent branches', () => {
    it('derives the parent from everything before the first -- and the issue number after it', () => {
      // ARRANGE
      const argv = ['new', 'feat/x--613-oxlint', '--base', 'feat/x'];
      const issue = 613;
      // ACT
      const args = parseArgs(argv, INVOKE);
      // ASSERT
      expect(args).toMatchObject({ parent: 'feat/x', issue });
    });
  });
  describe('--kill and sync', () => {
    it('reads --kill on done, and sync with no branch', () => {
      // ARRANGE
      const argvs = [['done', 'feat/x', '--kill'], ['sync'], ['sync', '--base', 'feat/y']];
      // ACT
      const parsed = argvs.map((argv) => parseArgs(argv, INVOKE));
      // ASSERT
      expect(parsed).toEqual([
        {
          command: 'done',
          branch: 'feat/x',
          base: null,
          kill: true,
          parent: null,
          issue: null,
        },
        {
          command: 'sync',
          branch: '',
          base: null,
          kill: false,
          parent: null,
          issue: null,
        },
        {
          command: 'sync',
          branch: '',
          base: 'feat/y',
          kill: false,
          parent: null,
          issue: null,
        },
      ]);
    });
  });
  describe('new on a subagent branch', () => {
    it('accepts an orchestrator branch, and a subagent branch on its existing parent', () => {
      // ARRANGE
      const cases = [
        newArgs(['feat/x']),
        newArgs(['feat/x--613-oxlint', '--base', 'feat/x']),
        newArgs(['feat/y--section-close', '--base', 'feat/y']),
        newArgs(['decisions/drive-glossary']),
        newArgs(['decisions/drive--3-term', '--base', 'decisions/drive']),
      ];
      // ACT
      const refusals = cases.map((args) => refuseNewBranch(args, () => true, NAMING));
      // ASSERT
      expect(refusals).toEqual([null, null, null, null, null]);
    });
  });
});

describe('failure cases', () => {
  describe('subagent branches', () => {
    it('refuses a -- with no task after it', () => {
      // ARRANGE
      const argv = ['new', 'feat/x--', '--base', 'feat/x'];
      // ACT
      const result = parseArgs(argv, INVOKE);
      // ASSERT
      expect(result).toEqual({
        error: "'feat/x--' needs <parent>--<task>: the parent before the first --, the task after it",
      });
    });
  });
  describe('--kill and sync', () => {
    it('refuses --kill outside done', () => {
      // ARRANGE
      const argv = ['new', 'feat/x', '--kill'];
      // ACT
      const result = parseArgs(argv, INVOKE);
      // ASSERT
      expect(result).toEqual({ error: '--kill belongs to done' });
    });
  });
  it('names the usage when the branch, the command or the base value is missing', () => {
    // ARRANGE
    const argvs = [['new'], ['new', '--base', 'main'], ['make', 'feat/x'], ['preflight'], ['new', 'feat/x', '--base']];
    const usage = `usage: ${INVOKE} new <branch> [--base <branch>]  |  ${INVOKE} done <branch> [--base <branch>] [--kill]  |  ${INVOKE} sync [--base <branch>]`;
    const expected = [
      usage,
      usage,
      "unknown command 'make'; expected new, done or sync",
      "unknown command 'preflight'; expected new, done or sync",
      '--base needs a branch name',
    ];
    // ACT
    const errors = argvs.map((argv) => parseArgs(argv, INVOKE));
    // ASSERT
    expect(errors).toEqual(expected.map((error) => ({ error })));
  });
  describe('new on a subagent branch', () => {
    it('refuses a missing parent and names the command that creates it', () => {
      // ARRANGE
      const args = newArgs(['feat/x--613-oxlint', '--base', 'feat/x']);
      // ACT
      const refusal = refuseNewBranch(args, () => false, NAMING);
      // ASSERT
      expect(refusal).toBe(
        "parent branch 'feat/x' does not exist; create it first: npm run drive -- worktree new feat/x, then rerun this command",
      );
    });

    it('refuses main as the parent and names an orchestrator branch to create instead', () => {
      // ARRANGE
      const args = newArgs(['main--613-oxlint', '--base', 'main']);
      // ACT
      const refusal = refuseNewBranch(args, () => true, NAMING);
      // ASSERT
      expect(refusal).toBe(
        'a subagent branch cannot hang off main; create its parent first: npm run drive -- worktree new <type>/<slug>, then npm run drive -- worktree new <type>/<slug>--613-oxlint --base <type>/<slug>',
      );
    });

    it('refuses a --base other than the parent, or none, and names the corrected command', () => {
      // ARRANGE
      const cases = [newArgs(['feat/x--613-oxlint', '--base', 'feat/y']), newArgs(['feat/x--613-oxlint'])];
      // ACT
      const refusals = cases.map((args) => refuseNewBranch(args, () => true, NAMING));
      // ASSERT
      const fix =
        "'feat/x--613-oxlint' starts from its parent; run: npm run drive -- worktree new feat/x--613-oxlint --base feat/x";
      expect(refusals).toEqual([fix, fix]);
    });
  });
});

describe('edge cases', () => {
  describe('subagent branches', () => {
    it('reads no issue number from a task without a ticket', () => {
      // ARRANGE
      const argv = ['new', 'feat/y--section-close', '--base', 'feat/y'];
      // ACT
      const args = parseArgs(argv, INVOKE);
      // ASSERT
      expect(args).toMatchObject({ parent: 'feat/y', issue: null });
    });

    it('reads no issue number from a task that only starts with digits, since only <digits>- names a ticket', () => {
      // ARRANGE
      const branches = ['feat/x--2fa-login', 'feat/x--2fa', 'feat/x--640'];
      // ACT
      const results = branches.map((branch) => parseArgs(['new', branch, '--base', 'feat/x'], INVOKE));
      // ASSERT
      expect(results).toEqual(results.map(() => expect.objectContaining({ parent: 'feat/x', issue: null })));
    });

    it('keeps a later -- in the task, since the parent ends at the first one', () => {
      // ARRANGE
      const argv = ['new', 'perf/a--640-b--c', '--base', 'perf/a'];
      const issue = 640;
      // ACT
      const args = parseArgs(argv, INVOKE);
      // ASSERT
      expect(args).toMatchObject({ parent: 'perf/a', issue });
    });
  });
});
