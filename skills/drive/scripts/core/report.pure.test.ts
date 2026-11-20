import { describe, expect, it } from 'vitest';
import { reportPathFor, unmetCriteria } from './report.pure.ts';
const DEFERRAL_SHAPE = 'deferred: <ticket url>, e.g. https://github.com/<owner>/<repo>/issues/<number>';
const report = (criteria: string) => `- x\n\n## Acceptance criteria\n${criteria}\n\n- **Merge:** abc\n`;

describe('success cases', () => {
  describe('reportPathFor', () => {
    it('maps a Task branch to the report under its parent slug', () => {
      // ARRANGE
      const branch = 'chore/drive-fortify-sweep--791-ac-gate';
      const expected = '.scratch/drive-fortify-sweep/791-ac-gate.report.md';
      // ACT
      const path = reportPathFor(branch);
      // ASSERT
      expect(path).toBe(expected);
    });
  });
  describe('unmetCriteria', () => {
    it('passes when every criterion is checked', () => {
      // ARRANGE
      const body = report('- [x] one — evidence\n- [X] two — evidence');
      // ACT
      const problems = unmetCriteria(body);
      // ASSERT
      expect(problems).toEqual([]);
    });

    it('accepts an unchecked criterion deferred to a ticket url', () => {
      // ARRANGE
      const body = report('- [ ] two — deferred: https://github.com/o/r/issues/9');
      // ACT
      const problems = unmetCriteria(body);
      // ASSERT
      expect(problems).toEqual([]);
    });
  });
});

describe('failure cases', () => {
  describe('unmetCriteria', () => {
    it('names each unchecked criterion without a deferral', () => {
      // ARRANGE
      const body = report('- [x] one — e\n- [ ] two\n- [ ] three — why');
      const expected = [
        `unchecked without "${DEFERRAL_SHAPE}": - [ ] two`,
        `unchecked without "${DEFERRAL_SHAPE}": - [ ] three — why`,
      ];
      // ACT
      const problems = unmetCriteria(body);
      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('refuses a deferral that names no ticket url, a pull request or docs link included', () => {
      // ARRANGE
      const lines = [
        '- [ ] a — deferred: later',
        '- [ ] b — deferred: https://github.com/o/r/pull/9',
        '- [ ] c — deferred: https://x.dev/docs',
      ];
      const expected = lines.map((line) => `unchecked without "${DEFERRAL_SHAPE}": ${line}`);
      // ACT
      const problems = unmetCriteria(report(lines.join('\n')));
      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('refuses a report without the section and names the template line', () => {
      // ARRANGE
      const expected = [
        'the report has no "## Acceptance criteria" section; add it, one line per criterion: - [x] <acceptance criterion> — <evidence>',
      ];
      // ACT
      const problems = unmetCriteria('- **Merge:** abc\n');
      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('refuses an empty section', () => {
      // ARRANGE
      const expected = [
        '"## Acceptance criteria" has no criterion lines; add them as: - [x] <acceptance criterion> — <evidence>',
      ];
      // ACT
      const problems = unmetCriteria('## Acceptance criteria\n\n- **Merge:** a');
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('reportPathFor', () => {
    it('maps no report for a branch without a type, the same as every other branch reader', () => {
      // ARRANGE
      const expected = null;
      // ACT
      const path = reportPathFor('sweep--1-a');
      // ASSERT
      expect(path).toBe(expected);
    });

    it('does not gate a branch without a task', () => {
      // ARRANGE
      const branches = ['feat/x', 'feat/x--'];
      // ACT
      const paths = branches.map(reportPathFor);
      // ASSERT
      expect(paths).toEqual([null, null]);
    });
  });
  describe('unmetCriteria', () => {
    it('ignores checkboxes outside the section', () => {
      // ARRANGE
      const body = '- [ ] stray\n## Acceptance criteria\n- [x] a — b\n## Other\n- [ ] stray';
      // ACT
      const problems = unmetCriteria(body);
      // ASSERT
      expect(problems).toEqual([]);
    });
  });
});
