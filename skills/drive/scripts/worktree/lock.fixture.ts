import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { WithLock } from '../core/index.ts';
import { git } from '../core/index.ts';

function tryTake(lock: string): boolean {
  try {
    mkdirSync(lock);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

export const withLock: WithLock = async (
  name,
  { pollMilliseconds, timeoutMilliseconds, cwd = process.cwd(), onWait },
  fn,
) => {
  const common = path.resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir']).stdout.trim());
  const lock = path.join(common, 'fixture-locks', `${encodeURIComponent(name)}.lock`);
  mkdirSync(path.dirname(lock), { recursive: true });
  const deadline = Date.now() + timeoutMilliseconds;
  for (let round = 0; !tryTake(lock); round++) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for the lock "${name}"`);
    if (round === 0) onWait?.();
    await sleep(pollMilliseconds);
  }
  try {
    return await fn();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
};
