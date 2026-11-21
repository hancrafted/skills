import { existsSync, readFileSync } from 'node:fs';
import { fail, run } from '../core/index.ts';
import { quoteProblems, type CommitSource } from './quotes.pure.ts';

export const REVIEW_USAGE = 'usage: drive review quotes <report>';

export function commitSource(cwd?: string): CommitSource {
  return {
    knows: (sha) => run('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd }).status === 0,
    show: (sha, file) => {
      const result = run('git', ['show', `${sha}:${file}`], { cwd });
      return result.status === 0 ? result.stdout : null;
    },
  };
}

export function checkedQuoteProblems(reportFile: string, cwd?: string): string[] {
  return quoteProblems(readFileSync(reportFile, 'utf8'), commitSource(cwd));
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
