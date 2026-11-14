// The verify runner's judgement: which checks run, in which phase, and what to print. The process side lives in
// verify.ts; this file runs a plan against whatever `Exec` it is handed.

/** One check: the name a failure reports, and the shell command that runs it. */
export interface Step {
  name: string;
  command: string;
}

/** A named check run: its phases run in order, and the steps of one phase run at the same time. */
export interface Plan {
  label: string;
  phases: readonly (readonly Step[])[];
}

/** A finished step: its exit code, its stdout and stderr as one block, and how long it took. */
export interface StepRun {
  code: number;
  output: string;
  ms: number;
}

export type Exec = (step: Step) => Promise<StepRun>;

/** A step that runs one npm script: a failing line can be rerun as `npm run <script>`. */
function script(name: string, scriptName: string = name): Step {
  return { name, command: `npm run -s ${scriptName}` };
}

const BOUNDARIES = script('boundaries', 'lint:boundaries');
const TYPECHECK = script('typecheck');
const TEST = script('test');

/**
 * `npm run verify`: Archgate gates the rest, which run side by side. `lint` here is ESLint alone:
 * the `lint` script also runs the boundaries check, which is its own step so the two run side by side.
 */
export const VERIFY_PLAN: Plan = {
  label: 'verify',
  phases: [
    [script('archgate', 'archgate:full')],
    [
      { name: 'lint', command: 'eslint .' },
      BOUNDARIES,
      script('format', 'format:check'),
      TYPECHECK,
      TEST,
      script('knip'),
      script('docs', 'check:docs'),
    ],
  ],
};

/** `npm run verify:commit`: lint-staged rewrites staged files before the checks that read them. */
export const COMMIT_PLAN: Plan = {
  label: 'verify:commit',
  phases: [[script('lint-staged')], [{ name: 'archgate', command: 'archgate check' }], [TYPECHECK, TEST]],
};

/** A step's line once it finishes; a failing step carries its whole output beneath, never interleaved with another's. */
function stepReport(step: Step, run: StepRun): string {
  const took = `(${(run.ms / 1000).toFixed(1)}s)`;
  return run.code === 0 ? `✔ ${step.name} ${took}` : `✖ ${step.name} ${took}\n${run.output}`;
}

/** Runs `plan` phase by phase, printing one line per finished step, and resolves whether every step passed. */
export async function runPlan(plan: Plan, exec: Exec, print: (text: string) => void): Promise<boolean> {
  for (const phase of plan.phases) {
    const runs = await Promise.all(
      phase.map(async (step) => {
        const run = await exec(step).catch((error: unknown): StepRun => ({
          code: 1,
          output: `${error instanceof Error ? error.message : String(error)}\n`,
          ms: 0,
        }));
        print(stepReport(step, run));
        return { step, run };
      }),
    );
    const failed = runs.filter(({ run }) => run.code !== 0).map(({ step }) => step.name);
    if (failed.length > 0) {
      print(`✖ ${plan.label}: FAIL in ${failed.join(', ')}`);
      return false;
    }
  }
  print(`✔ ${plan.label}: PASS`);
  return true;
}
