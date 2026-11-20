import { spawnSync } from 'node:child_process';
import {
  capture,
  fail,
  git,
  loadProject,
  type Project,
  run,
  runAfter,
  runHooks,
  stream,
  worktreePath,
} from '../core/index.ts';
import { parseArgs, refuseNewBranch } from './args.pure.ts';
import { mergedPrOfTip, parseMergedPrs } from './branch.pure.ts';
import { insideWorktree, refuseWhileBusyLastBeforeRemoval } from './busy.ts';
import { forkDateBeforeMerge, mergeIntoBase, withMergeLock } from './merge.ts';
import { planSync } from './process.pure.ts';
import { removeWorktree } from './remove.ts';

function rollBack(project: Project, target: string, branch: string): string {
  const leftBehind = [
    {
      what: `the worktree ${target}`,
      cleanup: `git worktree remove --force ${target}`,
      removed: git(project.root, ['worktree', 'remove', '--force', target]).status === 0,
    },
    {
      what: `the branch ${branch}`,
      cleanup: `git branch -D ${branch}`,
      removed: git(project.root, ['branch', '-D', branch]).status === 0,
    },
  ].filter((item) => !item.removed);
  return leftBehind.length === 0
    ? 'the worktree and branch were removed; rerun to retry'
    : `${leftBehind.map((item) => `${item.what} could not be removed (run \`${item.cleanup}\`)`).join('; ')}; then rerun`;
}

function create(project: Project, branch: string, base: string | null): void {
  const { config } = project;
  const target = worktreePath(project, branch);
  const branchesFromRemoteBase = base === null;
  if (branchesFromRemoteBase) stream('git', ['fetch', config.remote]);
  stream('git', ['worktree', 'add', target, '-b', branch, base ?? project.remoteBase]);
  for (const command of config.install)
    if (spawnSync(command, { shell: true, cwd: target, stdio: 'inherit' }).status !== 0) {
      const outcome = rollBack(project, target, branch);
      fail(`install step failed in ${target}: ${command}\n  ${outcome}`);
    }
  const { preflight } = config;
  if (preflight !== null && spawnSync(preflight, { shell: true, cwd: target, stdio: 'inherit' }).status !== 0)
    fail(`preflight failed in ${target}: ${preflight}\n  the worktree is left in place`);
  console.log(`✔ worktree ready: ${target}\n  next: cd ${target}`);
}

function mergedPrOfBranchTip(branch: string): number | null {
  const tip = git(process.cwd(), ['rev-parse', `refs/heads/${branch}`]).stdout.trim();
  const listed = run('gh', ['pr', 'list', '--state', 'merged', '--head', branch, '--json', 'number,headRefOid']);
  if (listed.status !== 0 || tip === '') return null;
  return mergedPrOfTip(parseMergedPrs(listed.stdout), tip)?.number ?? null;
}

const gitDeletes = (branch: string): boolean => git(process.cwd(), ['branch', '-d', branch]).status === 0;

function deleteBranch(branch: string): void {
  if (gitDeletes(branch)) {
    console.log(`✔ deleted branch ${branch}`);
    return;
  }
  const pr = mergedPrOfBranchTip(branch);
  if (pr === null) {
    console.warn(
      `! kept branch ${branch}: git sees unmerged commits and no merged PR has its tip as head. Delete with \`git branch -D ${branch}\` once its PR merged.`,
    );
    return;
  }
  capture('git', ['branch', '-D', branch]);
  console.log(`✔ deleted branch ${branch}, its tip was merged by PR #${pr}`);
}

function refuseUnpushedBaseBeforeAnyRemoval(project: Project): void {
  const { remote, baseBranch } = project.config;
  stream('git', ['fetch', remote]);
  const unpushed = capture('git', ['log', '--oneline', `${project.remoteBase}..${baseBranch}`]);
  if (unpushed) fail(`local ${baseBranch} holds unpushed commits; push or move them, then rerun:\n${unpushed}`);
}

function syncBase(project: Project): void {
  const { remote, baseBranch } = project.config;
  if (capture('git', ['branch', '--show-current'], project.root) === baseBranch)
    stream('git', ['merge', '--ff-only', project.remoteBase], project.root);
  else stream('git', ['fetch', remote, `${baseBranch}:${baseBranch}`]);
  console.log(`✔ local ${baseBranch} fast-forwarded to ${project.remoteBase}`);
}

function forceDeleteMergedBranch(branch: string, base: string): void {
  capture('git', ['branch', '-D', branch]);
  console.log(`✔ deleted branch ${branch}, merged into ${base}`);
}

function alreadyMerged(branch: string, base: string, cwd: string): boolean {
  return git(cwd, ['merge-base', '--is-ancestor', branch, base]).status === 0;
}

function refuseFailingHooksBeforeMerge(project: Project, { branch, base, target }: Finish & { base: string }): void {
  if (project.config.beforeMerge.length === 0 || alreadyMerged(branch, base, project.root)) return;
  const hook = { branch, base, worktree: target, forkedAt: null, cwd: target };
  if (!runHooks(project, project.config.beforeMerge, hook))
    fail(`a hook before the merge failed; ${branch} was not merged and nothing was removed`);
}

async function mergeBeforeRemoval(project: Project, finishing: Finish & { base: string }): Promise<void> {
  const { branch, base, target } = finishing;
  refuseFailingHooksBeforeMerge(project, finishing);
  const forkedAt = forkDateBeforeMerge(branch, base, project.root);
  try {
    const result = await mergeIntoBase(branch, base, {
      cwd: project.root,
      log: console.log,
      withLock: project.withLock,
    });
    console.log(result === 'merged' ? `✔ merged ${branch} into ${base}` : `✔ ${branch} already merged into ${base}`);
  } catch (error) {
    fail(`${(error as Error).message}\n  nothing was removed`);
  }
  runAfter(project, project.config.afterMerge, {
    branch,
    base,
    worktree: target,
    forkedAt,
  });
}

function removeCheckout(project: Project, target: string, branch: string): void {
  try {
    const result = removeWorktree(target, branch, project.root);
    if (result === 'leftovers-cleared')
      console.log(
        `✔ cleared what an interrupted removal left in ${target} (Finder metadata, ignored or committed files)`,
      );
    if (result === 'gone') console.log(`✔ ${target} was already removed`);
  } catch (error) {
    fail((error as Error).message);
  }
}

interface Finish {
  branch: string;
  base: string | null;
  target: string;
}

async function finish(
  project: Project,
  { branch, base, kill }: Omit<Finish, 'target'> & { kill: boolean },
): Promise<void> {
  const target = worktreePath(project, branch);
  const hook = { branch, base, worktree: target, forkedAt: null };
  if (insideWorktree(target)) fail(`run this from the main checkout, not from inside ${target}`);
  if (base === null) refuseUnpushedBaseBeforeAnyRemoval(project);
  else await mergeBeforeRemoval(project, { branch, base, target });
  if (!runHooks(project, project.config.beforeRemove, hook))
    fail('a hook before the removal failed; nothing was removed');
  refuseWhileBusyLastBeforeRemoval(target, kill);
  removeCheckout(project, target, branch);
  console.log(`✔ removed ${target}`);
  runAfter(project, project.config.afterRemove, hook);
  if (base !== null) {
    forceDeleteMergedBranch(branch, base);
    return;
  }
  deleteBranch(branch);
  syncBase(project);
}

async function sync(project: Project, base: string | null): Promise<void> {
  const { baseBranch, remote } = project.config;
  const branch = capture('git', ['branch', '--show-current']);
  const dirty = capture('git', ['status', '--porcelain']) !== '';
  const plan = planSync({ branch, base, dirty, baseBranch, remote });
  if ('error' in plan) fail(plan.error);
  stream('git', ['fetch', remote]);
  const mergedReportedAfterLockRelease = await withMergeLock(
    branch,
    { cwd: process.cwd(), log: console.log, withLock: project.withLock },
    () => spawnSync('git', ['merge', plan.target], { stdio: 'inherit' }).status === 0,
  );
  if (!mergedReportedAfterLockRelease)
    fail(`merge of ${plan.target} into ${branch} stopped; resolve it or run \`git merge --abort\``);
  console.log(`✔ ${branch} merged with ${plan.target}`);
}

function localBranchExists(branch: string): boolean {
  return git(process.cwd(), ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0;
}

export async function runWorktree(argv: readonly string[], scriptsRoot: string): Promise<void> {
  const project = await loadProject(scriptsRoot);
  const args = parseArgs(argv, project.config.invoke);
  if ('error' in args) fail(args.error);
  else if (args.command === 'new') {
    const refusal = refuseNewBranch(args, localBranchExists, project.config);
    if (refusal !== null) fail(refusal);
    create(project, args.branch, args.base);
  } else if (args.command === 'sync') await sync(project, args.base);
  else await finish(project, args);
}
