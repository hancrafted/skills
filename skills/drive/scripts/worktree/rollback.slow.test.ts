import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const CLI = path.join(import.meta.dirname, '..', 'drive.ts');
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim();
function fixture(install: string, preflight: string) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-rollback-')));
  const origin = path.join(root, 'origin.git');
  const main = path.join(root, 'main');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(root, 'clone', '-q', origin, main);
  mkdirSync(path.join(main, 'docs', 'drive'), { recursive: true });
  writeFileSync(
    path.join(main, 'docs', 'drive', 'project.yml'),
    `worktree:\n  dir: .trees\n  baseBranch: main\n  invoke: drive worktree\n  install: [${install}]\n  preflight: "${preflight}"\n`,
  );
  writeFileSync(path.join(main, '.gitignore'), '.trees\n');
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'init');
  git(main, 'push', '-q', 'origin', 'main');
  return { main, folder: path.join(main, '.trees', 'feat-x') };
}
const wtNew = (cwd: string) =>
  spawnSync(process.execPath, [CLI, 'worktree', 'new', 'feat/x'], { cwd, encoding: 'utf8' });
const branches = (main: string) => git(main, 'branch', '--list', 'feat/x');

describe('success cases', () => {
  describe('drive worktree new', () => {
    it('keeps its branch and folder when every install step and the preflight pass', () => {
      // ARRANGE
      const { main, folder } = fixture('"true", "true"', 'true');
      // ACT
      const result = wtNew(main);
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(folder)).toBe(true);
      expect(branches(main)).toContain('feat/x');
    });
  });
});

describe('failure cases', () => {
  describe('drive worktree new', () => {
    it('removes its branch and folder when an install step fails, so the rerun starts clean', () => {
      // ARRANGE
      const { main, folder } = fixture('"true", "false"', 'true');
      // ACT
      const first = wtNew(main);
      // ASSERT
      expect(first.status).not.toBe(0);
      expect(first.stderr).toContain('install step failed');
      expect(existsSync(folder)).toBe(false);
      expect(branches(main)).toBe('');
      expect(git(main, 'worktree', 'list', '--porcelain')).not.toContain('feat-x');
    });
  });
});

describe('edge cases', () => {
  describe('drive worktree new', () => {
    it('keeps the worktree when only the preflight fails, as it says', () => {
      // ARRANGE
      const { main, folder } = fixture('"true"', 'false');
      // ACT
      const result = wtNew(main);
      // ASSERT
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('the worktree is left in place');
      expect(existsSync(folder)).toBe(true);
      expect(branches(main)).toContain('feat/x');
    });
  });
});
