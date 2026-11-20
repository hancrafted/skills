import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { capture, git, mergeSubject, reportPathFor, unmetCriteria, type Timing, type WithLock } from '../core/index.ts';

const gitDirOf = (tree: string) => git(tree, ['rev-parse', '--absolute-git-dir']).stdout.trim();

function rebasing(tree: string): string | null {
  for (const dir of ['rebase-merge', 'rebase-apply']) {
    const headName = path.join(gitDirOf(tree), dir, 'head-name');
    if (existsSync(headName)) return readFileSync(headName, 'utf8').trim();
  }
  return null;
}

function checkoutOfCountingRebase(base: string, cwd: string): string | null {
  const listing = capture('git', ['worktree', 'list', '--porcelain'], cwd);
  for (const entry of listing.split('\n\n')) {
    const lines = entry.split('\n');
    const dir = lines.find((line) => line.startsWith('worktree '))?.slice('worktree '.length);
    if (!dir) continue;
    if (lines.includes(`branch refs/heads/${base}`)) return dir;
    if (lines.includes('detached') && rebasing(dir) === `refs/heads/${base}`) return dir;
  }
  return null;
}

const IN_PROGRESS = [
  ['MERGE_HEAD', 'a merge'],
  ['REBASE_HEAD', 'a rebase'],
  ['rebase-merge', 'a rebase'],
  ['rebase-apply', 'a rebase'],
  ['CHERRY_PICK_HEAD', 'a cherry-pick'],
] as const;

function busyWith(tree: string): string | null {
  const gitDir = gitDirOf(tree);
  return IN_PROGRESS.find(([name]) => existsSync(path.join(gitDir, name)))?.[1] ?? null;
}

export interface MergeContext {
  cwd: string;
  log: (line: string) => void;
  withLock: WithLock;
}

export function withMergeLock<T>(
  branch: string,
  { cwd, log, withLock }: MergeContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  const onWait = () => log(`… waiting for another merge into ${branch} to finish`);
  return withLock(
    `wt-merge/${branch}`,
    { pollMilliseconds: 100, timeoutMilliseconds: 10 * 60 * 1000, cwd, onWait },
    fn,
  );
}

interface Merge {
  branch: string;
  base: string;
  cwd: string;
}

const gitStyleMergeMessage = ({ branch, base }: Merge) => mergeSubject(branch, base);

function buildMerge(merge: Merge, baseTip: string): string {
  const { branch, base, cwd } = merge;
  const result = git(cwd, ['merge-tree', '--write-tree', '--name-only', baseTip, branch]);
  const [tree, ...linesAfterTree] = result.stdout.split('\n');
  if (result.status === 1) {
    const blankLineEndingPaths = linesAfterTree.indexOf('');
    const paths = linesAfterTree.slice(0, blankLineEndingPaths === -1 ? linesAfterTree.length : blankLineEndingPaths);
    const messages =
      blankLineEndingPaths === -1
        ? ''
        : linesAfterTree
            .slice(blankLineEndingPaths + 1)
            .join('\n')
            .trim();
    throw new Error(
      `merging ${branch} into ${base} conflicts in:\n  ${paths.join('\n  ')}\n${messages}\n${base} was left as it was`,
    );
  }
  if (result.status !== 0) throw new Error(`git merge-tree failed:\n${result.stderr}`);
  const commit = git(cwd, ['commit-tree', tree, '-p', baseTip, '-p', branch, '-m', gitStyleMergeMessage(merge)]);
  if (commit.status !== 0) throw new Error(`git commit-tree failed:\n${commit.stderr}`);
  return commit.stdout.trim();
}

const BUSY_WAIT: Timing = {
  pollMilliseconds: 5000,
  timeoutMilliseconds: 10 * 60 * 1000,
};

type Attempt = { done: 'merged' | 'already-merged' } | { tree: string; busy: string; detail: string };

function attempt(merge: Merge, mergeBuiltOnBaseTip: { on: string; commit: string }): Attempt {
  const { branch, base, cwd } = merge;
  if (git(cwd, ['merge-base', '--is-ancestor', branch, base]).status === 0) return { done: 'already-merged' };
  const tree = checkoutOfCountingRebase(base, cwd);
  if (tree === null) throw new Error(`${base} is not checked out in any worktree; check it out, then rerun`);
  const baseTip = git(cwd, ['rev-parse', '--verify', `refs/heads/${base}`]).stdout.trim();
  if (mergeBuiltOnBaseTip.on !== baseTip)
    Object.assign(mergeBuiltOnBaseTip, {
      on: baseTip,
      commit: buildMerge(merge, baseTip),
    });
  const busy = busyWith(tree);
  if (busy !== null) return { tree, busy, detail: '' };
  const forward = git(tree, ['merge', '--ff-only', mergeBuiltOnBaseTip.commit]);
  if (forward.status === 0) return { done: 'merged' };
  return {
    tree,
    busy: 'a refused fast-forward',
    detail: `:\n${forward.stdout}${forward.stderr}`.trimEnd(),
  };
}

export function mergeIntoBase(
  branch: string,
  base: string,
  options: MergeContext & Partial<Timing>,
): Promise<'merged' | 'already-merged'> {
  const { cwd, log, withLock, pollMilliseconds, timeoutMilliseconds } = {
    ...BUSY_WAIT,
    ...options,
  };
  if (git(cwd, ['merge-base', '--is-ancestor', branch, base]).status !== 0) refuseUnmetCriteria(branch, cwd);
  return withMergeLock(base, { cwd, log, withLock }, async () => {
    const deadline = Date.now() + timeoutMilliseconds;
    const mergeBuiltOnBaseTip = { on: '', commit: '' };
    for (let round = 0; ; round++) {
      const outcome = attempt({ branch, base, cwd }, mergeBuiltOnBaseTip);
      if ('done' in outcome) return outcome.done;
      const { tree, busy, detail } = outcome;
      if (Date.now() >= deadline)
        throw new Error(
          `${base} in ${tree} stayed busy with ${busy} for ${timeoutMilliseconds / 1000} s; finish it, then rerun${detail}`,
        );
      if (round === 0)
        log(
          `… ${base} in ${tree} is busy with ${busy}; looking again every ${pollMilliseconds / 1000} s for up to ${timeoutMilliseconds / 60_000} min`,
        );
      await sleep(pollMilliseconds);
    }
  });
}

export function forkDateBeforeMerge(branch: string, base: string, cwd: string): Date | null {
  const fork = git(cwd, ['merge-base', branch, base]).stdout.trim();
  if (fork === '') return null;
  return new Date(git(cwd, ['log', '-1', '--format=%cI', fork]).stdout.trim());
}

export function refuseUnmetCriteria(branch: string, root: string): void {
  const relative = reportPathFor(branch);
  if (relative === null) return;
  const file = path.join(root, relative);
  const problems = existsSync(file)
    ? unmetCriteria(readFileSync(file, 'utf8'))
    : [`no report at ${relative}; write it, with an "## Acceptance criteria" section`];
  if (problems.length > 0)
    throw new Error(
      `${branch} has an unmet report (${relative}):\n  ${problems.join('\n  ')}\n${branch} was not merged`,
    );
}
