import { spawnSync } from 'node:child_process';
import { capture, fail, git, loadConfig } from '../core/index.ts';
import { refuseMerged, refuseSpecOffGithub, skipPrLookup } from './push-pr.pure.ts';
import { branchPr, syncIntegrationPr } from './push-pr.ts';
import { exitProblem, parseLsRemote, pushedLine, remoteDiffersFrom } from './push.pure.ts';

const USAGE =
  'usage: drive push [--spec <epic number>] (run it inside the worktree; --spec opens the draft Integration PR with Closes for each sub-issue when the branch has no PR)';

function readSpec(argv: readonly string[]): number | null {
  if (argv.length === 0) return null;
  const spec = Number(argv[1]);
  if (argv.length !== 2 || argv[0] !== '--spec' || !Number.isInteger(spec) || spec < 1) fail(USAGE);
  return spec;
}

function requireGithub(skipped: string | null): void {
  const refusal = refuseSpecOffGithub(skipped);
  if (refusal !== null) fail(refusal);
}

function remoteTip(remote: string, branch: string, cwd: string): string | null {
  const result = git(cwd, ['ls-remote', remote, `refs/heads/${branch}`]);
  if (result.status !== 0) fail(`git ls-remote ${remote} ${branch} failed:\n${result.stderr}`);
  return parseLsRemote(result.stdout);
}

function pushBranch(branch: string, remote: string, cwd: string): string {
  const hasUpstream = git(cwd, ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`]).status === 0;
  const before = remoteTip(remote, branch, cwd);
  const pushArgs = hasUpstream ? ['push', remote, branch] : ['push', '--set-upstream', remote, branch];
  const exit = exitProblem(pushArgs, spawnSync('git', pushArgs, { cwd, stdio: 'inherit' }));
  if (exit !== null) fail(exit);
  const head = capture('git', ['rev-parse', 'HEAD'], cwd);
  const problem = remoteDiffersFrom({ branch, remote }, head, remoteTip(remote, branch, cwd));
  if (problem !== null) fail(problem);
  return pushedLine(branch, before, head);
}

export function runPush(argv: readonly string[], scriptsRoot: string): void {
  const spec = readSpec(argv);
  const cwd = process.cwd();
  const branch = capture('git', ['branch', '--show-current'], cwd);
  if (branch === '') fail('detached HEAD: check out a branch first');
  const { remote, baseBranch } = loadConfig(
    capture('git', ['rev-parse', '--show-toplevel'], cwd),
    scriptsRoot,
  ).worktree;
  const skipped = skipPrLookup(capture('git', ['remote', 'get-url', remote], cwd), remote);
  if (spec !== null) requireGithub(skipped);
  if (skipped !== null) console.log(skipped);
  const prState = skipped === null ? branchPr(branch, cwd) : 'none';
  const merged = refuseMerged(branch, prState);
  if (merged !== null) fail(merged);
  console.log(pushBranch(branch, remote, cwd));
  if (spec !== null) syncIntegrationPr(spec, { branch, base: baseBranch, state: prState }, cwd);
}
