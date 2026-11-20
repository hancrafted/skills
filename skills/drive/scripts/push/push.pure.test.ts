import { describe, expect, it } from 'vitest';
import { exitProblem, parseLsRemote, pushedLine, remoteDiffersFrom } from './push.pure.ts';
const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

describe('success cases', () => {
  describe('parseLsRemote', () => {
    it('reads the sha of the first line and null for an empty answer', () => {
      // ARRANGE
      const answer = `${HEAD}\trefs/heads/feat/x\n`;
      // ACT
      const results = [parseLsRemote(answer), parseLsRemote('')];
      // ASSERT
      expect(results).toEqual([HEAD, null]);
    });
  });
  describe('remoteDiffersFrom', () => {
    it('passes when the remote equals HEAD', () => {
      // ARRANGE
      // ACT
      const problem = remoteDiffersFrom({ branch: 'feat/x', remote: 'origin' }, HEAD, HEAD);
      // ASSERT
      expect(problem).toBeNull();
    });
  });
});

describe('failure cases', () => {
  describe('remoteDiffersFrom', () => {
    it('names the shas when the remote differs, and the missing branch when there is none', () => {
      // ARRANGE
      // ACT
      const problems = [
        remoteDiffersFrom({ branch: 'feat/x', remote: 'origin' }, HEAD, OTHER),
        remoteDiffersFrom({ branch: 'feat/x', remote: 'origin' }, HEAD, null),
      ];
      // ASSERT
      expect(problems[0]).toContain(`origin/feat/x is ${OTHER} but HEAD is ${HEAD}`);
      expect(problems[1]).toContain('origin has no feat/x');
    });
  });
  describe('exitProblem', () => {
    it('fails a null status (killed or dropped connection) and any non-zero one, naming the signal', () => {
      // ARRANGE
      const args = ['push', 'origin', 'feat/x'];
      const expected = [
        'git push origin feat/x failed (no exit status)',
        'git push origin feat/x failed (killed by SIGPIPE)',
        'git push origin feat/x failed (128)',
        null,
      ];
      // ACT
      const problems = [
        exitProblem(args, { status: null, signal: null }),
        exitProblem(args, { status: null, signal: 'SIGPIPE' }),
        exitProblem(args, { status: 128, signal: null }),
        exitProblem(args, { status: 0, signal: null }),
      ];
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('pushedLine', () => {
    it('prints old..new, with zeros for a branch the remote did not have', () => {
      // ARRANGE
      // ACT
      const lines = [pushedLine('feat/x', OTHER, HEAD), pushedLine('feat/x', null, HEAD)];
      // ASSERT
      expect(lines).toEqual(['✔ pushed feat/x bbbbbbb..aaaaaaa', '✔ pushed feat/x 0000000..aaaaaaa']);
    });
  });
  describe('remoteDiffersFrom', () => {
    it('fails when the ls-remote answer lacks the local commit, even when git exited 0', () => {
      // ARRANGE
      const ref = { branch: 'feat/x', remote: 'origin' };
      // ACT
      const problems = [
        remoteDiffersFrom(ref, HEAD, HEAD.slice(0, 7)),
        remoteDiffersFrom(ref, HEAD, parseLsRemote('')),
      ];
      // ASSERT
      expect(problems[0]).toContain('did not land');
      expect(problems[1]).toContain('has no feat/x');
    });
  });
});
