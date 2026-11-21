import { spawnSync } from 'node:child_process';

export interface Outcome {
  status: number | null;
  stdout: string;
  stderr: string;
}

export type Gh = (args: readonly string[]) => Outcome;

export const run = (cmd: string, args: readonly string[], cwd?: string): Outcome => {
  const { status, stdout, stderr } = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { status, stdout, stderr };
};

export const realGh: Gh = (args) => run('gh', args);
