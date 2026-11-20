import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './helpers/commit-gate';

function withoutGitEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('GIT_')));
}

function runHook(hook: string, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-hooks-'));
  try {
    writeFileSync(
      join(dir, 'npm'),
      '#!/bin/sh\nprintf "npm:%s stdin:%s\\n" "$*" "$(cat)"\n[ "$*" != "$FAIL_COMMAND" ]\n',
    );
    writeFileSync(join(dir, 'git'), '#!/bin/sh\n[ "$NO_BASE" != 1 ] || exit 1\nprintf "base-sha\\n"\n');
    for (const command of ['npm', 'git']) chmodSync(join(dir, command), 0o755);
    return spawnSync('sh', [join(REPO_ROOT, '.husky', hook)], {
      cwd: REPO_ROOT,
      env: { ...withoutGitEnv(process.env), PATH: `${dir}:${process.env.PATH}`, ...env },
      input: 'refs/heads/topic local-sha refs/heads/topic remote-sha\n',
      encoding: 'utf8',
      timeout: 5000,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('harness hooks', () => {
  describe('success cases', () => {
    it('consumes Git refs and gives verify and changed slow tests closed stdin', () => {
      const result = runHook('pre-push');
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(
        'npm:run verify stdin:\nnpm:run -s test:slow -- --changed base-sha --passWithNoTests stdin:\n',
      );
    });

    it('runs the staged commit verification entry point', () => {
      expect(runHook('pre-commit').stdout).toContain('npm:run verify:commit');
    });
  });

  describe('failure cases', () => {
    it('stops before the slow lane when verify fails', () => {
      const result = runHook('pre-push', { FAIL_COMMAND: 'run verify' });
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('test:slow');
    });

    it('blocks a push when changed slow tests fail', () => {
      const result = runHook('pre-push', {
        FAIL_COMMAND: 'run -s test:slow -- --changed base-sha --passWithNoTests',
      });
      expect(result.status).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('runs the whole slow lane when no merge base is available', () => {
      const result = runHook('pre-push', { NO_BASE: '1' });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('npm:run -s test:slow stdin:\n');
      expect(result.stdout).not.toContain('--changed');
    });
  });
});
