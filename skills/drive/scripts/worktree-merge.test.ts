import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { withLock } from './lock.fixture.ts';
import { forkDateBeforeMerge, mergeIntoBase, type Timing, withMergeLock } from './worktree-merge.ts';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();
function giveRepositoryItsOwnIdentity(repository: string): void {
  git(repository, 'config', 'user.name', 't');
  git(repository, 'config', 'user.email', 't@t');
}
function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'wt-merge-')));
  const main = path.join(root, 'main');
  git(root, 'init', '-q', '-b', 'main', main);
  giveRepositoryItsOwnIdentity(main);
  writeFileSync(path.join(main, 'a.txt'), 'a');
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'init');
  git(main, 'branch', 'base');
  const baseTree = path.join(root, 'base-tree');
  const workTree = path.join(root, 'work-tree');
  git(main, 'worktree', 'add', '-q', baseTree, 'base');
  git(main, 'worktree', 'add', '-q', workTree, '-b', 'work', 'base');
  writeFileSync(path.join(workTree, 'work.txt'), 'w');
  git(workTree, 'add', '.');
  git(workTree, 'commit', '-qm', 'work');
  return { root, main, baseTree, workTree };
}
function addOtherBranch(root: string, main: string): void {
  const otherTree = path.join(root, 'other-tree');
  git(main, 'worktree', 'add', '-q', otherTree, '-b', 'other', 'base');
  writeFileSync(path.join(otherTree, 'other.txt'), 'o');
  git(otherTree, 'add', '.');
  git(otherTree, 'commit', '-qm', 'other');
}
function conflictOnA(baseTree: string, workTree: string): void {
  writeFileSync(path.join(workTree, 'a.txt'), 'from work');
  git(workTree, 'commit', '-aqm', 'edit a');
  writeFileSync(path.join(baseTree, 'a.txt'), 'from base');
  git(baseTree, 'commit', '-aqm', 'edit a on base');
}
function snapshot(tree: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(tree, { recursive: true, encoding: 'utf8' })) {
    const file = path.join(tree, name);
    if (name !== '.git' && statSync(file).isFile()) files[name] = readFileSync(file, 'base64');
  }
  files['<index>'] = readFileSync(git(tree, 'rev-parse', '--path-format=absolute', '--git-path', 'index'), 'base64');
  files['<HEAD>'] = git(tree, 'rev-parse', 'HEAD');
  return files;
}
function midMerge(main: string, baseTree: string): void {
  const sideTree = path.join(path.dirname(baseTree), 'side-tree');
  git(main, 'worktree', 'add', '-q', sideTree, '-b', 'side', 'base');
  writeFileSync(path.join(sideTree, 'a.txt'), 'from side');
  git(sideTree, 'commit', '-aqm', 'edit a on side');
  writeFileSync(path.join(baseTree, 'a.txt'), 'from base');
  git(baseTree, 'commit', '-aqm', 'edit a on base');
  expect(() => git(baseTree, 'merge', 'side')).toThrow();
  writeFileSync(path.join(baseTree, 'a.txt'), 'resolved by hand');
}
const inGitDir = (tree: string, name: string) =>
  existsSync(git(tree, 'rev-parse', '--path-format=absolute', '--git-path', name));
const SHORT_WAITS_FOR_A_BUSY_BASE: Timing = {
  pollMilliseconds: 50,
  timeoutMilliseconds: 4000,
};
function merging(cwd: string) {
  const lines: string[] = [];
  return { cwd, lines, withLock, log: (line: string) => void lines.push(line) };
}
async function waitingOnBusyBase(lines: string[]): Promise<void> {
  await vi.waitFor(() => expect(lines.join('\n')).toMatch(/busy/));
}
const MODULE = path.join(import.meta.dirname, 'worktree-merge.ts');
const LOCK = path.join(import.meta.dirname, 'lock.fixture.ts');
function mergeInChild(branch: string, cwd: string): Promise<{ code: number | null; output: string }> {
  const code = `import { mergeIntoBase } from ${JSON.stringify(MODULE)}; import { withLock } from ${JSON.stringify(LOCK)}; console.log(await mergeIntoBase(process.argv[1], 'base', { cwd: process.argv[2], log: console.log, withLock }));`;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code, branch, cwd], {
      encoding: 'utf8',
    } as never);
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (exit) => resolve({ code: exit, output }));
  });
}

describe('success cases', () => {
  describe('mergeIntoBase', () => {
    it('merges the branch into a base checked out in another worktree', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      // ACT
      const result = await mergeIntoBase('work', 'base', merging(main));
      // ASSERT
      expect(result).toBe('merged');
      expect(existsSync(path.join(baseTree, 'work.txt'))).toBe(true);
      expect(() => git(main, 'merge-base', '--is-ancestor', 'work', 'base')).not.toThrow();
    });

    it('reports an already merged branch without a new commit', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      await mergeIntoBase('work', 'base', merging(main));
      const head = git(baseTree, 'rev-parse', 'HEAD');
      // ACT
      const result = await mergeIntoBase('work', 'base', merging(main));
      // ASSERT
      expect(result).toBe('already-merged');
      expect(git(baseTree, 'rev-parse', 'HEAD')).toBe(head);
    });

    it('merges two branches finishing at once one after the other, the newer merge on top of the older, both into the base', async () => {
      // ARRANGE
      const { root, main } = fixture();
      addOtherBranch(root, main);
      const mergeCommits = 2;
      // ACT
      const results = await Promise.all([mergeInChild('work', main), mergeInChild('other', main)]);
      // ASSERT
      expect(
        results.map((r) => r.code),
        results.map((r) => r.output).join('\n'),
      ).toEqual([0, 0]);
      expect(git(main, 'rev-list', '--merges', '--first-parent', 'base').split('\n')).toHaveLength(mergeCommits);
      expect(() => git(main, 'merge-base', '--is-ancestor', 'work', 'base')).not.toThrow();
      expect(() => git(main, 'merge-base', '--is-ancestor', 'other', 'base')).not.toThrow();
    });
  });
  describe('forkDateBeforeMerge', () => {
    it("gives the committer date of the branch's merge-base with its base", () => {
      // ARRANGE
      const { main } = fixture();
      const forkCommit = git(main, 'rev-parse', 'base');
      const expected = new Date(git(main, 'show', '-s', '--format=%cI', forkCommit));
      // ACT
      const forked = forkDateBeforeMerge('work', 'base', main);
      // ASSERT
      expect(forked).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('mergeIntoBase', () => {
    it('throws when the base is checked out nowhere, merging nothing', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      git(main, 'worktree', 'remove', baseTree);
      const before = git(main, 'rev-parse', 'base');
      // ACT
      const run = mergeIntoBase('work', 'base', merging(main));
      // ASSERT
      await expect(run).rejects.toThrow(/not checked out/);
      expect(git(main, 'rev-parse', 'base')).toBe(before);
    });

    it("names the conflicting paths and leaves the base's files, index and tip byte-identical", async () => {
      // ARRANGE
      const { main, baseTree, workTree } = fixture();
      conflictOnA(baseTree, workTree);
      const before = snapshot(baseTree);
      // ACT
      const run = mergeIntoBase('work', 'base', merging(main));
      // ASSERT
      await expect(run).rejects.toThrow(/conflict[\s\S]*a\.txt/i);
      expect(snapshot(baseTree)).toEqual(before);
    });

    it('releases the merge lock when the merge fails, so the next merge into the base runs', async () => {
      // ARRANGE
      const { root, main, baseTree, workTree } = fixture();
      addOtherBranch(root, main);
      conflictOnA(baseTree, workTree);
      await expect(mergeIntoBase('work', 'base', merging(main))).rejects.toThrow(/conflict/i);
      // ACT
      const result = await mergeIntoBase('other', 'base', merging(main));
      // ASSERT
      expect(result).toBe('merged');
    });

    it('gives up after the timeout while the base is mid-rebase, leaving the rebase in progress', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      git(main, 'branch', 'onto', 'base');
      writeFileSync(path.join(baseTree, 'a.txt'), 'from base');
      git(baseTree, 'commit', '-aqm', 'edit a on base');
      git(main, 'worktree', 'add', '-q', path.join(path.dirname(baseTree), 'onto-tree'), 'onto');
      writeFileSync(path.join(path.dirname(baseTree), 'onto-tree', 'a.txt'), 'from onto');
      git(path.join(path.dirname(baseTree), 'onto-tree'), 'commit', '-aqm', 'edit a on onto');
      expect(() => git(baseTree, 'rebase', 'onto')).toThrow();
      // ACT
      const run = mergeIntoBase('work', 'base', {
        ...merging(main),
        pollMilliseconds: 50,
        timeoutMilliseconds: 300,
      });
      // ASSERT
      await expect(run).rejects.toThrow(/rebase/);
      expect(inGitDir(baseTree, 'rebase-merge')).toBe(true);
    });
  });
});

describe('edge cases', () => {
  describe('mergeIntoBase', () => {
    it('waits for a sync holding the merge lock of the base before merging into it', async () => {
      // ARRANGE
      const { main } = fixture();
      let child: Promise<{ code: number | null; output: string }> | undefined;
      // ACT
      await withMergeLock('base', merging(main), async () => {
        child = mergeInChild('work', main);
        await new Promise((resolve) => setTimeout(resolve, 500));
        // ASSERT
        expect(() => git(main, 'merge-base', '--is-ancestor', 'work', 'base')).toThrow();
      });
      const result = await child;
      expect(result?.code, result?.output).toBe(0);
      expect(result?.output).toMatch(/waiting for another merge into base/);
    });

    it('waits while the base is mid-merge, keeps the hand-resolved file, then merges once that merge is committed', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      midMerge(main, baseTree);
      const context = merging(main);
      const run = mergeIntoBase('work', 'base', {
        ...context,
        ...SHORT_WAITS_FOR_A_BUSY_BASE,
      });
      await waitingOnBusyBase(context.lines);
      expect(readFileSync(path.join(baseTree, 'a.txt'), 'utf8')).toBe('resolved by hand');
      expect(inGitDir(baseTree, 'MERGE_HEAD')).toBe(true);
      // ACT
      git(baseTree, 'commit', '-aq', '--no-edit');
      // ASSERT
      await expect(run).resolves.toBe('merged');
      expect(readFileSync(path.join(baseTree, 'a.txt'), 'utf8')).toBe('resolved by hand');
      expect(existsSync(path.join(baseTree, 'work.txt'))).toBe(true);
      expect(() => git(main, 'merge-base', '--is-ancestor', 'side', 'base')).not.toThrow();
    });

    it('merges onto the base tip as it is after the wait, not as it was before', async () => {
      // ARRANGE
      const { main, baseTree } = fixture();
      midMerge(main, baseTree);
      const context = merging(main);
      const run = mergeIntoBase('work', 'base', {
        ...context,
        ...SHORT_WAITS_FOR_A_BUSY_BASE,
      });
      await waitingOnBusyBase(context.lines);
      // ACT
      git(baseTree, 'merge', '--abort');
      writeFileSync(path.join(baseTree, 'c.txt'), 'c');
      git(baseTree, 'add', 'c.txt');
      git(baseTree, 'commit', '-qm', 'commit made during the wait');
      const moved = git(baseTree, 'rev-parse', 'HEAD');
      // ASSERT
      await expect(run).resolves.toBe('merged');
      expect(git(main, 'rev-parse', 'base^1')).toBe(moved);
      expect(git(main, 'rev-parse', 'base^2')).toBe(git(main, 'rev-parse', 'work'));
    });
  });
  describe('forkDateBeforeMerge', () => {
    it('gives null when the branch shares no history with the base', () => {
      // ARRANGE
      const { main } = fixture();
      git(main, 'checkout', '-q', '--orphan', 'unrelated');
      git(main, 'commit', '-q', '--allow-empty', '-m', 'unrelated root');
      // ACT
      const forked = forkDateBeforeMerge('unrelated', 'base', main);
      // ASSERT
      expect(forked).toBeNull();
    });
  });
});
