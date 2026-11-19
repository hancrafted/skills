import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { run } from './git.ts';
import { DECISIONS_PREFIX } from './guard.pure.ts';
import { LEARNINGS_STORE, RECORDS_FOLDER } from './learnings.pure.ts';
import { logPath, parseLog } from './log.pure.ts';
import { mainRootOf } from './log.ts';
import { fail, loadConfig } from './project.ts';
import {
  type Facts,
  fortifyOfRecord,
  lastCommand,
  mergedTicketsOf,
  pickIntegrationBranch,
  type PrFact,
  recordFileOf,
  renderStatus,
  specOfDecisionBody,
  ticketsOfBodies,
} from './status.pure.ts';

interface GhPr extends PrFact {
  headRefName: string;
  body: string;
}

const PR_FIELDS = 'number,state,isDraft,headRefName,body';

function prOfHead(head: string | null, cwd: string): { pr: GhPr | null; failed: boolean } {
  if (head === null) return { pr: null, failed: false };
  const result = run('gh', ['pr', 'list', '--state', 'all', '--head', head, '--json', PR_FIELDS], { cwd });
  if (result.status !== 0) return { pr: null, failed: true };
  const found = (JSON.parse(result.stdout) as GhPr[]).find((pr) => pr.headRefName === head) ?? null;
  return { pr: found, failed: false };
}

const branchesOf = (cwd: string): string[] => {
  const result = run('git', ['branch', '-a', '--format=%(refname:short)'], {
    cwd,
  });
  return result.status === 0 ? result.stdout.split('\n').filter(Boolean) : [];
};

function mergeSubjects(branch: string, cwd: string): string[] {
  const result = run('git', ['log', '--merges', '--format=%s', branch], {
    cwd,
  });
  return result.status === 0 ? result.stdout.split('\n') : [];
}

function readLog(topic: string, cwd: string): { t?: string; cmd?: string }[] {
  const root = mainRootOf(cwd);
  const logFile = root === null ? null : path.join(root, logPath(topic));
  return logFile !== null && existsSync(logFile)
    ? (parseLog(readFileSync(logFile, 'utf8')) as { t?: string; cmd?: string }[])
    : [];
}

function fortifyOf(topic: string, ref: string, cwd: string) {
  const folder = `${LEARNINGS_STORE}/${RECORDS_FOLDER}`;
  const listed = run('git', ['ls-tree', '--name-only', ref, `${folder}/`], { cwd });
  const file = listed.status === 0 ? recordFileOf(listed.stdout.split('\n'), topic) : null;
  if (file === null) return null;
  const shown = run('git', ['show', `${ref}:${file}`], { cwd });
  return shown.status === 0 ? fortifyOfRecord(shown.stdout) : null;
}

const bodyOf = (pr: GhPr | null): string | null => pr?.body ?? null;

function prFacts(topic: string, integrationBranch: string | null, cwd: string) {
  const decision = prOfHead(`${DECISIONS_PREFIX}${topic}`, cwd);
  const integration = prOfHead(integrationBranch, cwd);
  return {
    epic: specOfDecisionBody(bodyOf(decision.pr)),
    ghFailed: decision.failed || integration.failed,
    decisionPr: decision.pr,
    integrationPr: integration.pr,
    tickets: ticketsOfBodies(bodyOf(integration.pr), bodyOf(decision.pr)),
  };
}

function ticketFacts(integrationBranch: string | null, cwd: string): number[] {
  return integrationBranch === null ? [] : mergedTicketsOf(mergeSubjects(integrationBranch, cwd), integrationBranch);
}

function gather(topic: string, cwd: string): Facts {
  const { worktree } = loadConfig(run('git', ['rev-parse', '--show-toplevel'], { cwd }).stdout.trim());
  const branches = branchesOf(cwd);
  const integrationBranch = pickIntegrationBranch(branches, topic, worktree.remote);
  return {
    topic,
    ...prFacts(topic, integrationBranch, cwd),
    fortify: fortifyOf(topic, `${worktree.remote}/${worktree.baseBranch}`, cwd),
    integrationBranch,
    pushed: branches.includes(`${worktree.remote}/${integrationBranch}`),
    mergedTickets: ticketFacts(integrationBranch, cwd),
    lastLog: lastCommand(readLog(topic, cwd)),
  };
}

export function runStatus(argv: readonly string[]): void {
  const [topic] = argv;
  if (topic === undefined || topic.startsWith('-')) fail('usage: drive status <topic>');
  console.log(renderStatus(gather(topic, process.cwd())));
}
