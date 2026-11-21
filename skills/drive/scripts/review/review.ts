import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { capture, fail } from '../core/index.ts';
import { quoteProblems, type ReadFile } from './quotes.pure.ts';

export const REVIEW_USAGE = 'usage: drive review quotes <report>';

export function readerFromRepoRoot(): ReadFile {
  const root = capture('git', ['rev-parse', '--show-toplevel']);
  return (file) => {
    const full = path.join(root, file);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  };
}

export function checkedQuoteProblems(reportFile: string): string[] {
  return quoteProblems(readFileSync(reportFile, 'utf8'), readerFromRepoRoot());
}

export function runReview(argv: readonly string[]): void {
  const [verb, report, ...extra] = argv;
  if (verb !== 'quotes' || report === undefined || extra.length > 0) fail(REVIEW_USAGE);
  if (!existsSync(report)) fail(`${report} does not exist`);
  const problems = checkedQuoteProblems(report);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✖ ${problem}`);
    process.exit(1);
  }
  console.log('✔ contradiction quotes check out');
}
