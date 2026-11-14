// The verify runner's process adapter: runs one step's shell command and buffers everything it prints, so steps
// running side by side never interleave their output.
import { spawn } from 'node:child_process';
import type { Step, StepRun } from './verify.pure.ts';

export function runCommand(step: Step): Promise<StepRun> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    // stdin closed: archgate reads a non-TTY stdin as its file list (see .husky/pre-push).
    const child = spawn(step.command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', reject);
    child.on('close', (code) =>
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString('utf8'), ms: performance.now() - started }),
    );
  });
}
