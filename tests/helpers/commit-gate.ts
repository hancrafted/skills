import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const GATE = join(REPO_ROOT, 'skills/commit/scripts/commit-msg');
export const SETUP_HUSKY = join(REPO_ROOT, 'skills/commit/scripts/setup-husky');

/**
 * Ignore the developer's own git config so a global `core.commentChar` (or
 * anything else) can't change a verdict. Every git call in these tests — and
 * every git call the gate makes — runs through this.
 */
const HERMETIC_GIT: Record<string, string> = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

export interface RunResult {
  code: number;
  output: string;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * The gate claims to need nothing beyond POSIX shell, so which shell runs it is
 * swappable: `COMMIT_GATE_TEST_SH=/bin/dash npm test` re-runs the whole suite
 * against a stricter one.
 */
const SHELL = process.env.COMMIT_GATE_TEST_SH ?? 'sh';

/** Run a POSIX script and collapse both streams — the gate's whole contract is exit code + explanation. */
export function runScript(script: string, args: string[], options: RunOptions = {}): RunResult {
  const result = spawnSync(SHELL, [script, ...args], {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...HERMETIC_GIT, ...options.env },
    encoding: 'utf8',
  });
  return { code: result.status ?? -1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** A throwaway directory that is deliberately *not* a git repository. */
export function createDir(): string {
  return mkdtempSync(join(tmpdir(), 'commit-gate-plain-'));
}

/** A throwaway git repository, so git-state probes and config reads are hermetic. */
export function createRepo(config: Record<string, string> = {}): string {
  const dir = createDir();
  git(dir, ['init', '-q', '-b', 'main']);
  for (const [key, value] of Object.entries(config)) git(dir, ['config', key, value]);
  return dir;
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, env: { ...process.env, ...HERMETIC_GIT }, encoding: 'utf8' });
  return result.stdout ?? '';
}

/** Read a git config value the same hermetic way the gate will read it. */
export function gitConfig(dir: string, key: string): string {
  return git(dir, ['config', '--get', key]).trim();
}

/** Write `message` to a file and hand its path to the gate — the one seam under test. */
export function runGate(message: string, options: RunOptions = {}): RunResult {
  const dir = mkdtempSync(join(tmpdir(), 'commit-gate-msg-'));
  const file = join(dir, 'COMMIT_EDITMSG');
  writeFileSync(file, message);
  return runScript(GATE, [file], options);
}

/**
 * The one definition of the `.husky/commit-msg` body, read straight out of
 * lib/hook.sh. Two other places reproduce it — the asset doc and this repo's own
 * wired hook — and a test holds all three to this.
 */
export function canonicalHookBody(): string {
  const result = spawnSync(SHELL, ['-c', '. skills/commit/scripts/lib/hook.sh && gate_hook_body'], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...HERMETIC_GIT },
    encoding: 'utf8',
  });
  return result.stdout ?? '';
}

export const SOURCE_TRAILER = 'Source: https://github.com/hancrafted/skills/issues/1 | wire up the commit gate';

/** Compose a compliant message, overriding one part at a time. */
export function message(header: string, body = '### Added\n1. Add the gate.', trailers = SOURCE_TRAILER): string {
  return `${header}\n\n${body}\n\n${trailers}\n`;
}
