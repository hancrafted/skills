import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const GATE = join(REPO_ROOT, 'skills/commit/scripts/commit-msg');
export const SETUP_HUSKY = join(REPO_ROOT, 'skills/commit/scripts/setup-husky');

const HERMETIC_GIT: Record<string, string> = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

function hermeticEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const inherited = Object.entries({ ...process.env, ...extra }).filter(([key]) => !key.startsWith('GIT_'));
  return { ...Object.fromEntries(inherited), ...HERMETIC_GIT };
}

export interface RunResult {
  code: number;
  output: string;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

const POSIX_SHELL_SWAPPABLE_BY_COMMIT_GATE_TEST_SH = process.env.COMMIT_GATE_TEST_SH ?? 'sh';

export function runScript(script: string, args: string[], options: RunOptions = {}): RunResult {
  const result = spawnSync(POSIX_SHELL_SWAPPABLE_BY_COMMIT_GATE_TEST_SH, [script, ...args], {
    cwd: options.cwd ?? REPO_ROOT,
    env: hermeticEnv(options.env),
    encoding: 'utf8',
  });
  return { code: result.status ?? -1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

export function createDir(): string {
  return mkdtempSync(join(tmpdir(), 'commit-gate-plain-'));
}

export function createRepo(config: Record<string, string> = {}): string {
  const dir = createDir();
  git(dir, ['init', '-q', '-b', 'main']);
  for (const [key, value] of Object.entries(config)) git(dir, ['config', key, value]);
  return dir;
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, env: hermeticEnv(), encoding: 'utf8' });
  return result.stdout ?? '';
}

export function gitConfig(dir: string, key: string): string {
  return git(dir, ['config', '--get', key]).trim();
}

export function runGate(message: string, options: RunOptions = {}): RunResult {
  const dir = mkdtempSync(join(tmpdir(), 'commit-gate-msg-'));
  const file = join(dir, 'COMMIT_EDITMSG');
  writeFileSync(file, message);
  return runScript(GATE, [file], options);
}

export function canonicalHookBody(): string {
  const result = spawnSync(
    POSIX_SHELL_SWAPPABLE_BY_COMMIT_GATE_TEST_SH,
    ['-c', '. skills/commit/scripts/lib/hook.sh && gate_hook_body'],
    {
      cwd: REPO_ROOT,
      env: hermeticEnv(),
      encoding: 'utf8',
    },
  );
  return result.stdout ?? '';
}

export const SOURCE_TRAILER = 'Source: https://github.com/hancrafted/skills/issues/1 | wire up the commit gate';

export function message(header: string, body = '### Added\n1. Add the gate.', trailers = SOURCE_TRAILER): string {
  return `${header}\n\n${body}\n\n${trailers}\n`;
}
