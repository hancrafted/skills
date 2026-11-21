import { describe, expect, it } from 'vitest';
import { COMMIT_PLAN, runPlan, VERIFY_PLAN, type Exec, type Plan } from './verify.pure.ts';

function fakeExec(codes: Readonly<Record<string, number>> = {}, outputs: Readonly<Record<string, string>> = {}) {
  const log: string[] = [];
  const exec: Exec = async (step) => {
    log.push(`start ${step.name}`);
    await new Promise((resolve) => setTimeout(resolve, 1));
    log.push(`end ${step.name}`);
    return { code: codes[step.name] ?? 0, output: outputs[step.name] ?? '', ms: 1500 };
  };
  return { exec, log };
}

const PLAN: Plan = {
  label: 'verify',
  phases: [
    [{ name: 'preflight', command: 'npm run preflight' }],
    [
      { name: 'lint', command: 'npm run lint' },
      { name: 'test', command: 'vitest run' },
    ],
  ],
};

describe('success cases', () => {
  it('runs every step of every phase and reports a pass', async () => {
    // ARRANGE
    const { exec, log } = fakeExec();
    const printed: string[] = [];
    const expectedRuns = ['preflight', 'lint', 'test'];
    const expectedVerdict = '✔ verify: PASS';
    // ACT
    const passed = await runPlan(PLAN, exec, (text) => printed.push(text));
    const ran = log.filter((line) => line.startsWith('end ')).map((line) => line.slice('end '.length));
    // ASSERT
    expect(passed).toBe(true);
    expect(ran.sort()).toEqual(expectedRuns.sort());
    expect(printed.at(-1)).toBe(expectedVerdict);
  });

  it('finishes the first phase before the next starts, and runs one phase’s steps side by side', async () => {
    // ARRANGE
    const { exec, log } = fakeExec();
    const expectedLog = ['start preflight', 'end preflight', 'start lint', 'start test', 'end lint', 'end test'];
    // ACT
    await runPlan(PLAN, exec, () => undefined);
    // ASSERT
    expect(log).toEqual(expectedLog);
  });
});

describe('failure cases', () => {
  it('stops before the next phase when a step fails, and names it', async () => {
    // ARRANGE
    const { exec, log } = fakeExec({ preflight: 1 });
    const printed: string[] = [];
    const expectedLog = ['start preflight', 'end preflight'];
    const expectedVerdict = '✖ verify: FAIL in preflight';
    // ACT
    const passed = await runPlan(PLAN, exec, (text) => printed.push(text));
    // ASSERT
    expect(passed).toBe(false);
    expect(log).toEqual(expectedLog);
    expect(printed.at(-1)).toBe(expectedVerdict);
  });

  it('lets every step of a failing phase finish, and names each one that failed', async () => {
    // ARRANGE
    const { exec, log } = fakeExec({ lint: 1, test: 2 });
    const printed: string[] = [];
    const expectedEnds = ['end preflight', 'end lint', 'end test'];
    const expectedVerdict = '✖ verify: FAIL in lint, test';
    // ACT
    await runPlan(PLAN, exec, (text) => printed.push(text));
    const ends = log.filter((line) => line.startsWith('end '));
    // ASSERT
    expect(ends).toEqual(expectedEnds);
    expect(printed.at(-1)).toBe(expectedVerdict);
  });

  it('prints a failing step’s output as one block under its line', async () => {
    // ARRANGE
    const lintOutput = 'skills/example/scripts/a.ts\n  1:1  error  no-unused-vars\n';
    const { exec } = fakeExec({ lint: 1 }, { lint: lintOutput, test: 'Tests 3 passed\n' });
    const printed: string[] = [];
    const expectedLintBlock = `✖ lint (1.5s)\n${lintOutput}`;
    const expectedTestLine = '✔ test (1.5s)';
    // ACT
    await runPlan(PLAN, exec, (text) => printed.push(text));
    // ASSERT
    expect(printed).toContain(expectedLintBlock);
    expect(printed).toContain(expectedTestLine);
  });
});

describe('edge cases', () => {
  it('checks skill frontmatter at every commit and in the full verify', () => {
    // ARRANGE
    const expectedCommand = 'npm run -s check:skills';
    const commands = (plan: Plan) => plan.phases.flat().map((step) => step.command);
    // ACT
    const commitCommands = commands(COMMIT_PLAN);
    const verifyCommands = commands(VERIFY_PLAN);
    // ASSERT
    expect(commitCommands).toContain(expectedCommand);
    expect(verifyCommands.some((command) => command.includes('check:docs'))).toBe(true);
  });

  it('fails the gate on archgate advisory findings, at every commit and in the full verify', () => {
    // ARRANGE
    const archgateCommands = (plan: Plan) =>
      plan.phases
        .flat()
        .filter((step) => step.name === 'archgate')
        .map((step) => step.command);
    // ACT
    const commitCommands = archgateCommands(COMMIT_PLAN);
    const verifyCommands = archgateCommands(VERIFY_PLAN);
    // ASSERT
    expect(commitCommands).toHaveLength(1);
    expect(commitCommands[0]).toContain('--strict');
    expect(verifyCommands).toEqual(['npm run -s archgate:full']);
  });

  it('reports a step that cannot start as failed, with the reason, while the rest of its phase finishes', async () => {
    // ARRANGE
    const { exec: inner, log } = fakeExec();
    const reason = 'spawn sh ENOENT';
    const exec: Exec = (step) => (step.name === 'lint' ? Promise.reject(new Error(reason)) : inner(step));
    const printed: string[] = [];
    const expectedLintBlock = `✖ lint (0.0s)\n${reason}\n`;
    const expectedVerdict = '✖ verify: FAIL in lint';
    const expectedCompletedStep = 'end test';
    // ACT
    const passed = await runPlan(PLAN, exec, (text) => printed.push(text));
    // ASSERT
    expect(passed).toBe(false);
    expect(log).toContain(expectedCompletedStep);
    expect(printed).toContain(expectedLintBlock);
    expect(printed.at(-1)).toBe(expectedVerdict);
  });
});
