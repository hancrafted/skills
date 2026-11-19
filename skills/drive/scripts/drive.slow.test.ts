import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const CLI = path.join(import.meta.dirname, 'drive.ts');
const LOCK = path.join(import.meta.dirname, 'lock.fixture.ts');
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();
const drive = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [CLI, 'worktree', ...args], {
    cwd,
    encoding: 'utf8',
  });
const driveAsync = (cwd: string, ...args: string[]): Promise<{ status: number | null; out: string }> =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, 'worktree', ...args], { cwd });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (out += chunk));
    child.on('close', (status) => resolve({ status, out }));
  });
const CONFIG = (lock: string) =>
  [
    'worktree:',
    '  dir: .trees',
    '  baseBranch: main',
    '  invoke: drive worktree',
    '  install: [touch installed]',
    '  preflight: echo preflight-ran > ../preflight-$(basename $PWD).txt',
    `  lock: ${lock}`,
    '  beforeRemove: ["echo before $DRIVE_BRANCH > $DRIVE_ROOT/before.txt"]',
    '  afterMerge: ["echo $DRIVE_BASE $DRIVE_BRANCH > $DRIVE_ROOT/merged.txt"]',
    '  afterRemove: ["echo after > $DRIVE_ROOT/after.txt"]',
  ].join('\n');
function fixture(lock = LOCK) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-cli-')));
  const origin = path.join(root, 'origin.git');
  const main = path.join(root, 'main');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(root, 'clone', '-q', origin, main);
  git(main, 'config', 'user.name', 't');
  git(main, 'config', 'user.email', 't@t');
  mkdirSync(path.join(main, 'docs', 'drive'), { recursive: true });
  writeFileSync(path.join(main, 'docs', 'drive', 'project.yml'), CONFIG(lock));
  writeFileSync(path.join(main, '.gitignore'), '.trees\ninstalled\nbefore.txt\nafter.txt\nmerged.txt\n');
  writeFileSync(path.join(main, 'a.txt'), 'a');
  git(main, 'add', '.');
  git(main, 'commit', '-qm', 'init');
  git(main, 'push', '-q', 'origin', 'main');
  return { root, main, trees: path.join(main, '.trees') };
}
const PASSING_REPORT = '## Acceptance criteria\n- [x] built — evidence\n';
function writeReport(main: string, branch: string, text: string): void {
  const [parent, task] = branch.split('--');
  const file = path.join(main, '.scratch', parent?.split('/').pop() ?? '', `${task}.report.md`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}
function task(main: string, branch: string, base: string | null): string {
  if (branch.includes('--')) writeReport(main, branch, PASSING_REPORT);
  const file = `${branch.replaceAll('/', '-')}.txt`;
  const result = drive(main, 'new', branch, ...(base === null ? [] : ['--base', base]));
  expect(result.status).toBe(0);
  const tree = path.join(main, '.trees', branch.replaceAll('/', '-'));
  writeFileSync(path.join(tree, file), file);
  git(tree, 'add', '.');
  git(tree, 'commit', '-qm', `add ${file}`);
  return tree;
}
const driveGroup = (cwd: string, group: string[], env: NodeJS.ProcessEnv = process.env) =>
  spawnSync(process.execPath, [CLI, ...group], { cwd, encoding: 'utf8', env });
const stubbedGh = (views: object[]) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'drive-gh-'));
  const state = path.join(dir, 'count');
  writeFileSync(state, '0');
  views.forEach((view, index) => writeFileSync(path.join(dir, `view${index}.json`), JSON.stringify(view)));
  writeFileSync(
    path.join(dir, 'gh'),
    `#!/bin/sh\n[ "$1" = api ] && { echo '[[]]'; exit 0; }\nn=$(cat ${state})\nlast=${views.length - 1}\n[ "$n" -gt "$last" ] && n=$last\ncat ${dir}/view$n.json\necho $((n + 1)) > ${state}\n`,
    { mode: 0o755 },
  );
  return { ...process.env, PATH: `${dir}:${process.env.PATH}` };
};
const watch = (views: object[]) => {
  const { main } = fixture();
  return driveGroup(main, ['pr', 'watch', '7', '--poll-milliseconds', '10'], stubbedGh(views));
};
const open = { state: 'OPEN', mergeCommit: null, reviews: [], comments: [] };

describe('success cases', () => {
  describe('drive worktree', () => {
    it('new makes a worktree under the configured folder and runs the install steps in it', () => {
      // ARRANGE
      const { main, trees } = fixture();
      // ACT
      const result = drive(main, 'new', 'feat/x');
      // ASSERT
      expect(result.status).toBe(0);
      expect(existsSync(path.join(trees, 'feat-x', 'installed'))).toBe(true);
      expect(git(path.join(trees, 'feat-x'), 'branch', '--show-current')).toBe('feat/x');
    });

    it('new --base starts a subagent branch from its parent without a fetch', () => {
      // ARRANGE
      const { main } = fixture();
      drive(main, 'new', 'feat/x');
      // ACT
      const result = drive(main, 'new', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status).toBe(0);
      expect(git(main, 'rev-parse', 'feat/x--1-task')).toBe(git(main, 'rev-parse', 'feat/x'));
    });

    it('done --base merges with a merge commit, runs the hooks with their environment and removes branch and worktree', () => {
      // ARRANGE
      const { main, trees } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-task', 'feat/x');
      // ACT
      const result = drive(main, 'done', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(tree)).toBe(false);
      expect(existsSync(path.join(trees, 'feat-x', 'feat-x--1-task.txt'))).toBe(true);
      expect(git(main, 'rev-list', '--merges', '--count', 'feat/x')).toBe('1');
      expect(git(main, 'branch', '--list', 'feat/x--1-task')).toBe('');
      expect(readFileSync(path.join(main, 'merged.txt'), 'utf8').trim()).toBe('feat/x feat/x--1-task');
      expect(readFileSync(path.join(main, 'before.txt'), 'utf8').trim()).toBe('before feat/x--1-task');
      expect(readFileSync(path.join(main, 'after.txt'), 'utf8').trim()).toBe('after');
    });

    it('done removes the folder when Finder drops a .DS_Store into it during teardown', () => {
      // ARRANGE
      const { main, root } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-task', 'feat/x');
      const realGit = execFileSync('which', ['git'], {
        encoding: 'utf8',
      }).trim();
      const shim = path.join(root, 'bin', 'git');
      mkdirSync(path.dirname(shim), { recursive: true });
      writeFileSync(
        shim,
        [
          '#!/bin/sh',
          `"${realGit}" "$@" || exit $?`,
          'if [ "$1" = worktree ] && [ "$2" = remove ]; then',
          '  mkdir -p "$3" && touch "$3/.DS_Store"',
          '  echo "error: failed to delete: Directory not empty" >&2',
          '  exit 1',
          'fi',
        ].join('\n'),
        { mode: 0o755 },
      );
      // ACT
      const result = spawnSync(process.execPath, [CLI, 'worktree', 'done', 'feat/x--1-task', '--base', 'feat/x'], {
        cwd: main,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${path.dirname(shim)}${path.delimiter}${process.env.PATH}`,
        },
      });
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(tree)).toBe(false);
      expect(git(main, 'branch', '--list', 'feat/x--1-task')).toBe('');
    });

    it('done without --base removes the worktree and fast-forwards local main from the remote', () => {
      // ARRANGE
      const { main, root } = fixture();
      const tree = task(main, 'feat/y', null);
      git(tree, 'push', '-q', 'origin', 'feat/y:main');
      // ACT
      const result = drive(main, 'done', 'feat/y');
      // ASSERT
      expect(result.status).toBe(0);
      expect(existsSync(tree)).toBe(false);
      expect(git(main, 'rev-parse', 'main')).toBe(git(root, '--git-dir', 'origin.git', 'rev-parse', 'main'));
      expect(existsSync(path.join(main, 'feat-y.txt'))).toBe(true);
    });

    it('two subagents finishing into the same integration branch at once both merge, one after the other', async () => {
      // ARRANGE
      const { main } = fixture();
      drive(main, 'new', 'feat/x');
      task(main, 'feat/x--1-a', 'feat/x');
      task(main, 'feat/x--2-b', 'feat/x');
      // ACT
      const runs = await Promise.all([
        driveAsync(main, 'done', 'feat/x--1-a', '--base', 'feat/x'),
        driveAsync(main, 'done', 'feat/x--2-b', '--base', 'feat/x'),
      ]);
      // ASSERT
      expect(runs.map((run) => run.status)).toEqual([0, 0]);
      expect(git(main, 'rev-list', '--merges', '--count', 'feat/x')).toBe('2');
      expect(existsSync(path.join(main, '.trees', 'feat-x', 'feat-x--1-a.txt'))).toBe(true);
      expect(existsSync(path.join(main, '.trees', 'feat-x', 'feat-x--2-b.txt'))).toBe(true);
    });

    it('sync merges the base into the worktree branch', () => {
      // ARRANGE
      const { main, trees } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-a', 'feat/x');
      writeFileSync(path.join(trees, 'feat-x', 'base.txt'), 'b');
      git(path.join(trees, 'feat-x'), 'add', '.');
      git(path.join(trees, 'feat-x'), 'commit', '-qm', 'base moves');
      // ACT
      const synced = drive(tree, 'sync', '--base', 'feat/x');
      // ASSERT
      expect(synced.status).toBe(0);
      expect(existsSync(path.join(tree, 'base.txt'))).toBe(true);
    });

    it('runs the configured preflight in the new worktree after install', () => {
      // ARRANGE
      const { main, trees } = fixture();
      // ACT
      const result = drive(main, 'new', 'feat/x');
      // ASSERT
      expect(result.status).toBe(0);
      expect(readFileSync(path.join(trees, 'preflight-feat-x.txt'), 'utf8')).toContain('preflight-ran');
    });

    it('warns that merges are not serialized when the config has no lock', () => {
      // ARRANGE
      const { main } = fixture();
      const config = path.join(main, 'docs', 'drive', 'project.yml');
      writeFileSync(config, readFileSync(config, 'utf8').replace(/ {2}lock: .*\n?/, ''));
      git(main, 'commit', '-qam', 'no lock');
      git(main, 'push', '-q', 'origin', 'main');
      // ACT
      const result = drive(main, 'new', 'feat/x');
      // ASSERT
      expect(result.status).toBe(0);
      expect(result.stderr).toContain('merges into a base are not serialized');
    });
  });
  describe('drive push', () => {
    it('pushes a branch with no upstream, sets it and prints old..new', () => {
      // ARRANGE
      const { main } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = path.join(main, '.trees', 'feat-x');
      // ACT
      const pushed = driveGroup(tree, ['push']);
      // ASSERT
      expect(pushed.status, pushed.stderr).toBe(0);
      const head = git(tree, 'rev-parse', 'HEAD');
      expect(pushed.stdout).toContain(`✔ pushed feat/x 0000000..${head.slice(0, 7)}`);
      expect(git(tree, 'ls-remote', 'origin', 'refs/heads/feat/x')).toContain(head);
    });
  });
  describe('drive pr watch', () => {
    it('exits 0 with the merge commit when the PR merges', () => {
      // ARRANGE
      // ACT
      const result = watch([open, { ...open, state: 'MERGED', mergeCommit: { oid: 'abc' } }]);
      // ASSERT
      expect([result.status, result.stdout.trim()]).toEqual([0, 'merged abc']);
    });
  });
});

describe('failure cases', () => {
  describe('drive worktree', () => {
    it('reports a failing preflight, exits non-zero and leaves the worktree in place', () => {
      // ARRANGE
      const { main, trees } = fixture();
      const config = path.join(main, 'docs', 'drive', 'project.yml');
      writeFileSync(config, readFileSync(config, 'utf8').replace(/ {2}preflight: .*/, '  preflight: exit 4'));
      git(main, 'commit', '-qam', 'failing preflight');
      git(main, 'push', '-q', 'origin', 'main');
      // ACT
      const result = drive(main, 'new', 'feat/x');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('preflight failed');
      expect(existsSync(path.join(trees, 'feat-x'))).toBe(true);
    });

    it('refuses a subagent branch without its parent as --base and names the configured invocation', () => {
      // ARRANGE
      const { main } = fixture();
      // ACT
      const result = drive(main, 'new', 'feat/x--1-a');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('run: drive worktree new feat/x--1-a --base feat/x');
    });

    it('stops a finish when a beforeRemove hook fails, leaving the worktree', () => {
      // ARRANGE
      const { main } = fixture();
      const config = path.join(main, 'docs', 'drive', 'project.yml');
      writeFileSync(config, readFileSync(config, 'utf8').replace(/beforeRemove: .*/, 'beforeRemove: ["exit 3"]'));
      git(main, 'commit', '-qam', 'failing hook');
      git(main, 'push', '-q', 'origin', 'main');
      const tree = task(main, 'feat/z', null);
      git(tree, 'push', '-q', 'origin', 'feat/z:main');
      // ACT
      const result = drive(main, 'done', 'feat/z');
      // ASSERT
      expect(result.status).toBe(1);
      expect(existsSync(tree)).toBe(true);
    });

    it('runs beforeMerge in the Task worktree and merges when it passes', () => {
      // ARRANGE
      const { main } = fixture();
      const config = path.join(main, 'docs', 'drive', 'project.yml');
      writeFileSync(
        config,
        readFileSync(config, 'utf8').replace(
          '  beforeRemove',
          '  beforeMerge: ["echo ran-in $(pwd -P)"]\n  beforeRemove',
        ),
      );
      git(main, 'commit', '-qam', 'hook');
      git(main, 'push', '-q', 'origin', 'main');
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-task', 'feat/x');
      // ACT
      const result = drive(main, 'done', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`ran-in ${tree}`);
      expect(git(main, 'rev-list', '--merges', '--count', 'feat/x')).toBe('1');
    });

    it('leaves the Task branch unmerged and the worktree in place when a beforeMerge hook fails', () => {
      // ARRANGE
      const { main } = fixture();
      const config = path.join(main, 'docs', 'drive', 'project.yml');
      writeFileSync(
        config,
        readFileSync(config, 'utf8').replace('  beforeRemove', '  beforeMerge: ["exit 3"]\n  beforeRemove'),
      );
      git(main, 'commit', '-qam', 'failing hook');
      git(main, 'push', '-q', 'origin', 'main');
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-task', 'feat/x');
      const baseTip = git(main, 'rev-parse', 'feat/x');
      // ACT
      const result = drive(main, 'done', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status).toBe(1);
      expect(existsSync(tree)).toBe(true);
      expect(git(main, 'rev-parse', 'feat/x')).toBe(baseTip);
      expect(git(main, 'branch', '--list', 'feat/x--1-task')).toContain('feat/x--1-task');
    });

    it('refuses to merge a Task whose report has an unchecked acceptance criterion, leaving branch and worktree', () => {
      // ARRANGE
      const { main } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = task(main, 'feat/x--1-task', 'feat/x');
      writeReport(main, 'feat/x--1-task', '## Acceptance criteria\n- [x] a — e\n- [ ] b\n');
      const baseTip = git(main, 'rev-parse', 'feat/x');
      // ACT
      const result = drive(main, 'done', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('- [ ] b');
      expect(existsSync(tree)).toBe(true);
      expect(git(main, 'rev-parse', 'feat/x')).toBe(baseTip);
      expect(git(main, 'branch', '--list', 'feat/x--1-task')).toContain('feat/x--1-task');
    });

    it('refuses a Task with no report, naming where it belongs', () => {
      // ARRANGE
      const { main } = fixture();
      drive(main, 'new', 'feat/x');
      task(main, 'feat/x--1-task', 'feat/x');
      rmSync(path.join(main, '.scratch', 'x', '1-task.report.md'));
      // ACT
      const result = drive(main, 'done', 'feat/x--1-task', '--base', 'feat/x');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('.scratch/x/1-task.report.md');
    });

    it('rejects a config that names a lock module without withLock', () => {
      // ARRANGE
      const { main } = fixture(path.join(import.meta.dirname, 'git.ts'));
      // ACT
      const result = drive(main, 'new', 'feat/x');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('does not export withLock');
    });
  });
  describe('drive push', () => {
    it('fails with the reason when the push is rejected', () => {
      // ARRANGE
      const { main, root } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = path.join(main, '.trees', 'feat-x');
      driveGroup(tree, ['push']);
      const other = path.join(root, 'other');
      git(root, 'clone', '-q', path.join(root, 'origin.git'), other);
      git(other, 'checkout', '-q', 'feat/x');
      writeFileSync(path.join(other, 'o.txt'), 'o');
      git(other, 'add', '.');
      git(other, 'commit', '-qm', 'elsewhere');
      git(other, 'push', '-q', 'origin', 'feat/x');
      writeFileSync(path.join(tree, 't.txt'), 't');
      git(tree, 'add', '.');
      git(tree, 'commit', '-qm', 'local');
      // ACT
      const pushed = driveGroup(tree, ['push']);
      // ASSERT
      expect(pushed.status).toBe(1);
      expect(pushed.stderr).toContain('failed');
    });

    it('fails when the remote differs from HEAD although git exited 0', () => {
      // ARRANGE
      const { main, root } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = path.join(main, '.trees', 'feat-x');
      const hooks = path.join(root, 'origin.git', 'hooks');
      mkdirSync(hooks, { recursive: true });
      writeFileSync(path.join(hooks, 'update'), '#!/bin/sh\nexit 0\n', {
        mode: 0o755,
      });
      writeFileSync(path.join(hooks, 'post-receive'), '#!/bin/sh\ngit update-ref refs/heads/feat/x refs/heads/main\n', {
        mode: 0o755,
      });
      writeFileSync(path.join(tree, 't.txt'), 't');
      git(tree, 'add', '.');
      git(tree, 'commit', '-qm', 'local');
      // ACT
      const pushed = driveGroup(tree, ['push']);
      // ASSERT
      expect(pushed.status).toBe(1);
      expect(pushed.stderr).toContain('the push did not land');
    });
  });
  describe('drive pr watch', () => {
    it('exits 2 when the PR closes unmerged', () => {
      // ARRANGE
      const expected = [2, 'closed'];
      // ACT
      const result = watch([open, { ...open, state: 'CLOSED' }]);
      // ASSERT
      expect([result.status, result.stdout.trim()]).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('drive worktree sync on the Integration branch', () => {
    it('takes a commit someone else pushed to the remote branch', () => {
      // ARRANGE
      const { main, root } = fixture();
      drive(main, 'new', 'feat/x');
      const tree = path.join(main, '.trees', 'feat-x');
      expect(driveGroup(tree, ['push']).status).toBe(0);
      const other = path.join(root, 'other');
      git(root, 'clone', '-q', path.join(root, 'origin.git'), other);
      git(other, 'checkout', '-q', 'feat/x');
      writeFileSync(path.join(other, 'decision.txt'), 'merged on GitHub');
      git(other, 'add', '.');
      git(other, 'commit', '-qm', 'decision PR merged');
      git(other, 'push', '-q', 'origin', 'feat/x');
      // ACT
      const synced = drive(tree, 'sync', '--base', 'feat/x');
      // ASSERT
      expect(synced.status, synced.stderr).toBe(0);
      expect(readFileSync(path.join(tree, 'decision.txt'), 'utf8')).toBe('merged on GitHub');
    });
  });
  describe('drive pr watch', () => {
    it('exits 3 with the body of a comment that arrives after the start', () => {
      // ARRANGE
      const expected = [3, 'please change X'];
      // ACT
      const result = watch([open, { ...open, comments: [{ id: 'c1', body: 'please change X' }] }]);
      // ASSERT
      expect([result.status, result.stdout.trim()]).toEqual(expected);
    });
  });
});
