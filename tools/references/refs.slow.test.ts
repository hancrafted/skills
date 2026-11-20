import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseIndex } from './references.pure.ts';

const REFS_SCRIPT = path.join(import.meta.dirname, 'refs.ts');
const INDEX_PATH = 'docs/agents/reference-repos.md';
const GIT_IDENTITY = ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgsign=false'];
const AMBIENT_GIT_VARIABLES = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR'];

const temporaryRoots: string[] = [];
afterAll(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
});

function cleanEnvironment() {
  const environment = { ...process.env };
  for (const variable of AMBIENT_GIT_VARIABLES) delete environment[variable];
  return environment;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', [...GIT_IDENTITY, ...args], { cwd, env: cleanEnvironment(), encoding: 'utf8' }).trim();
}

function writeFiles(directory: string, files: Readonly<Record<string, string>>) {
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, relative)), { recursive: true });
    writeFileSync(path.join(directory, relative), content);
  }
}

function runRefs(cwd: string, ...args: string[]) {
  const run = spawnSync('node', [REFS_SCRIPT, ...args], { cwd, env: cleanEnvironment(), encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

interface SourceRepo {
  readonly url: string;
  readonly work: string;
  readonly bare: string;
  readonly commit: string;
}

function createSourceRepo(root: string, name: string, files: Readonly<Record<string, string>>): SourceRepo {
  const work = path.join(root, `${name}-work`);
  const bare = path.join(root, `${name}.git`);
  mkdirSync(work, { recursive: true });
  git(work, 'init', '-q', '-b', 'main');
  writeFiles(work, files);
  git(work, 'add', '.');
  git(work, 'commit', '-q', '-m', 'seed');
  git(root, 'clone', '-q', '--bare', work, bare);
  return { url: `file://${bare}`, work, bare, commit: git(work, 'rev-parse', 'HEAD') };
}

function pushCommit(source: SourceRepo, files: Readonly<Record<string, string>>, removed: readonly string[] = []) {
  writeFiles(source.work, files);
  for (const file of removed) rmSync(path.join(source.work, file), { recursive: true });
  git(source.work, 'add', '-A');
  git(source.work, 'commit', '-q', '-m', 'next');
  git(source.work, 'push', '-q', source.bare, 'main');
  return git(source.work, 'rev-parse', 'HEAD');
}

function indexText(sources: Readonly<Record<string, SourceRepo & { subfolder?: string }>>, body: string) {
  const repos = Object.entries(sources)
    .map(([name, source]) =>
      [
        `  ${name}:`,
        `    url: ${source.url}`,
        ...(source.subfolder ? [`    subfolder: ${source.subfolder}`] : []),
        `    commit: ${source.commit}`,
      ].join('\n'),
    )
    .join('\n');
  return `---\nrepos:\n${repos}\n---\n${body}`;
}

const FLAT_FILES = { 'skills/alpha/SKILL.md': 'alpha', 'README.md': 'readme', 'old/notes.md': 'old' };
const NESTED_FILES = { 'pstack/guide.md': 'guide', 'other/ignored.md': 'ignored', 'README.md': 'root' };
const GOOD_BODY = '- `.references/flat/skills/alpha/SKILL.md`\n- `.references/nested/pstack/guide.md`\n';

function createFixture(body = GOOD_BODY) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'refs-fixture-')));
  temporaryRoots.push(root);
  const flat = createSourceRepo(root, 'flat', FLAT_FILES);
  const nested = createSourceRepo(root, 'nested', NESTED_FILES);
  const main = path.join(root, 'main');
  mkdirSync(main);
  git(main, 'init', '-q', '-b', 'main');
  writeFiles(main, { [INDEX_PATH]: indexText({ flat, nested: { ...nested, subfolder: 'pstack' } }, body) });
  git(main, 'add', '.');
  git(main, 'commit', '-q', '-m', 'index');
  return { root, main, flat, nested };
}

const cacheOf = (main: string, name: string) => path.join(main, '.references', name);

describe('success cases', () => {
  it('fills the cache at each pin and checks only the subfolder out when one is pinned', () => {
    // ARRANGE
    const { main, flat, nested } = createFixture();
    const expectedFlatFile = 'alpha';
    // ACT
    const run = runRefs(main);
    // ASSERT
    expect(run.status).toBe(0);
    expect(git(cacheOf(main, 'flat'), 'rev-parse', 'HEAD')).toBe(flat.commit);
    expect(git(cacheOf(main, 'nested'), 'rev-parse', 'HEAD')).toBe(nested.commit);
    expect(readFileSync(path.join(cacheOf(main, 'flat'), 'skills/alpha/SKILL.md'), 'utf8')).toBe(expectedFlatFile);
    expect(existsSync(path.join(cacheOf(main, 'nested'), 'pstack/guide.md'))).toBe(true);
    expect(existsSync(path.join(cacheOf(main, 'nested'), 'other/ignored.md'))).toBe(false);
  });

  it('links the main checkout cache into a worktree under .worktrees', () => {
    // ARRANGE
    const { main } = createFixture();
    const worktree = path.join(main, '.worktrees', 'task');
    git(main, 'worktree', 'add', '-q', '-b', 'task', worktree);
    const expectedTarget = path.join(main, '.references');
    // ACT
    const run = runRefs(worktree);
    // ASSERT
    expect(run.status).toBe(0);
    expect(lstatSync(path.join(worktree, '.references')).isSymbolicLink()).toBe(true);
    expect(readlinkSync(path.join(worktree, '.references'))).toBe(expectedTarget);
    expect(existsSync(path.join(worktree, '.references/flat/README.md'))).toBe(true);
  });

  it('moves each pin to the remote head and reports the change summary', () => {
    // ARRANGE
    const { main, flat } = createFixture();
    runRefs(main);
    const newCommit = pushCommit(flat, { 'fresh/new.md': 'new' }, ['old']);
    const expectedAdded = 'added: fresh';
    const expectedRemoved = 'removed: old';
    const expectedStat = 'fresh/new.md';
    // ACT
    const run = runRefs(main, '--bump');
    const pins = parseIndex(readFileSync(path.join(main, INDEX_PATH), 'utf8'));
    // ASSERT
    expect(run.status).toBe(0);
    expect(run.output).toContain(expectedAdded);
    expect(run.output).toContain(expectedRemoved);
    expect(run.output).toContain(expectedStat);
    expect(pins.find((pin) => pin.name === 'flat')?.commit).toBe(newCommit);
    expect(git(cacheOf(main, 'flat'), 'rev-parse', 'HEAD')).toBe(newCommit);
  });

  it('passes --check when every index path exists at its pin', () => {
    // ARRANGE
    const { main } = createFixture();
    // ACT
    const run = runRefs(main, '--check');
    // ASSERT
    expect(run.status).toBe(0);
  });
});

describe('failure cases', () => {
  it('fails --check naming every index path missing at its pin', () => {
    // ARRANGE
    const missingBody = `${GOOD_BODY}- \`.references/flat/skills/gone/SKILL.md\`\n- \`.references/nested/pstack/absent.md\`\n- \`.references/nowhere/x.md\`\n`;
    const { main } = createFixture(missingBody);
    const expectedMissing = ['flat/skills/gone/SKILL.md', 'nested/pstack/absent.md', 'nowhere/x.md'];
    // ACT
    const run = runRefs(main, '--check');
    // ASSERT
    expect(run.status).toBe(1);
    for (const missing of expectedMissing) expect(run.output).toContain(missing);
  });

  it('fails when a pinned commit does not exist at its remote', () => {
    // ARRANGE
    const { main, flat } = createFixture();
    const index = readFileSync(path.join(main, INDEX_PATH), 'utf8').replace(flat.commit, '0'.repeat(40));
    writeFileSync(path.join(main, INDEX_PATH), index);
    // ACT
    const run = runRefs(main);
    // ASSERT
    expect(run.status).not.toBe(0);
  });
});

describe('edge cases', () => {
  it('re-runs without touching the remote and keeps an existing worktree link', () => {
    // ARRANGE
    const { main, flat, nested } = createFixture();
    const worktree = path.join(main, '.worktrees', 'task');
    git(main, 'worktree', 'add', '-q', '-b', 'task', worktree);
    runRefs(worktree);
    rmSync(flat.bare, { recursive: true });
    rmSync(nested.bare, { recursive: true });
    // ACT
    const run = runRefs(worktree);
    // ASSERT
    expect(run.status).toBe(0);
    expect(git(cacheOf(main, 'flat'), 'rev-parse', 'HEAD')).toBe(flat.commit);
  });

  it('reports no change when --bump finds the remote head already pinned', () => {
    // ARRANGE
    const { main, flat } = createFixture();
    runRefs(main);
    const expectedPin = flat.commit;
    // ACT
    const run = runRefs(main, '--bump');
    const pins = parseIndex(readFileSync(path.join(main, INDEX_PATH), 'utf8'));
    // ASSERT
    expect(run.status).toBe(0);
    expect(pins.find((pin) => pin.name === 'flat')?.commit).toBe(expectedPin);
    expect(run.output).toContain('unchanged');
  });
});
