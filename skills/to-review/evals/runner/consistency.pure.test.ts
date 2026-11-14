import { describe, expect, it } from 'vitest';
import {
  consistency,
  consistencyNotes,
  consistencyTable,
  referenceNotes,
  type BenchmarkRun,
} from './consistency.pure.ts';

interface Fixture {
  readonly arm: string;
  readonly number: number;
  readonly rate: number;
  readonly passed: Record<string, boolean>;
}

const run = ({ arm, number, rate, passed }: Fixture): BenchmarkRun => ({
  eval_id: 2,
  eval_name: 'after-grill',
  configuration: arm,
  run_number: number,
  result: { pass_rate: rate },
  expectations: Object.entries(passed).map(([text, ok]) => ({ text, passed: ok, evidence: '' })),
});

describe('consistency across repeated runs', () => {
  describe('success cases', () => {
    it('reports each case and arm as mean ± stddev, and pass^3 per assertion', () => {
      // ARRANGE
      const runs = [
        run({ arm: 'with_skill', number: 1, rate: 1, passed: { export: true, 'judge case seven-changes': true } }),
        run({ arm: 'with_skill', number: 2, rate: 0.5, passed: { export: true, 'judge case seven-changes': false } }),
        run({ arm: 'with_skill', number: 3, rate: 0.75, passed: { export: true, 'judge case seven-changes': true } }),
      ];
      const expected = [
        {
          case: 'after-grill',
          arm: 'with_skill',
          runs: 3,
          pass_rate: { mean: 0.75, stddev: 0.25 },
          assertions: [
            { text: 'export', passed: 3, pass_k: 1 },
            { text: 'judge case seven-changes', passed: 2, pass_k: 0 },
          ],
        },
      ];

      // ACT
      const rows = consistency(runs, 3);

      // ASSERT
      expect(rows).toEqual(expected);
    });

    it('says per case and arm how many assertions held in every run', () => {
      // ARRANGE
      const runs = [
        run({ arm: 'without_skill', number: 1, rate: 0.5, passed: { export: true, isolation: false } }),
        run({ arm: 'without_skill', number: 2, rate: 1, passed: { export: true, isolation: true } }),
        run({ arm: 'without_skill', number: 3, rate: 0.5, passed: { export: true, isolation: false } }),
      ];
      const expected = ['after-grill · without_skill: pass rate 67% ± 29% over 3 runs; pass^3 on 1 of 2 assertions'];

      // ACT
      const notes = consistencyNotes(consistency(runs, 3), 3);

      // ASSERT
      expect(notes).toEqual(expected);
    });
    it('tables pass^3 per assertion for benchmark.md', () => {
      // ARRANGE
      const runs = [1, 2, 3].map((number) =>
        run({ arm: 'with_skill', number, rate: 1, passed: { 'probe pair-hash': number !== 2 } }),
      );
      const expected = [
        '## Consistency',
        '',
        'pass^3 is the chance that 3 fresh runs all pass, estimated as C(passed, 3) / C(runs, 3).',
        '',
        '| Case | Arm | Assertion | Passed | pass^3 |',
        '| --- | --- | --- | --- | --- |',
        '| after-grill | with_skill | probe pair-hash | 2/3 | 0 |',
      ].join('\n');

      // ACT
      const table = consistencyTable(consistency(runs, 3), 3);

      // ASSERT
      expect(table).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('estimates pass^3 from more runs than three as C(passed, 3) / C(runs, 3)', () => {
      // ARRANGE
      const runs = [true, true, true, false].map((ok, index) =>
        run({ arm: 'with_skill', number: index + 1, rate: ok ? 1 : 0, passed: { export: ok } }),
      );

      // ACT
      const [{ assertions }] = consistency(runs, 3);

      // ASSERT
      expect(assertions).toEqual([{ text: 'export', passed: 3, pass_k: 0.25 }]);
    });

    it('counts an assertion missing from a run as failed in that run', () => {
      // ARRANGE
      const runs = [
        run({ arm: 'with_skill', number: 1, rate: 1, passed: { export: true, 'probe pair-hash': true } }),
        run({ arm: 'with_skill', number: 2, rate: 1, passed: { export: true } }),
        run({ arm: 'with_skill', number: 3, rate: 1, passed: { export: true, 'probe pair-hash': true } }),
      ];

      // ACT
      const [{ assertions }] = consistency(runs, 3);

      // ASSERT
      expect(assertions).toContainEqual({ text: 'probe pair-hash', passed: 2, pass_k: 0 });
    });

    it('leaves pass^3 open, and says so, when a case and arm ran fewer than three times', () => {
      // ARRANGE
      const runs = [run({ arm: 'with_skill', number: 1, rate: 0.8, passed: { export: true } })];
      const expected = ['after-grill · with_skill: pass rate 80% ± 0% over 1 run; pass^3 needs 3 runs'];

      // ACT
      const rows = consistency(runs, 3);

      // ASSERT
      expect(rows[0].assertions).toEqual([{ text: 'export', passed: 1, pass_k: null }]);
      expect(consistencyNotes(rows, 3)).toEqual(expected);
    });
  });
});

describe('vs-reference pass rate', () => {
  const graded = (name: string, fixture: Pick<Fixture, 'arm' | 'number' | 'passed'>): BenchmarkRun => ({
    ...run({ ...fixture, rate: 1 }),
    eval_id: name === 'architecture-round' ? 4 : 1,
    eval_name: name,
  });

  describe('success cases', () => {
    it('gives each case with a reference its vs-reference pass rate per arm, summed over runs', () => {
      // ARRANGE
      const runs = [
        graded('architecture-round', {
          arm: 'with_skill',
          number: 1,
          passed: {
            'vs-reference overall: Which page?': true,
            'vs-reference scannable: Can?': false,
            'judge bar decision': true,
          },
        }),
        graded('architecture-round', {
          arm: 'with_skill',
          number: 2,
          passed: {
            'vs-reference overall: Which page?': true,
            'vs-reference scannable: Can?': true,
          },
        }),
        graded('architecture-round', {
          arm: 'without_skill',
          number: 1,
          passed: {
            'vs-reference overall: Which page?': false,
            'vs-reference scannable: Can?': false,
          },
        }),
        graded('ink', { arm: 'with_skill', number: 1, passed: { 'judge bar decision': true } }),
      ];
      const expected = [
        'architecture-round · with_skill: vs-reference 3 of 4 items not worse than the reference (75%) over 2 runs',
        'architecture-round · without_skill: vs-reference 0 of 2 items not worse than the reference (0%) over 1 run',
      ];

      // ACT
      const notes = referenceNotes(runs);

      // ASSERT
      expect(notes).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('says nothing when no run was graded against a reference', () => {
      // ARRANGE
      const runs = [graded('ink', { arm: 'with_skill', number: 1, passed: { 'judge bar decision': true } })];

      // ACT
      const notes = referenceNotes(runs);

      // ASSERT
      expect(notes).toEqual([]);
    });
  });
});
