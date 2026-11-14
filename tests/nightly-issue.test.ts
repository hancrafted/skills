import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './helpers/commit-gate';

function fileFinding(env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'nightly-issue-'));
  try {
    const gh = join(dir, 'gh');
    writeFileSync(
      gh,
      '#!/bin/sh\ncase "$*" in\n"issue list"*) [ "$LIST_FAIL" != 1 ] || exit 7; printf "%s" "$OPEN_ISSUE";;\n*) printf "gh:%s\\n" "$*";;\nesac\n',
    );
    chmodSync(gh, 0o755);
    return spawnSync(
      'sh',
      [join(REPO_ROOT, 'tools/test-budget/file-issue.sh'), 'Budget finding', 'Slow test details'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          GITHUB_REPOSITORY: 'hancrafted/skills',
          ...env,
        },
        encoding: 'utf8',
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('nightly issue reporting', () => {
  describe('success cases', () => {
    it('opens a triage issue when the finding has no open issue', () => {
      const result = fileFinding();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        'issue create --title Budget finding --label needs-triage --body Slow test details',
      );
    });

    it('comments on an existing finding without creating a duplicate', () => {
      const result = fileFinding({ OPEN_ISSUE: '42' });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('issue comment 42 --body Slow test details');
      expect(result.stdout).not.toContain('issue create');
    });
  });

  describe('failure cases', () => {
    it('does not create an issue when GitHub could not list existing findings', () => {
      const result = fileFinding({ LIST_FAIL: '1' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('issue create');
    });
  });

  describe('edge cases', () => {
    it('targets the workflow repository explicitly', () => {
      expect(fileFinding().stdout).toContain('--repo hancrafted/skills');
    });
  });
});
