// `node evals/run.ts [--case architecture-round] [--runs 3]`: runs every case (default: all in the manifest) × arm × k headless, each in a fresh sandbox, saves
// the pages, transcript.jsonl and tools.json under evals/workspace/iteration-N/eval-<case>/<arm>/run-k/, grades
// each run, and writes skill-creator's benchmark and static viewer. Prints the review page's path.
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadCase, readManifest } from './runner/cases.ts';
import { finishIteration, nextFolder, SKILL } from './runner/iteration.ts';
import { assertFrozen, runJobs, type Job } from './runner/jobs.ts';

/** An arm is a skill folder to copy into the sandbox, or none. */
const ARMS: Record<string, string | null> = { with_skill: SKILL, without_skill: null };

const { values } = parseArgs({
  options: {
    case: { type: 'string', multiple: true, default: readManifest().cases.map(({ id }) => id) },
    arm: { type: 'string', multiple: true, default: Object.keys(ARMS) },
    runs: { type: 'string', default: '1' },
    model: { type: 'string' },
    'timeout-minutes': { type: 'string', default: '30' },
    parallel: { type: 'string', default: '2' },
  },
});

function plan(iteration: string): Job[] {
  const unknownArm = values.arm.find((arm) => !(arm in ARMS));
  if (unknownArm !== undefined) throw new Error(`no arm "${unknownArm}"; arms: ${Object.keys(ARMS).join(', ')}`);
  const runs = Array.from({ length: Number(values.runs) }, (_, index) => index + 1);
  return values.case.map(loadCase).flatMap((evalCase) =>
    values.arm.flatMap((arm) =>
      runs.map((run) => ({
        evalCase,
        arm,
        skill: ARMS[arm],
        run,
        runDir: path.join(iteration, `eval-${evalCase.id}`, arm, `run-${run}`),
      })),
    ),
  );
}

const iteration = nextFolder('iteration');
try {
  const jobs = plan(iteration);
  assertFrozen(jobs);
  await runJobs(jobs, {
    model: values.model,
    timeoutMs: Number(values['timeout-minutes']) * 60_000,
    parallel: Number(values.parallel),
  });
  console.log(`review: ${await finishIteration(iteration)}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
