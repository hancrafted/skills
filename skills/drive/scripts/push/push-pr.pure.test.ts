import { describe, expect, it } from 'vitest';
import {
  branchPrState,
  closesProblem,
  missingCloses,
  openingBody,
  refuseMerged,
  refuseSpecOffGithub,
  skipPrLookup,
} from './push-pr.pure.ts';

describe('success cases', () => {
  describe('branchPrState', () => {
    it('is none without PRs, open when any is open, merged when only merged ones exist', () => {
      // ARRANGE
      const merged = { number: 1, state: 'MERGED' };
      const open = { number: 2, state: 'OPEN' };
      const closed = { number: 3, state: 'CLOSED' };
      // ACT
      const states = [
        branchPrState([]),
        branchPrState([merged, open]),
        branchPrState([closed, merged]),
        branchPrState([closed]),
      ];
      // ASSERT
      expect(states).toEqual(['none', 'open', 'merged', 'none']);
    });
  });
  describe('openingBody', () => {
    it('names the spec and has a Closes line for every ticket', () => {
      // ARRANGE
      const expected = 'Spec: #20\n\nCloses #21\nCloses #22';
      // ACT
      const body = openingBody(20, [21, 22]);
      // ASSERT
      expect(body).toBe(expected);
    });
  });
});

describe('failure cases', () => {
  describe('refuseMerged', () => {
    it('tells the agent to branch anew when the branch merged', () => {
      // ARRANGE
      const expected =
        'the PR of feat/x has merged; branch anew from the base branch (drive worktree new) instead of pushing more commits here';
      // ACT
      const messages = [refuseMerged('feat/x', 'merged'), refuseMerged('feat/x', 'open')];
      // ASSERT
      expect(messages).toEqual([expected, null]);
    });
  });
  describe('missingCloses', () => {
    it('names the tickets the body does not close, and none when all are there', () => {
      // ARRANGE
      const body = 'Closes #21\nfixes #22 and closes #230';
      const expected = [22, 23];
      // ACT
      const missing = missingCloses(body, [21, 22, 23]);
      const none = missingCloses(openingBody(1, [5, 6]), [5, 6]);
      // ASSERT
      expect(missing).toEqual(expected);
      expect(none).toEqual([]);
    });
  });
  describe('closesProblem', () => {
    it('names the PR and the tickets it does not close, and passes when all are there', () => {
      // ARRANGE
      const stale = 'Spec: #1\n\nCloses #5';
      const expected = ['https://github.com/o/r/pull/9 lacks Closes for #6, #7', null];
      // ACT
      const problems = [
        closesProblem('https://github.com/o/r/pull/9', stale, [5, 6, 7]),
        closesProblem('https://github.com/o/r/pull/9', stale, [5]),
      ];
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('refuseSpecOffGithub', () => {
    it('refuses --spec with the skip note, and passes on GitHub', () => {
      // ARRANGE
      const note = '! origin is not on GitHub (/tmp/o.git); skipped the merged-PR check';
      const expected = [
        '--spec needs a GitHub remote to open or check the Integration PR; ! origin is not on GitHub (/tmp/o.git); skipped the merged-PR check',
        null,
      ];
      // ACT
      const problems = [refuseSpecOffGithub(note), refuseSpecOffGithub(null)];
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
  describe('skipPrLookup', () => {
    it('skips the merged-PR check with a note for a remote not on GitHub, and asks GitHub otherwise', () => {
      // ARRANGE
      const github = [
        'git@github.com:o/r.git',
        'https://github.com/o/r',
        'https://tok@github.com/o/r.git',
        'ssh://git@github.com/o/r.git',
      ];
      const elsewhere = ['/tmp/origin.git', 'https://gitlab.com/o/r.git', 'git@notgithub.com:o/r.git'];
      const expectedSkips = elsewhere.map((url) => `! origin is not on GitHub (${url}); skipped the merged-PR check`);
      // ACT
      const asked = github.map((url) => skipPrLookup(url, 'origin'));
      const skipped = elsewhere.map((url) => skipPrLookup(url, 'origin'));
      // ASSERT
      expect(asked).toEqual([null, null, null, null]);
      expect(skipped).toEqual(expectedSkips);
    });
  });
});
