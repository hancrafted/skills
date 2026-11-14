// `node evals/sweep.ts [--runs 3] [--rung diagram]`: the fidelity sweep. Runs architecture-round with the skill once per
// fidelity rung (default: all four) × k, each variant's calibration differing only in its Fidelity rung, under
// evals/workspace/sweep-N/eval-architecture-round-<rung>/with_skill/run-k/. Grades every run, then writes sweep.json and sweep.md:
// per rung, the runs whose page honoured the rung, and the judge and probe scores. `--regrade <sweep-dir>` grades
// and reports saved runs again without running any agent.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { asFidelityRung, FIDELITY_RUNGS, type FidelityRung } from '../scripts/grader/check.ts';
import { atFidelity, loadCase } from './runner/cases.ts';
import type { RunRecord } from './runner/grade-run.ts';
import type { Grading } from './runner/grading.pure.ts';
import { gradeAll, nextFolder, runDirs, SKILL } from './runner/iteration.ts';
import { assertFrozen, runJobs, type Job } from './runner/jobs.ts';
import { sweepMarkdown, sweepReport, type SweepRun } from './runner/sweep.pure.ts';

/** The case swept: its calibration asks one rung of every item. */
const CASE = 'architecture-round';
const ARM = 'with_skill';

const { values } = parseArgs({
  options: {
    rung: { type: 'string', multiple: true, default: [...FIDELITY_RUNGS] },
    runs: { type: 'string', default: '3' },
    model: { type: 'string' },
    'timeout-minutes': { type: 'string', default: '30' },
    parallel: { type: 'string', default: '4' },
    regrade: { type: 'string' },
  },
});

function rungs(): FidelityRung[] {
  return values.rung.map((value) => {
    const rung = asFidelityRung(value);
    if (rung === null) throw new Error(`no rung "${value}"; rungs: ${FIDELITY_RUNGS.join(', ')}`);
    return rung;
  });
}

function plan(sweep: string): Job[] {
  const frozen = loadCase(CASE);
  const runs = Array.from({ length: Number(values.runs) }, (_, index) => index + 1);
  return rungs().flatMap((rung) =>
    runs.map((run) => ({
      evalCase: atFidelity(frozen, rung),
      arm: ARM,
      skill: SKILL,
      run,
      runDir: path.join(sweep, `eval-${CASE}-${rung}`, ARM, `run-${run}`),
    })),
  );
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

/** Each graded run with the rung its calibration asked; a run that recorded none is left out. */
function sweptRuns(dirs: readonly string[]): SweepRun[] {
  return dirs.flatMap((dir) => {
    const rung = readJson<RunRecord>(path.join(dir, 'run.json')).asked?.fidelity;
    const { expectations } = readJson<Grading>(path.join(dir, 'grading.json'));
    return rung === undefined ? [] : [{ rung, expectations }];
  });
}

try {
  const sweep = values.regrade === undefined ? nextFolder('sweep') : path.resolve(values.regrade);
  if (values.regrade === undefined) {
    const jobs = plan(sweep);
    assertFrozen(jobs);
    await runJobs(jobs, {
      model: values.model,
      timeoutMs: Number(values['timeout-minutes']) * 60_000,
      parallel: Number(values.parallel),
    });
  }
  const dirs = runDirs(sweep);
  await gradeAll(dirs);
  const report = sweepReport(sweptRuns(dirs));
  const markdown = `# Fidelity sweep: ${CASE}, ${ARM}\n\n${sweepMarkdown(report)}\n`;
  writeFileSync(
    path.join(sweep, 'sweep.json'),
    `${JSON.stringify({ case: CASE, arm: ARM, rungs: report }, null, 2)}\n`,
  );
  writeFileSync(path.join(sweep, 'sweep.md'), markdown);
  console.log(`${markdown}\nreport: ${path.join(sweep, 'sweep.md')}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
