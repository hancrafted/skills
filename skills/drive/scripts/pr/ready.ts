import { existsSync } from 'node:fs';
import path from 'node:path';
import { capture, fail, run } from '../core/index.ts';
import { checkedQuoteProblems } from '../review/index.ts';
import {
  baseAheadProblem,
  intentDriftProblem,
  noBaseBranch,
  notIntegrationBranch,
  quoteRefusal,
  readyProblem,
  reviewPath,
  topicOf,
} from './ready.pure.ts';

function ghField(number: string, field: string): string {
  const result = run('gh', ['pr', 'view', number, '--json', field, '--jq', `.${field}`]);
  if (result.status !== 0) fail(`gh pr view ${number} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function commitsMissingOnOrigin(base: string, branch: string): number {
  const fetched = run('git', ['fetch', '--quiet', 'origin', base, branch]);
  if (fetched.status !== 0) fail(`git fetch origin ${base} ${branch} failed:\n${fetched.stderr}`);
  const counted = run('git', ['rev-list', '--count', `origin/${branch}..origin/${base}`]);
  if (counted.status !== 0) fail(`git rev-list origin/${branch}..origin/${base} failed:\n${counted.stderr}`);
  return Number(counted.stdout.trim());
}

function failOnIntentDrift(number: string): void {
  const drift = intentDriftProblem(ghField(number, 'body'));
  if (drift !== null) fail(drift);
}

export function runReady(number: string): void {
  const branch = ghField(number, 'headRefName');
  const topic = topicOf(branch);
  if (topic === null) fail(notIntegrationBranch(branch));
  const root = path.dirname(path.resolve(capture('git', ['rev-parse', '--git-common-dir'])));
  const problem = readyProblem(topic, existsSync(path.join(root, reviewPath(topic))));
  if (problem !== null) fail(problem);
  const quotes = quoteRefusal(topic, checkedQuoteProblems(path.join(root, reviewPath(topic))));
  if (quotes !== null) fail(quotes);
  failOnIntentDrift(number);
  const base = ghField(number, 'baseRefName');
  if (base === '') fail(noBaseBranch(number));
  const behind = baseAheadProblem(base, branch, commitsMissingOnOrigin(base, branch));
  if (behind !== null) fail(behind);
  const result = run('gh', ['pr', 'ready', number]);
  if (result.status !== 0) fail(`gh pr ready ${number} failed:\n${result.stderr}`);
  console.log(`✔ PR ${number} is ready for review`);
}
