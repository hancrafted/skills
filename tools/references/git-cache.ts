import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { topLevelChanges, type RepoPin } from './references.pure.ts';

const AMBIENT_GIT_VARIABLES = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR'];

function git(cwd: string, ...args: string[]): string {
  const environment = { ...process.env };
  for (const variable of AMBIENT_GIT_VARIABLES) delete environment[variable];
  return execFileSync('git', args, {
    cwd,
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export interface Checkouts {
  readonly current: string;
  readonly main: string;
}

export function checkoutsAt(cwd: string): Checkouts {
  const common = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  return { current: git(cwd, 'rev-parse', '--show-toplevel'), main: path.dirname(common) };
}

export const cacheDirOf = (main: string, name: string) => path.join(main, '.references', name);

function checkedOutCommit(cacheDir: string): string {
  try {
    return git(cacheDir, 'rev-parse', 'HEAD');
  } catch {
    return '';
  }
}

function fetchCommit(cacheDir: string, commit: string) {
  git(cacheDir, 'fetch', '-q', '--depth', '1', 'origin', commit);
}

function sparseSetDiffers(cacheDir: string, pin: RepoPin): boolean {
  const enabled = git(cacheDir, 'config', '--bool', '--default', 'false', 'core.sparseCheckout') === 'true';
  if (!pin.subfolder) return enabled;
  return !enabled || git(cacheDir, 'sparse-checkout', 'list') !== pin.subfolder;
}

function applySparse(cacheDir: string, pin: RepoPin) {
  if (!sparseSetDiffers(cacheDir, pin)) return;
  if (pin.subfolder) git(cacheDir, 'sparse-checkout', 'set', pin.subfolder);
  else git(cacheDir, 'sparse-checkout', 'disable');
}

function checkOut(cacheDir: string, pin: RepoPin, commit: string) {
  applySparse(cacheDir, pin);
  git(cacheDir, 'checkout', '-q', '--force', '--detach', commit);
}

export function syncRepo(main: string, pin: RepoPin): string {
  const cacheDir = cacheDirOf(main, pin.name);
  if (!existsSync(path.join(cacheDir, '.git'))) {
    mkdirSync(cacheDir, { recursive: true });
    git(cacheDir, 'init', '-q');
    git(cacheDir, 'remote', 'add', 'origin', pin.url);
  }
  if (checkedOutCommit(cacheDir) === pin.commit) {
    applySparse(cacheDir, pin);
    return cacheDir;
  }
  git(cacheDir, 'remote', 'set-url', 'origin', pin.url);
  fetchCommit(cacheDir, pin.commit);
  checkOut(cacheDir, pin, pin.commit);
  return cacheDir;
}

function existsOrDangles(target: string): boolean {
  try {
    return lstatSync(target) !== undefined;
  } catch {
    return false;
  }
}

export function linkIntoWorktree({ current, main }: Checkouts) {
  mkdirSync(path.join(main, '.references'), { recursive: true });
  if (current === main) return;
  const link = path.join(current, '.references');
  if (!existsOrDangles(link)) symlinkSync(path.join(main, '.references'), link);
}

export function existsAtPin(cacheDir: string, commit: string, relativePath: string): boolean {
  try {
    git(cacheDir, 'cat-file', '-e', `${commit}:${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

export function remoteHead(url: string): string {
  const [commit] = git(process.cwd(), 'ls-remote', url, 'HEAD').split(/\s+/);
  if (!commit) throw new Error(`${url} has no HEAD`);
  return commit;
}

function topLevelOf(cacheDir: string, pin: RepoPin, commit: string): string[] {
  const tree = pin.subfolder ? `${commit}:${pin.subfolder}` : commit;
  return git(cacheDir, 'ls-tree', '--name-only', tree).split('\n').filter(Boolean);
}

export interface BumpResult {
  readonly commit: string;
  readonly stat: string;
  readonly added: string[];
  readonly removed: string[];
}

export function bumpRepo(main: string, pin: RepoPin): BumpResult {
  const cacheDir = syncRepo(main, pin);
  const commit = remoteHead(pin.url);
  if (commit === pin.commit) return { commit, stat: '', added: [], removed: [] };
  fetchCommit(cacheDir, commit);
  const stat = git(
    cacheDir,
    'diff',
    '--stat',
    `${pin.commit}..${commit}`,
    ...(pin.subfolder ? ['--', pin.subfolder] : []),
  );
  const { added, removed } = topLevelChanges(topLevelOf(cacheDir, pin, pin.commit), topLevelOf(cacheDir, pin, commit));
  checkOut(cacheDir, pin, commit);
  return { commit, stat, added, removed };
}
