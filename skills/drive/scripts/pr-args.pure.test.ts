import { describe, expect, it } from 'vitest';
import { parsePrArgs, USAGE } from './pr-args.pure.ts';

describe('success cases', () => {
  describe('parsePrArgs', () => {
    it('reads watch with poll interval and the integration flag, and ready', () => {
      // ARRANGE
      const expected = [
        { verb: 'watch', number: '5', integration: false, timing: { pollMilliseconds: 30_000 } },
        { verb: 'watch', number: '5', integration: true, timing: { pollMilliseconds: 10 } },
        { verb: 'ready', number: '7' },
      ];
      // ACT
      const parsed = [
        parsePrArgs(['watch', '5']),
        parsePrArgs(['watch', '5', '--integration', '--poll-milliseconds', '10']),
        parsePrArgs(['ready', '7']),
      ];
      // ASSERT
      expect(parsed).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('parsePrArgs', () => {
    it('rejects malformed input with the usage text', () => {
      // ARRANGE
      const expected = [{ error: USAGE }, { error: USAGE }, { error: USAGE }, { error: USAGE }];
      // ACT
      const parsed = [
        parsePrArgs([]),
        parsePrArgs(['watch']),
        parsePrArgs(['ready', '7', '--integration']),
        parsePrArgs(['watch', '5', '--poll-milliseconds']),
      ];
      // ASSERT
      expect(parsed).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('parsePrArgs', () => {
    it('documents the integration flag and its exit codes in the usage text', () => {
      // ARRANGE
      const exitCodes =
        'watch --integration exits 10 failing check, 11 merge conflict, 12 merged (lists the tickets still open), 13 closed unmerged.';
      // ACT
      const lines = USAGE.split('\n');
      // ASSERT
      expect(lines).toContain(exitCodes);
    });
  });
});
