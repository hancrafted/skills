import { describe, expect, it } from 'vitest';
import { mergedPrOfTip, parseMergedPrs } from './worktree-branch.pure.ts';

describe('success cases', () => {
  describe('parseMergedPrs', () => {
    it('reads the number and head commit of each merged PR', () => {
      // ARRANGE
      const stdout = '[{"number":7,"headRefOid":"abc"},{"number":8,"headRefOid":"def"}]';
      const expected = [
        { number: 7, headRefOid: 'abc' },
        { number: 8, headRefOid: 'def' },
      ];
      // ACT
      const prs = parseMergedPrs(stdout);
      // ASSERT
      expect(prs).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('parseMergedPrs', () => {
    it('reads nothing from output that is not a list of PRs', () => {
      // ARRANGE
      const outputs = ['', 'gh: not logged in', '{}', '[{"number":"7"}]'];
      // ACT
      const prs = outputs.map(parseMergedPrs);
      // ASSERT
      expect(prs).toEqual([[], [], [], []]);
    });
  });
});

describe('edge cases', () => {
  describe('mergedPrOfTip', () => {
    it('finds the merged PR whose head is the branch tip, and none once the branch moved on', () => {
      // ARRANGE
      const tip = { number: 7, headRefOid: 'abc' };
      const prs = [tip];
      // ACT
      const found = mergedPrOfTip(prs, 'abc');
      const moved = mergedPrOfTip(prs, 'later');
      // ASSERT
      expect(found).toEqual(tip);
      expect(moved).toBeUndefined();
    });
  });
});
