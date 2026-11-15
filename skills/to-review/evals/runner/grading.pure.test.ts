import { describe, expect, it } from 'vitest';
import type { Mode } from '../../scripts/grader/check.ts';
import type { Report } from '../../scripts/grader/report.pure.ts';
import { gradingOf, isolationExpectation, mechanicalExpectations, ungradedReport } from './grading.pure.ts';

const report = (mode: Mode | null, statuses: Record<string, 'pass' | 'fail' | 'skip'>): Report => ({
  page: '/runs/ink/page.html',
  mode,
  pass: !Object.values(statuses).includes('fail'),
  checks: Object.entries(statuses).map(([id, status]) => ({
    id,
    summary: `${id} holds.`,
    status,
    problems: status === 'fail' ? [`${id} is broken`, 'at 1024px: it overflows'] : [],
  })),
});

/** The checks as the registry gives them: decide-controls and explain-controls each apply to one mode. */
const CHECKS = [
  { id: 'offline' },
  { id: 'page-attributes' },
  { id: 'decide-controls', modes: ['decide'] as const },
  { id: 'explain-controls', modes: ['explain'] as const },
];

describe('grading', () => {
  describe('success cases', () => {
    it('turns each check into an expectation with its evidence', () => {
      // ARRANGE
      const graded = report('decide', { offline: 'pass', 'page-attributes': 'fail' });
      const expected = [
        { text: 'mechanical offline: offline holds.', passed: true, evidence: 'passes at every graded width' },
        {
          text: 'mechanical page-attributes: page-attributes holds.',
          passed: false,
          evidence: 'page-attributes is broken; at 1024px: it overflows',
        },
      ];

      // ACT
      const expectations = mechanicalExpectations(graded, { mode: 'decide' }, CHECKS);

      // ASSERT
      expect(expectations).toEqual(expected);
    });

    it('summarises the expectations and the run in skill-creator grading.json shape', () => {
      // ARRANGE
      const expectations = [
        { text: 'a', passed: true, evidence: 'ok' },
        { text: 'b', passed: false, evidence: 'no' },
        { text: 'c', passed: true, evidence: 'ok' },
      ];
      const tools = [
        { name: 'Read', input: {} },
        { name: 'Write', input: {} },
        { name: 'Read', input: {} },
      ];
      const expected = {
        expectations,
        summary: { passed: 2, failed: 1, total: 3, pass_rate: 0.6667 },
        execution_metrics: {
          tool_calls: { Read: 2, Write: 1 },
          total_tool_calls: 3,
          errors_encountered: 0,
          output_chars: 5120,
        },
        user_notes_summary: { uncertainties: [], needs_review: ['two pages; graded page.html'], workarounds: [] },
        judge: null,
      };

      // ACT
      const grading = gradingOf({
        expectations,
        tools,
        outputChars: 5120,
        error: null,
        notes: ['two pages; graded page.html'],
      });

      // ASSERT
      expect(grading).toEqual(expected);
    });

    it('names the models that judged and read the page, and lists a same-family risk as an uncertainty', () => {
      // ARRANGE
      const judge = {
        cli: 'claude' as const,
        judgeModel: 'claude-opus-5-5',
        readerModel: 'claude-opus-5-5',
        crossFamily: false,
        risk: 'The judge may prefer its own family.',
      };
      const expected = {
        judge,
        uncertainties: ['judge claude-opus-5-5, reader claude-opus-5-5: The judge may prefer its own family.'],
      };

      // ACT
      const grading = gradingOf({ expectations: [], tools: [], outputChars: 0, error: null, notes: [], judge });

      // ASSERT
      expect({ judge: grading.judge, uncertainties: grading.user_notes_summary.uncertainties }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('fails a check skipped because the page declared another mode than the case', () => {
      // ARRANGE
      const graded = report(null, { 'decide-controls': 'skip' });
      const expected = [
        {
          text: 'mechanical decide-controls: decide-controls holds.',
          passed: false,
          evidence: 'skipped: the page declares mode none, the case expects decide',
        },
      ];

      // ACT
      const expectations = mechanicalExpectations(graded, { mode: 'decide' }, CHECKS);

      // ASSERT
      expect(expectations).toEqual(expected);
    });

    it('fails isolation with every read and write it does not allow', () => {
      // ARRANGE
      const problems = [
        'Read reads /a, outside the run workspace and the system and tool paths',
        'Bash writes .., outside the run workspace and the temp folder',
      ];
      const expected = {
        text: 'isolation: reads stay in the workspace and tool paths, writes in the workspace and temp',
        passed: false,
        evidence:
          'Read reads /a, outside the run workspace and the system and tool paths; Bash writes .., outside the run workspace and the temp folder',
      };

      // ACT
      const expectation = isolationExpectation(problems);

      // ASSERT
      expect(expectation).toEqual(expected);
    });

    it('fails every check when there is no page to grade, and counts the run error', () => {
      // ARRANGE
      const checks = [{ id: 'offline', summary: 'Offline.' }];
      const reason = 'the run wrote no .html page';
      const expected = [{ text: 'mechanical offline: Offline.', passed: false, evidence: reason }];

      // ACT
      const expectations = mechanicalExpectations(ungradedReport(checks, reason), { mode: 'decide' }, checks);
      const grading = gradingOf({ expectations, tools: [], outputChars: 0, error: 'timed out', notes: [] });

      // ASSERT
      expect(expectations).toEqual(expected);
      expect(grading.execution_metrics.errors_encountered).toBe(1);
    });
  });

  describe('edge cases', () => {
    it("leaves out a check that does not apply to the case's mode, whatever the page declares", () => {
      // ARRANGE
      const graded = report(null, { offline: 'pass', 'explain-controls': 'skip' });
      const expected = [
        { text: 'mechanical offline: offline holds.', passed: true, evidence: 'passes at every graded width' },
      ];

      // ACT
      const expectations = mechanicalExpectations(graded, { mode: 'decide' }, CHECKS);

      // ASSERT
      expect(expectations).toEqual(expected);
    });

    it('grades a check that needs an asked value only for a case that asks it', () => {
      // ARRANGE
      const checks = [{ id: 'offline' }, { id: 'fidelity-match', needs: ['fidelity'] as const }];
      const graded = report('decide', { offline: 'pass', 'fidelity-match': 'fail' });
      const untold = report('decide', { offline: 'pass', 'fidelity-match': 'skip' });

      // ACT
      const asked = mechanicalExpectations(graded, { mode: 'decide', asked: { fidelity: 'prototype' } }, checks);
      const unasked = mechanicalExpectations(untold, { mode: 'decide' }, checks);

      // ASSERT
      expect(asked.map(({ text, passed }) => [text, passed])).toEqual([
        ['mechanical offline: offline holds.', true],
        ['mechanical fidelity-match: fidelity-match holds.', false],
      ]);
      expect(unasked.map(({ text }) => text)).toEqual(['mechanical offline: offline holds.']);
    });

    it('passes isolation when every read and write is allowed', () => {
      // ARRANGE
      const expected = {
        text: 'isolation: reads stay in the workspace and tool paths, writes in the workspace and temp',
        passed: true,
        evidence: 'every read stays in the workspace or a tool path, every write in the workspace or temp',
      };

      // ACT
      const expectation = isolationExpectation([]);

      // ASSERT
      expect(expectation).toEqual(expected);
    });
  });
});
