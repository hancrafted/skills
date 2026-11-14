import { describe, expect, it } from 'vitest';
import { checklistFor, judgeExpectations } from './judge.pure.ts';

const source = { file: 'handoff.md', quote: 'Compare all three' };
const ITEMS = [
  { id: 'bar decision', question: 'Does every item state its decision in one sentence?' },
  { id: 'case three-approaches', question: 'Does it compare all three approaches?' },
];
const PAGE_TEXT = 'Neighbouring cards\nDecision:   which approach   keeps pools apart?';

const CASE_ITEMS = [{ id: 'three-approaches', question: 'Does it compare all three approaches?', source }];

describe('checklist judge', () => {
  describe('success cases', () => {
    it("asks a decide page the whole confidence bar, then the case's own items", () => {
      // ARRANGE
      const expected = [
        'bar decision',
        'bar consequence',
        'bar labels',
        'bar recommendation',
        'bar fidelity',
        'bar fidelity-named',
        'bar door-effort',
        'bar open-reflection',
        'case three-approaches',
      ];

      // ACT
      const checklist = checklistFor('decide', CASE_ITEMS);

      // ASSERT
      expect(checklist.map(({ id }) => id)).toEqual(expected);
    });

    it('asks an explain page only the bar questions for settled decisions', () => {
      // ARRANGE
      const expected = [
        'bar decision',
        'bar consequence',
        'bar labels',
        'bar fidelity',
        'bar fidelity-named',
        'bar open-reflection',
      ];

      // ACT
      const checklist = checklistFor('explain', []);

      // ASSERT
      expect(checklist.map(({ id }) => id)).toEqual(expected);
      expect(checklist[1].question).toBe('Does every item say what changes for the reader overall?');
      expect(checklist[5].question).toContain('reflection block ask only open questions');
    });

    it('passes a yes and quotes its evidence', () => {
      // ARRANGE
      const answers = [
        { id: 'bar decision', answer: 'yes', evidence: 'Decision: which approach keeps pools apart?' },
        { id: 'case three-approaches', answer: 'no', evidence: 'Nearest only' },
      ];
      const expected = [
        {
          text: 'judge bar decision: Does every item state its decision in one sentence?',
          passed: true,
          evidence: 'yes: "Decision: which approach keeps pools apart?"',
        },
        {
          text: 'judge case three-approaches: Does it compare all three approaches?',
          passed: false,
          evidence: 'no: "Nearest only" (not in the page text; seen in a screenshot or invented)',
        },
      ];

      // ACT
      const expectations = judgeExpectations(ITEMS, answers, PAGE_TEXT);

      // ASSERT
      expect(expectations).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('fails an unknown, and an item the judge left unanswered', () => {
      // ARRANGE
      const answers = [{ id: 'bar decision', answer: 'unknown', evidence: '' }];
      const expected = [
        { passed: false, evidence: 'unknown, which counts as fail' },
        { passed: false, evidence: 'the judge gave no answer' },
      ];

      // ACT
      const expectations = judgeExpectations(ITEMS, answers, PAGE_TEXT);

      // ASSERT
      expect(expectations.map(({ passed, evidence }) => ({ passed, evidence }))).toEqual(expected);
    });
  });
});
