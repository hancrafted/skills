import { existsSync } from 'node:fs';
import path from 'node:path';
import { capture, fail, run } from '../core/index.ts';
import { checkedQuoteProblems } from '../review/index.ts';
import {
  baseAheadProblem,
  notIntegrationBranch,
  quoteRefusal,
  readyProblem,
  reviewPath,
  topicOf,
} from './ready.pure.ts';

export function runReady(number: string): void {
  const branch = capture('gh', ['pr', 'view', number, '--json', 'headRefName', '--jq', '.headRefName']);
  const topic = topicOf(branch);
  if (topic === null) fail(notIntegrationBranch(branch));
  const root = path.dirname(path.resolve(capture('git', ['rev-parse', '--git-common-dir'])));
  const problem = readyProblem(topic, existsSync(path.join(root, reviewPath(topic))));
  if (problem !== null) fail(problem);
  const quotes = quoteRefusal(topic, checkedQuoteProblems(path.join(root, reviewPath(topic))));
  if (quotes !== null) fail(quotes);
  const base = capture('gh', ['pr', 'view', number, '--json', 'baseRefName', '--jq', '.baseRefName']);
  const fetched = run('git', ['fetch', '--quiet', 'origin', base]);
  if (fetched.status !== 0) fail(`git fetch origin ${base} failed:\n${fetched.stderr}`);
  const ahead = Number(capture('git', ['rev-list', '--count', `${branch}..origin/${base}`]));
  const behind = baseAheadProblem(base, ahead);
  if (behind !== null) fail(behind);
  const result = run('gh', ['pr', 'ready', number]);
  if (result.status !== 0) fail(`gh pr ready ${number} failed:\n${result.stderr}`);
  console.log(`✔ PR ${number} is ready for review`);
}
