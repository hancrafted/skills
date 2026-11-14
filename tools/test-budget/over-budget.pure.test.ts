import { describe, expect, it } from 'vitest';
import { overBudget, type VitestJsonReport } from './over-budget.pure.ts';

const ROOT = '/repo';

/** A report in Vitest's JSON reporter shape: one file per entry, each test's full name and duration in ms. */
function report(files: Record<string, Record<string, number | null>>): VitestJsonReport {
  return {
    testResults: Object.entries(files).map(([file, tests]) => ({
      name: `${ROOT}/${file}`,
      assertionResults: Object.entries(tests).map(([fullName, duration]) => ({ fullName, duration })),
    })),
  };
}

describe('success cases', () => {
  it('lists every test over the budget, slowest first, by its repo path', () => {
    // ARRANGE
    const input = report({
      'skills/example/scripts/a.pure.test.ts': { 'a quick': 40, 'a slow': 2500 },
      'tests/docs/b.test.ts': { 'b slower': 9600 },
    });
    const expected = [
      { file: 'tests/docs/b.test.ts', test: 'b slower', ms: 9600 },
      { file: 'skills/example/scripts/a.pure.test.ts', test: 'a slow', ms: 2500 },
    ];
    // ACT
    const listed = overBudget(input, 2000, ROOT);
    // ASSERT
    expect(listed).toEqual(expected);
  });
});

describe('failure cases', () => {
  it('lists nothing for a test with no duration, as a skipped or never-run test has', () => {
    // ARRANGE
    const input = report({ 'skills/example/scripts/a.pure.test.ts': { 'never ran': null } });
    // ACT
    const listed = overBudget(input, 2000, ROOT);
    // ASSERT
    expect(listed).toEqual([]);
  });
});

describe('edge cases', () => {
  it('keeps a test that takes exactly the budget off the list', () => {
    // ARRANGE
    const input = report({ 'skills/example/scripts/a.pure.test.ts': { 'on budget': 2000, 'one over': 2001 } });
    const expected = [{ file: 'skills/example/scripts/a.pure.test.ts', test: 'one over', ms: 2001 }];
    // ACT
    const listed = overBudget(input, 2000, ROOT);
    // ASSERT
    expect(listed).toEqual(expected);
  });
});
