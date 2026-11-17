import path from 'node:path';

export interface VitestJsonReport {
  testResults: readonly {
    name: string;
    assertionResults: readonly { fullName: string; duration?: number | null }[];
  }[];
}

export interface OverBudget {
  file: string;
  test: string;
  ms: number;
}

export function overBudget(report: VitestJsonReport, budgetMilliseconds: number, root: string): OverBudget[] {
  return report.testResults
    .flatMap((result) =>
      result.assertionResults.map((test) => ({
        file: path.relative(root, result.name),
        test: test.fullName,
        ms: test.duration ?? 0,
      })),
    )
    .filter((test) => test.ms > budgetMilliseconds)
    .sort((a, b) => b.ms - a.ms);
}
