import { describe, expect, it } from 'vitest';
import {
  OVERALL,
  oncePerCase,
  pageFileName,
  pairwiseExpectations,
  pairwiseItems,
  pairwiseSchema,
  type PairwiseOutcome,
} from './pairwise.pure.ts';

const source = { file: 'calibration.md', quote: 'diagram' };
const CASE_ITEMS = [
  { id: 'principle-altitude', question: 'Does each Option name its principle?', source },
  { id: 'scannable', question: 'Can each item be judged at a glance?', source },
];
const ITEMS = pairwiseItems(CASE_ITEMS);
const TEXTS = 'Single source of truth lowers drift.\nDecision: which module owns the rule?';

const answer = (id: string, verdict: string, evidence = 'Single source of truth') => ({
  id,
  critique: 'a critique',
  answer: verdict,
  evidence,
});
const ok = (answers: readonly ReturnType<typeof answer>[]) => ({ answers, error: null });

describe('pairwise reference judge', () => {
  describe('success cases', () => {
    it("asks the case's checklist items, then the overall item", () => {
      // ARRANGE
      const expected = ['principle-altitude', 'scannable', 'overall'];

      // ACT
      const ids = ITEMS.map(({ id }) => id);

      // ASSERT
      expect(ids).toEqual(expected);
      expect(OVERALL.question).toBe('Which page lets the reader decide faster and with more confidence?');
    });

    it('puts the critique before the verdict, and offers 1, 2 or same', () => {
      // ARRANGE
      const expected = ['id', 'critique', 'answer', 'evidence'];

      // ACT
      const schema = pairwiseSchema(ITEMS) as {
        properties: { answers: { items: { properties: Record<string, { enum?: string[] }> } } };
      };
      const properties = schema.properties.answers.items.properties;

      // ASSERT
      expect(Object.keys(properties)).toEqual(expected);
      expect(properties.answer.enum).toEqual(['1', '2', 'same']);
      expect(properties.id.enum).toEqual(['principle-altitude', 'scannable', 'overall']);
    });

    it('names a page file by its page number', () => {
      // ARRANGE
      const expected = ['page-2-1-load.png', 'page-2.txt'];

      // ACT
      const names = ['1-load.png', 'page.txt'].map((file) => pageFileName(2, file));

      // ASSERT
      expect(names).toEqual(expected);
    });

    it('passes an item when the run is not worse than the reference in both orders', () => {
      // ARRANGE: run first, so "1" is the run; reference first, so "2" is the run.
      const outcome: PairwiseOutcome = {
        'run-first': ok([answer('principle-altitude', '1'), answer('scannable', 'same'), answer('overall', 'same')]),
        'reference-first': ok([answer('principle-altitude', '2'), answer('scannable', 'same'), answer('overall', '2')]),
      };
      const expected = [true, true, true];

      // ACT
      const expectations = pairwiseExpectations(ITEMS, outcome, TEXTS);

      // ASSERT
      expect(expectations.map(({ passed }) => passed)).toEqual(expected);
      expect(expectations[0].text).toBe('vs-reference principle-altitude: Does each Option name its principle?');
      expect(expectations[0].evidence).toBe(
        'run first: run better, "Single source of truth"; reference first: run better, "Single source of truth"',
      );
    });
  });

  describe('failure cases', () => {
    it('fails an item the reference wins in either order, which a position bias would otherwise hide', () => {
      // ARRANGE
      const outcome: PairwiseOutcome = {
        'run-first': ok([answer('principle-altitude', '2'), answer('scannable', 'same'), answer('overall', '1')]),
        'reference-first': ok([answer('principle-altitude', '1'), answer('scannable', '1'), answer('overall', '2')]),
      };
      const expected = [false, false, true];

      // ACT
      const expectations = pairwiseExpectations(ITEMS, outcome, TEXTS);

      // ASSERT
      expect(expectations.map(({ passed }) => passed)).toEqual(expected);
      expect(expectations[0].evidence).toContain('run first: reference better');
      expect(expectations[1].evidence).toContain('reference first: reference better');
    });

    it('fails every item of an order whose call failed, and an item left unanswered or answered unknown', () => {
      // ARRANGE
      const outcome: PairwiseOutcome = {
        'run-first': ok([answer('principle-altitude', 'same'), answer('scannable', 'unknown')]),
        'reference-first': { answers: [], error: 'timed out' },
      };
      const expected = [
        'reference first: the judge failed: timed out',
        'run first: unknown, which counts as fail',
        'run first: the judge gave no answer',
      ];

      // ACT
      const expectations = pairwiseExpectations(ITEMS, outcome, TEXTS);

      // ASSERT
      expect(expectations.every(({ passed }) => !passed)).toBe(true);
      expect(expectations[0].evidence).toContain(expected[0]);
      expect(expectations[1].evidence).toContain(expected[1]);
      expect(expectations[2].evidence).toContain(expected[2]);
    });
  });

  describe('edge cases', () => {
    it('flags a quote that neither page text holds, without changing the verdict', () => {
      // ARRANGE
      const outcome: PairwiseOutcome = {
        'run-first': ok([answer('principle-altitude', 'same', 'an invented line')]),
        'reference-first': ok([answer('principle-altitude', 'same')]),
      };

      // ACT
      const [first] = pairwiseExpectations(ITEMS.slice(0, 1), outcome, TEXTS);

      // ASSERT
      expect(first.passed).toBe(true);
      expect(first.evidence).toContain('"an invented line" (not in the page text; seen in a screenshot or invented)');
    });
  });
});

describe('reference views cache', () => {
  describe('success cases', () => {
    it('renders a case once however many runs ask, and each case separately', async () => {
      // ARRANGE
      const rendered: string[] = [];
      const get = oncePerCase((id: string) => {
        rendered.push(id);
        return Promise.resolve(`views of ${id}`);
      });

      // ACT
      const views = await Promise.all([get('a'), get('a'), get('b'), get('a')]);

      // ASSERT
      expect(views).toEqual(['views of a', 'views of a', 'views of b', 'views of a']);
      expect(rendered).toEqual(['a', 'b']);
    });
  });

  describe('failure cases', () => {
    it('hands every run the same failure, without rendering again', async () => {
      // ARRANGE
      let calls = 0;
      const get = oncePerCase((): Promise<string> => {
        calls += 1;
        return Promise.reject(new Error('no browser'));
      });

      // ACT
      const outcomes = await Promise.allSettled([get('a'), get('a')]);

      // ASSERT
      expect(outcomes.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
      expect(calls).toBe(1);
    });
  });
});
