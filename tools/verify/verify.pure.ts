export interface Step {
  name: string;
  command: string;
}

export interface Plan {
  label: string;
  phases: readonly (readonly Step[])[];
}

export interface StepRun {
  code: number;
  output: string;
  ms: number;
}

export type Exec = (step: Step) => Promise<StepRun>;

function script(name: string, scriptName: string = name): Step {
  return { name, command: `npm run -s ${scriptName}` };
}

const BOUNDARIES = script('boundaries', 'lint:boundaries');
const TYPECHECK = script('typecheck');
const TEST = script('test');
const ESLINT_ALONE_BECAUSE_BOUNDARIES_IS_ITS_OWN_STEP: Step = { name: 'lint', command: 'eslint .' };

export const VERIFY_PLAN: Plan = {
  label: 'verify',
  phases: [
    [script('archgate', 'archgate:full')],
    [
      ESLINT_ALONE_BECAUSE_BOUNDARIES_IS_ITS_OWN_STEP,
      BOUNDARIES,
      script('format', 'format:check'),
      TYPECHECK,
      TEST,
      script('knip'),
      script('docs', 'check:docs'),
    ],
  ],
};

export const COMMIT_PLAN: Plan = {
  label: 'verify:commit',
  phases: [
    [script('lint-staged')],
    [{ name: 'archgate', command: 'archgate check --strict' }],
    [TYPECHECK, TEST, script('skills', 'check:skills')],
  ],
};

function stepReport(step: Step, run: StepRun): string {
  const took = `(${(run.ms / 1000).toFixed(1)}s)`;
  return run.code === 0 ? `✔ ${step.name} ${took}` : `✖ ${step.name} ${took}\n${run.output}`;
}

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
