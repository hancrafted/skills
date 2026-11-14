// Runs eval jobs: each job is one agent session on one case and arm in a fresh sandbox. It saves the pages,
// transcript.jsonl, tools.json, timing.json and run.json into the job's run folder; grading comes after.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runAgent } from './agent.ts';
import { CASES, hashProblems, type EvalCase } from './cases.ts';
import type { RunRecord } from './grade-run.ts';
import { invocation } from './invocation.pure.ts';
import { collectPages, makeSandbox, skillDigest } from './sandbox.ts';
import { runFacts, toolCalls } from './transcript.pure.ts';

export interface Job {
  readonly evalCase: EvalCase;
  readonly arm: string;
  /** The skill folder the arm copies into the sandbox, or null for no skill. */
  readonly skill: string | null;
  readonly run: number;
  /** `<folder>/eval-<name>/<arm>/run-<k>`, where skill-creator's aggregation and viewer find it. */
  readonly runDir: string;
}

export interface JobOptions {
  readonly model: string | undefined;
  readonly timeoutMs: number;
  /** How many agents run at once. */
  readonly parallel: number;
}

const writeJson = (file: string, value: unknown) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/** Throws when any job's frozen inputs changed, before a single agent starts. */
export function assertFrozen(jobs: readonly Job[]): void {
  const problems = [...new Set(jobs.map((job) => job.evalCase))].flatMap((evalCase) =>
    hashProblems(CASES, evalCase.hashes),
  );
  if (problems.length > 0) throw new Error(`frozen inputs changed:\n${[...new Set(problems)].join('\n')}`);
}

function metadataOf({ evalCase }: Job) {
  const prompt = readFileSync(path.join(CASES, evalCase.prompt), 'utf8');
  return { eval_id: evalCase.evalId, eval_name: evalCase.id, prompt, assertions: [] };
}

/** Saves what the transcript says: tools.json for the isolation grader, timing.json for the aggregation. */
function saveTranscriptFacts(runDir: string) {
  const lines = readFileSync(path.join(runDir, 'transcript.jsonl'), 'utf8').split('\n');
  const facts = runFacts(lines);
  writeJson(path.join(runDir, 'tools.json'), toolCalls(lines));
  writeJson(path.join(runDir, 'timing.json'), {
    total_tokens: facts.tokens,
    total_duration_seconds: facts.durationSeconds,
    executor_duration_seconds: facts.durationSeconds,
    cost_usd: facts.costUsd,
  });
  return facts;
}

function prepare(job: Job): void {
  for (const dir of ['pages', 'outputs']) mkdirSync(path.join(job.runDir, dir), { recursive: true });
  writeJson(path.join(job.runDir, '..', '..', 'eval_metadata.json'), metadataOf(job));
  writeJson(path.join(job.runDir, 'eval_metadata.json'), metadataOf(job));
}

async function execute(job: Job, options: JobOptions): Promise<void> {
  const { evalCase, arm, skill, run, runDir } = job;
  prepare(job);
  const sandbox = makeSandbox(evalCase, skill);
  const [cwd] = sandbox.roots;
  console.log(`running ${path.join(...runDir.split(path.sep).slice(-3))} in ${cwd}`);
  await runAgent({
    cwd,
    prompt: invocation({ caseId: evalCase.id, inputs: sandbox.inputs, dir: cwd, withSkill: skill !== null }),
    transcript: path.join(runDir, 'transcript.jsonl'),
    model: options.model,
    timeoutMs: options.timeoutMs,
  });
  const { model } = saveTranscriptFacts(runDir);
  collectPages(sandbox, path.join(runDir, 'pages'));
  const record: RunRecord = {
    case: evalCase.id,
    evalId: evalCase.evalId,
    mode: evalCase.mode,
    model,
    arm,
    run,
    roots: sandbox.roots,
    skillDigest: skill === null ? null : skillDigest(skill),
    asked: evalCase.asked,
  };
  writeJson(path.join(runDir, 'run.json'), record);
}

/** Runs the jobs with at most `options.parallel` agents at a time. */
export async function runJobs(jobs: readonly Job[], options: JobOptions): Promise<void> {
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job !== undefined; job = queue.shift()) await execute(job, options);
  };
  await Promise.all(Array.from({ length: Math.min(options.parallel, jobs.length) }, worker));
}
