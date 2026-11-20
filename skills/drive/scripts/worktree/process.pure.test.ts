import { describe, expect, it } from 'vitest';
import { blockingProcs, killable, lineage, parseLsof, planSync } from './process.pure.ts';
const procs = [
  { pid: 10, command: 'node', uid: 501 },
  { pid: 11, command: 'gone', uid: 501 },
  { pid: 12, command: 'other-user', uid: 0 },
  { pid: 13, command: 'no-owner', uid: null },
];

describe('success cases', () => {
  describe('parseLsof', () => {
    it('keeps only processes whose cwd is inside the worktree', () => {
      // ARRANGE
      const out = [
        'p10',
        'u501',
        'cnode',
        'n/r/wt/sub',
        'p11',
        'u501',
        'cvim',
        'n/r/wt-other',
        'p12',
        'u0',
        'cchrome',
        'n/r/wt',
      ].join('\n');
      const expected = [
        { pid: 10, command: 'node', uid: 501 },
        { pid: 12, command: 'chrome', uid: 0 },
      ];
      // ACT
      const found = parseLsof(out, '/r/wt');
      // ASSERT
      expect(found).toEqual(expected);
    });
  });
  describe('killable', () => {
    it('excludes the caller and its ancestors and lists each pid once', () => {
      // ARRANGE
      const parentOf = new Map([
        [30, 20],
        [20, 1],
      ]);
      const procs = [20, 30, 40, 40, 50].map((pid) => ({ pid, command: 'x', uid: null }));
      const expected = [40, 50];
      // ACT
      const pids = killable(procs, lineage(30, parentOf)).map((p) => p.pid);
      // ASSERT
      expect(pids).toEqual(expected);
    });
  });
  describe('planSync', () => {
    it('merges origin/main by default and the base when given', () => {
      // ARRANGE
      const clean = {
        branch: 'feat/x',
        dirty: false,
        baseBranch: 'main',
        remote: 'origin',
      };
      // ACT
      const plans = [planSync({ ...clean, base: null }), planSync({ ...clean, base: 'feat/y' })];
      // ASSERT
      expect(plans).toEqual([{ target: 'origin/main' }, { target: 'feat/y' }]);
    });
  });
  describe('blockingProcs', () => {
    it('keeps every live process of the caller', () => {
      // ARRANGE
      const facts = { uid: 501, isAlive: () => true };
      const callerProcs = procs.slice(0, 2);
      // ACT
      const blocking = blockingProcs(callerProcs, facts);
      // ASSERT
      expect(blocking).toEqual(callerProcs);
    });
  });
});

describe('failure cases', () => {
  describe('planSync', () => {
    it('refuses a dirty tree, main and a detached HEAD', () => {
      // ARRANGE
      const where = { baseBranch: 'main', remote: 'origin' };
      const inputs = [
        { branch: 'feat/x', base: null, dirty: true, ...where },
        { branch: 'main', base: null, dirty: false, ...where },
        { branch: '', base: null, dirty: false, ...where },
      ];
      // ACT
      const plans = inputs.map(planSync);
      // ASSERT
      expect(plans.every((plan) => 'error' in plan)).toBe(true);
    });
  });
});

describe('edge cases', () => {
  describe('lineage', () => {
    it('stops at a cycle or a missing parent', () => {
      // ARRANGE
      const parentOf = new Map([
        [3, 2],
        [2, 3],
      ]);
      const expected = [2, 3];
      // ACT
      const set = lineage(3, parentOf);
      // ASSERT
      expect([...set].sort()).toEqual(expected);
    });
  });
  describe('planSync', () => {
    it('follows its own remote branch when the worktree is on the base it syncs', () => {
      // ARRANGE
      const input = {
        branch: 'feat/x',
        base: 'feat/x',
        dirty: false,
        baseBranch: 'main',
        remote: 'origin',
      };
      // ACT
      const plan = planSync(input);
      // ASSERT
      expect(plan).toEqual({ target: 'origin/feat/x' });
    });
  });
  describe('blockingProcs', () => {
    it('drops pids that exited and pids another user owns', () => {
      // ARRANGE
      const facts = { uid: 501, isAlive: (pid: number) => pid !== 11 };
      const expected = [10, 13];
      // ACT
      const blocking = blockingProcs(procs, facts).map((proc) => proc.pid);
      // ASSERT
      expect(blocking).toEqual(expected);
    });
  });
});
