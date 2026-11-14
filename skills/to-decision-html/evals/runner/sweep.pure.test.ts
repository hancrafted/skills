import { describe, expect, it } from 'vitest';
import { sweepMarkdown, sweepReport, type SweepRun } from './sweep.pure.ts';

const expectation = (text: string, passed: boolean) => ({ text, passed });

/** A graded run at `rung`: whether its page honoured the rung, then its judge and probe verdicts. */
const run = (rung: SweepRun['rung'], honoured: boolean, [judge, probe]: [boolean[], boolean[]]): SweepRun => ({
  rung,
  expectations: [
    expectation(
      "mechanical fidelity-match: Every item's data-fidelity is the rung its calibration asked for.",
      honoured,
    ),
    expectation('mechanical offline: Offline.', false),
    expectation('isolation: reads stay in the workspace and tool paths, writes in the workspace and temp', false),
    ...judge.map((passed, index) => expectation(`judge bar q${index}: ?`, passed)),
    ...probe.map((passed, index) => expectation(`probe p${index}: ?`, passed)),
  ],
});

describe('fidelity sweep report', () => {
  describe('success cases', () => {
    it('reports per rung how many runs honoured it and the judge and probe scores, in ladder order', () => {
      // ARRANGE
      const runs = [
        run('mock', true, [[true, false], [true]]),
        run('diagram', false, [[true, true], [false]]),
        run('mock', false, [[true, true], [true]]),
      ];
      const expected = [
        { rung: 'diagram', runs: 1, honoured: 0, judge: { passed: 2, total: 2 }, probe: { passed: 0, total: 1 } },
        { rung: 'mock', runs: 2, honoured: 1, judge: { passed: 3, total: 4 }, probe: { passed: 2, total: 2 } },
      ];

      // ACT
      const report = sweepReport(runs);

      // ASSERT
      expect(report).toEqual(expected);
    });

    it('writes the report as a Markdown table', () => {
      // ARRANGE
      const rows = sweepReport([
        run('prototype', true, [
          [true, true, false, true],
          [true, false],
        ]),
      ]);
      const expected = [
        '| Rung | Runs | Rung honoured | Judge | Probe |',
        '| --- | --- | --- | --- | --- |',
        '| prototype | 1 | 1/1 | 3/4 (75%) | 1/2 (50%) |',
      ].join('\n');

      // ACT
      const markdown = sweepMarkdown(rows);

      // ASSERT
      expect(markdown).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('counts a run without a fidelity-match verdict as not honouring its rung', () => {
      // ARRANGE
      const runs: SweepRun[] = [{ rung: 'wireframe', expectations: [expectation('probe p0: ?', true)] }];

      // ACT
      const [row] = sweepReport(runs);

      // ASSERT
      expect(row.honoured).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('shows a score with nothing graded as a dash, not as 0%', () => {
      // ARRANGE
      const rows = sweepReport([run('diagram', true, [[], []])]);

      // ACT
      const markdown = sweepMarkdown(rows);

      // ASSERT
      expect(markdown.split('\n')[2]).toBe('| diagram | 1 | 1/1 | – | – |');
    });
  });
});
