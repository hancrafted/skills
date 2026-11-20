import { existsSync } from 'node:fs';
import path from 'node:path';
import { capture, fail, run } from '../core/index.ts';
import { notIntegrationBranch, readyProblem, reviewPath, topicOf } from './ready.pure.ts';

export function runReady(number: string): void {
  const branch = capture('gh', ['pr', 'view', number, '--json', 'headRefName', '--jq', '.headRefName']);
  const topic = topicOf(branch);
  if (topic === null) fail(notIntegrationBranch(branch));
  const root = path.dirname(path.resolve(capture('git', ['rev-parse', '--git-common-dir'])));
  const problem = readyProblem(topic, existsSync(path.join(root, reviewPath(topic))));
  if (problem !== null) fail(problem);
  const result = run('gh', ['pr', 'ready', number]);
  if (result.status !== 0) fail(`gh pr ready ${number} failed:\n${result.stderr}`);
  console.log(`✔ PR ${number} is ready for review`);
}
