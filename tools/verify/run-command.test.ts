import { describe, expect, it } from 'vitest';
import { runCommand } from './run-command.ts';

/** A shell command running a one-line Node script, so the test needs nothing but the Node it runs on. */
function node(script: string): string {
  return `node -e ${JSON.stringify(script)}`;
}

describe('success cases', () => {
  it('collects stdout and stderr into one buffer and passes a zero exit code', async () => {
    // ARRANGE
    const step = { name: 'both', command: node("process.stdout.write('out\\n'); process.stderr.write('err\\n')") };
    const expectedLines = ['out', 'err'];
    // ACT
    const run = await runCommand(step);
    const lines = run.output.trim().split('\n').sort();
    // ASSERT
    expect(run.code).toBe(0);
    expect(lines).toEqual(expectedLines.sort());
  });
});

describe('failure cases', () => {
  it('passes a non-zero exit code through', async () => {
    // ARRANGE
    const exitCode = 3;
    const step = { name: 'exits', command: node(`process.exit(${exitCode})`) };
    // ACT
    const run = await runCommand(step);
    // ASSERT
    expect(run.code).toBe(exitCode);
  });

  it('fails a command the shell cannot find, with the shell’s message', async () => {
    // ARRANGE
    const missing = 'verify-no-such-command';
    const step = { name: 'missing', command: missing };
    const notFound = 127;
    // ACT
    const run = await runCommand(step);
    // ASSERT
    expect(run.code).toBe(notFound);
    expect(run.output).toContain(missing);
  });
});

describe('edge cases', () => {
  it('hands the step a closed stdin, which archgate would otherwise read as its file list', async () => {
    // ARRANGE
    const step = {
      name: 'stdin',
      command: node(
        "let n = 0; process.stdin.on('data', (d) => (n += d.length)); process.stdin.on('end', () => console.log('read ' + n))",
      ),
    };
    const expectedOutput = 'read 0\n';
    // ACT
    const run = await runCommand(step);
    // ASSERT
    expect(run.output).toBe(expectedOutput);
  });
});
