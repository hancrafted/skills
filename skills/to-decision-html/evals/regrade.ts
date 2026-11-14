// `node evals/regrade.ts <iteration-dir | run-dir>`: regrades saved runs without rerunning any agent, for example
// after a grader changed. An iteration folder also gets a fresh benchmark and viewer; a lone run folder only its
// grading.json, printed as JSON.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { onePath } from '../scripts/grader/cli.ts';
import { finishIteration, gradeAll } from './runner/iteration.ts';

const dir = onePath('node evals/regrade.ts <iteration-dir | run-dir>');
if (existsSync(path.join(dir, 'run.json'))) {
  await gradeAll([dir]);
  console.log(readFileSync(path.join(dir, 'grading.json'), 'utf8'));
} else {
  console.log(`review: ${await finishIteration(path.resolve(dir))}`);
}
