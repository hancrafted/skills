// The nightly budget's judgement: which fast-suite tests took longer than the budget. The process side, reading the
// report and printing the issue body, lives in over-budget.ts.
import path from 'node:path';

/** The part of Vitest's JSON reporter output the budget reads. A test that never ran has no duration. */
export interface VitestJsonReport {
  testResults: readonly {
    name: string;
    assertionResults: readonly { fullName: string; duration?: number | null }[];
  }[];
}

/** One test over the budget: its file relative to the repo root, its full name, and how long it took. */
export interface OverBudget {
  file: string;
  test: string;
  ms: number;
}

/** Every test in `report` that took longer than `budgetMs`, slowest first. */
export function overBudget(report: VitestJsonReport, budgetMs: number, root: string): OverBudget[] {
  return report.testResults
    .flatMap((result) =>
      result.assertionResults.map((test) => ({
        file: path.relative(root, result.name),
        test: test.fullName,
        ms: test.duration ?? 0,
      })),
    )
    .filter((test) => test.ms > budgetMs)
    .sort((a, b) => b.ms - a.ms);
}
