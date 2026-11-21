import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkedQuoteProblems } from './review.ts';

for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim();
const write = (file: string, content: string) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const PAIR = '- "Always run the check." (skills/a/one.md:2) vs "Never run the check." (skills/a/two.md:1)';

function fixture() {
  const main = path.join(realpathSync(mkdtempSync(path.join(tmpdir(), 'review-quotes-'))), 'main');
  git(path.dirname(main), 'init', '-q', '-b', 'main', main);
  write(path.join(main, 'skills/a/one.md'), 'first\nAlways run the check.\n');
  write(path.join(main, 'skills/a/two.md'), 'Never run the check.\n');
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'init');
  const sha = git(main, 'rev-parse', 'HEAD');
  write(path.join(main, 'skills/a/one.md'), 'rewritten\n');
  git(main, 'commit', '-qam', 'fix round');
  const other = path.join(main, '.worktrees', 'other');
  git(main, 'worktree', 'add', '-q', other, '-b', 'other');
  const report = (entry: string, reviewed = sha) =>
    write(path.join(main, 'r.md'), `# R\n\nReviewed: ${reviewed}\n\n## Contradictions\n\n${entry}\n`);
  return { main, other, sha, report, file: path.join(main, 'r.md') };
}

describe('success cases', () => {
  it('passes a quote true at the sha though the working tree changed it', () => {
    // ARRANGE
    const { main, report, file } = fixture();
    report(PAIR);
    // ACT
    const problems = checkedQuoteProblems(file, main);
    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a made-up quote', () => {
    // ARRANGE
    const { main, sha, report, file } = fixture();
    report('- "Made up." (skills/a/one.md:2) vs "Never run the check." (skills/a/two.md:1)');
    // ACT
    const problems = checkedQuoteProblems(file, main);
    // ASSERT
    expect(problems).toEqual([`quote not on skills/a/one.md:2 at ${sha}: "Made up."`]);
  });
  it('fails an unknown sha from any worktree', () => {
    // ARRANGE
    const { other, report, file } = fixture();
    report(PAIR, 'deadbeef');
    // ACT
    const problems = checkedQuoteProblems(file, other);
    // ASSERT
    expect(problems).toEqual(['unknown commit deadbeef in "Reviewed:"']);
  });
});

describe('edge cases', () => {
  it('gives the same result from another worktree', () => {
    // ARRANGE
    const { main, other, report, file } = fixture();
    report(PAIR);
    // ACT
    const fromOther = checkedQuoteProblems(file, other);
    // ASSERT
    expect(fromOther).toEqual(checkedQuoteProblems(file, main));
    expect(fromOther).toEqual([]);
  });
});
