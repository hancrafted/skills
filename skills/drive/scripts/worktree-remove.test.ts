import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { removeWorktree } from './worktree-remove.ts';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();
const write = (file: string, content: string) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
function fixture() {
  const main = path.join(realpathSync(mkdtempSync(path.join(tmpdir(), 'wt-remove-'))), 'main');
  git(path.dirname(main), 'init', '-q', '-b', 'main', main);
  write(path.join(main, '.gitignore'), 'node_modules/\n.worktrees/\n');
  write(path.join(main, 'a.txt'), 'a');
  write(path.join(main, 'src', 'b.txt'), 'b');
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'init');
  const target = path.join(main, '.worktrees', 'work');
  git(main, 'worktree', 'add', '-q', target, '-b', 'work');
  write(path.join(target, 'node_modules', 'pkg', 'index.js'), 'x');
  return { main, target };
}
const listed = (main: string, target: string) => git(main, 'worktree', 'list', '--porcelain').includes(target);
function interruptedRemoval(main: string, target: string): void {
  rmSync(path.join(target, '.git'));
  rmSync(path.join(target, 'a.txt'));
  write(path.join(target, 'src', '.DS_Store'), 'finder');
  write(path.join(target, '.DS_Store'), 'finder');
  git(main, 'worktree', 'prune');
}

describe('success cases', () => {
  describe('removeWorktree', () => {
    it('removes a clean worktree', () => {
      // ARRANGE
      const { main, target } = fixture();
      // ACT
      const result = removeWorktree(target, 'work', main);
      // ASSERT
      expect(result).toBe('removed');
      expect(existsSync(target)).toBe(false);
      expect(listed(main, target)).toBe(false);
    });

    it('clears what an interrupted removal left: committed files, ignored files and Finder metadata', () => {
      // ARRANGE
      const { main, target } = fixture();
      interruptedRemoval(main, target);
      // ACT
      const result = removeWorktree(target, 'work', main);
      // ASSERT
      expect(result).toBe('leftovers-cleared');
      expect(existsSync(target)).toBe(false);
    });
  });
});

describe('failure cases', () => {
  describe('removeWorktree', () => {
    it('refuses a worktree git still lists, such as one with untracked files, and keeps it', () => {
      // ARRANGE
      const { main, target } = fixture();
      write(path.join(target, 'notes.txt'), 'unsaved');
      // ACT
      const run = () => removeWorktree(target, 'work', main);
      // ASSERT
      expect(run).toThrow(/untracked/);
      expect(existsSync(path.join(target, 'notes.txt'))).toBe(true);
    });

    it('refuses leftovers holding work the branch does not have, naming each file, and keeps them', () => {
      // ARRANGE
      const { main, target } = fixture();
      interruptedRemoval(main, target);
      write(path.join(target, 'src', 'b.txt'), 'edited');
      write(path.join(target, 'src', 'new.txt'), 'new');
      // ACT
      const run = () => removeWorktree(target, 'work', main);
      // ASSERT
      expect(run).toThrow(/src\/b\.txt[\s\S]*src\/new\.txt/);
      expect(existsSync(path.join(target, 'src', 'new.txt'))).toBe(true);
    });
  });
});

describe('edge cases', () => {
  describe('removeWorktree', () => {
    it('accepts a worktree folder that is already gone, so a rerun continues', () => {
      // ARRANGE
      const { main, target } = fixture();
      git(main, 'worktree', 'remove', target);
      // ACT
      const result = removeWorktree(target, 'work', main);
      // ASSERT
      expect(result).toBe('gone');
    });
  });
});
