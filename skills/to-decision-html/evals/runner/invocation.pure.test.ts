import { describe, expect, it } from 'vitest';
import { invocation } from './invocation.pure.ts';

const run = { caseId: 'ink', inputs: ['handoff.md', 'calibration.md'], dir: '/tmp/decision-eval-1' };
const SKILL_LINE = 'Follow the skill in `skill/SKILL.md` for this task; its relative links resolve inside `skill/`.';

describe('invocation', () => {
  describe('success cases', () => {
    it('gives the skill arm the same text plus exactly one line naming the skill copy', () => {
      // ARRANGE
      const without = invocation({ ...run, withSkill: false }).split('\n');

      // ACT
      const withSkill = invocation({ ...run, withSkill: true }).split('\n');
      const added = withSkill.filter((line) => !without.includes(line));

      // ASSERT
      expect(added).toEqual([SKILL_LINE]);
      expect(withSkill.length).toBe(without.length + 1);
    });
  });

  describe('failure cases', () => {
    it('never names the arm or skill in the text the baseline arm reads', () => {
      // ARRANGE
      const words = /skill/i;

      // ACT
      const text = invocation({ ...run, withSkill: false });

      // ASSERT
      expect(text).not.toMatch(words);
    });
  });

  describe('edge cases', () => {
    it('names the prompt, every input, the page id and the absolute workspace and feedback folder', () => {
      // ARRANGE
      const expected = ['`prompt.md`', 'handoff.md', '`calibration.md`', '`ink`', `${run.dir}/feedback/`];

      // ACT
      const text = invocation({ ...run, withSkill: false });

      // ASSERT
      for (const part of expected) expect(text).toContain(part);
    });
  });
});
