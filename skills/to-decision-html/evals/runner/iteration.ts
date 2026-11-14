// An iteration folder, laid out as skill-creator expects: iteration-N/eval-<case>/<arm>/run-k/. Finishing it grades
// every run in one browser, then hands the folder to skill-creator's aggregation and viewer.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadChecks } from '../../scripts/grader/registry.ts';
import { launch } from '../../scripts/grader/run.ts';
import { gradeRun, type RunRecord } from './grade-run.ts';
import { referencesFor } from './reference.ts';
import { aggregateAndView } from './skill-creator.ts';

export const SKILL = path.resolve(import.meta.dirname, '../..');
export const WORKSPACE = path.join(SKILL, 'evals', 'workspace');

/** Every run folder (one holding run.json) under `root`, sorted. */
export function runDirs(root: string): string[] {
  if (existsSync(path.join(root, 'run.json'))) return [root];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === 'run.json')
    .map((entry) => entry.parentPath)
    .sort();
}

/** The next unused `<kind>-N` folder in the workspace: `iteration` for the benchmark, `sweep` for the fidelity sweep. */
export function nextFolder(kind: 'iteration' | 'sweep'): string {
  const pattern = new RegExp(`^${kind}-(\\d+)$`);
  const used = existsSync(WORKSPACE)
    ? readdirSync(WORKSPACE)
        .flatMap((name) => pattern.exec(name)?.[1] ?? [])
        .map(Number)
    : [];
  return path.join(WORKSPACE, `${kind}-${Math.max(0, ...used) + 1}`);
}

export async function gradeAll(dirs: readonly string[]): Promise<void> {
  const browser = await launch();
  const graders = { browser, checks: await loadChecks(), references: referencesFor(browser) };
  try {
    for (const dir of dirs) {
      const { summary } = await gradeRun(graders, dir);
      console.log(`graded ${path.relative(WORKSPACE, dir)}: ${summary.passed}/${summary.total}`);
    }
  } finally {
    graders.references.close();
    await graders.browser.close();
  }
}

const recordOf = (dir: string): RunRecord => JSON.parse(readFileSync(path.join(dir, 'run.json'), 'utf8')) as RunRecord;

/** Grades every run in the iteration, then writes benchmark.json, benchmark.md and review.html; returns the review. */
export async function finishIteration(iteration: string): Promise<string> {
  const dirs = runDirs(iteration);
  await gradeAll(dirs);
  const records = dirs.map(recordOf);
  return aggregateAndView(iteration, {
    skillPath: SKILL,
    model: [...new Set(records.map((record) => record.model ?? 'unknown'))].join(', '),
    runs: Math.max(...records.map((record) => record.run)),
    evalNames: Object.fromEntries(records.map((record) => [String(record.evalId), record.case])),
  });
}
