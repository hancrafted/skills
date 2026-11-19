import { spawn } from 'node:child_process';
import { describe, expect, it, onTestFinished } from 'vitest';
import { signalProcess } from './worktree-signal.ts';

const PID_ABOVE_EVERY_PLATFORM_MAXIMUM = 4_194_305;

describe('success cases', () => {
  it('sends the signal to the pid', async () => {
    // ARRANGE
    const child = spawn('sleep', ['30']);
    onTestFinished(() => void child.kill('SIGKILL'));
    if (child.pid === undefined) throw new Error('sleep did not start');
    const exitSignal = new Promise<NodeJS.Signals | null>((resolve) =>
      child.once('exit', (_code, signal) => resolve(signal)),
    );
    const signal = 'SIGTERM';
    // ACT
    signalProcess(child.pid, signal);
    // ASSERT
    await expect(exitSignal).resolves.toBe(signal);
  });
});

describe('failure cases', () => {
  it('throws when the process cannot be signalled for any reason but being gone', () => {
    // ARRANGE
    const unknownSignal = 'SIGNOPE' as NodeJS.Signals;
    // ACT
    const act = () => signalProcess(process.pid, unknownSignal);
    // ASSERT
    expect(act).toThrow('SIGNOPE');
  });
});

describe('edge cases', () => {
  it('does nothing for a process that is already gone', () => {
    // ARRANGE
    const gone = PID_ABOVE_EVERY_PLATFORM_MAXIMUM;
    // ACT
    const act = () => signalProcess(gone, 'SIGKILL');
    // ASSERT
    expect(act).not.toThrow();
  });
});
