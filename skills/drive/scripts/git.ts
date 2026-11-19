import { spawnSync } from 'node:child_process';

interface RunOptions {
  cwd?: string;
  input?: string;
}

export const run = (cmd: string, args: readonly string[], { cwd, input }: RunOptions = {}) =>
  spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    input,
    maxBuffer: 256 * 1024 * 1024,
  });

export const git = (cwd: string, args: readonly string[], input?: string) => run('git', args, { cwd, input });

export function capture(cmd: string, args: readonly string[], cwd?: string): string {
  const result = run(cmd, args, { cwd });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

export function stream(cmd: string, args: readonly string[], cwd?: string): void {
  const { status } = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${status})`);
}
