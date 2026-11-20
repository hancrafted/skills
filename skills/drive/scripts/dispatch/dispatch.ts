import {
  capture,
  DECISIONS_PREFIX,
  fail,
  git,
  loadConfig,
  taskBranchGlob,
  taskMergeSubjectPrefix,
} from '../core/index.ts';
import { pickIntegrationBranch, specOfDecisionBody } from '../status/index.ts';
import { checkTickets, epicOfTickets, parseTicket } from './dispatch.pure.ts';

const USAGE =
  "usage: drive dispatch check [--base <Integration branch>] <issue number…> (without --base, the Integration branch of the tickets' epic)";

interface Issue {
  state: string;
  body: string;
}

function readArgs(argv: readonly string[]): {
  base: string | null;
  issues: number[];
} {
  const [verb, ...rest] = argv;
  if (verb !== 'check') fail(USAGE);
  const baseAt = rest.indexOf('--base');
  const base = baseAt === -1 ? null : (rest[baseAt + 1] ?? fail(USAGE));
  const numbers = rest.filter((_, index) => baseAt === -1 || (index !== baseAt && index !== baseAt + 1));
  const issues = numbers.map(Number);
  if (issues.length === 0 || issues.some((n) => !Number.isInteger(n) || n < 1)) fail(USAGE);
  return { base, issues };
}

function readIssue(number: number): Issue {
  return JSON.parse(capture('gh', ['issue', 'view', String(number), '--json', 'state,body'])) as Issue;
}

function hasMergeCommit(base: string, number: number, cwd: string): boolean {
  const prefix = taskMergeSubjectPrefix(base, number);
  return capture('git', ['log', base, '--format=%s', '--fixed-strings', `--grep=${prefix}`], cwd) !== '';
}

function hasMergedWorkBranch(base: string, glob: string, cwd: string): boolean {
  const tip = (ref: string) => capture('git', ['rev-parse', ref], cwd);
  const branches = capture('git', ['branch', '--list', '--format=%(refname:short)', glob], cwd).split('\n');
  return branches.some(
    (branch) =>
      branch !== '' &&
      tip(branch) !== tip(base) &&
      git(cwd, ['merge-base', '--is-ancestor', branch, base]).status === 0,
  );
}

function isClosedOrTaskBranchMerged(base: string, cwd: string): (number: number) => boolean {
  return (number) => {
    if (readIssue(number).state === 'CLOSED') return true;
    const glob = taskBranchGlob(base, number);
    return hasMergeCommit(base, number, cwd) || hasMergedWorkBranch(base, glob, cwd);
  };
}

const PASS_BASE = 'pass --base <Integration branch>';

function integrationOfEpic(epic: number | null, cwd: string, scriptsRoot: string): string | null {
  if (epic === null) return null;
  const root = capture('git', ['rev-parse', '--show-toplevel'], cwd);
  const { remote } = loadConfig(root, scriptsRoot).worktree;
  const listed = capture('gh', ['pr', 'list', '--state', 'all', '--limit', '200', '--json', 'headRefName,body'], cwd);
  const decisions = (JSON.parse(listed) as { headRefName: string; body: string }[]).filter(
    (pr) => pr.headRefName.startsWith(DECISIONS_PREFIX) && specOfDecisionBody(pr.body) === epic,
  );
  const [only] = decisions;
  if (decisions.length !== 1 || only === undefined) return null;
  const branches = capture('git', ['branch', '-a', '--format=%(refname:short)'], cwd).split('\n');
  return pickIntegrationBranch(branches, only.headRefName.slice(DECISIONS_PREFIX.length), remote);
}

export function runDispatch(argv: readonly string[], scriptsRoot: string): void {
  const { base: given, issues } = readArgs(argv);
  const cwd = process.cwd();
  const bodies = issues.map((number) => readIssue(number).body);
  const base = given ?? integrationOfEpic(epicOfTickets(bodies), cwd, scriptsRoot);
  if (base === null) fail(`no single Integration branch found for the tickets' epic: ${PASS_BASE}`);
  const tickets = issues.map((number, index) => parseTicket(number, bodies[index] ?? ''));
  const problems = checkTickets(tickets, isClosedOrTaskBranchMerged(base, cwd));
  if (problems.length > 0) fail(`dispatch check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  console.log(`✔ ${issues.map((n) => `#${n}`).join(', ')} may be dispatched together`);
}
