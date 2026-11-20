import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { countCitations, FAILURE_MODES_FOLDER, type FailureMode, storeOf } from './learnings.pure.ts';
import { type Context, failed, type Report } from './report.pure.ts';
import { openTicketUrls, pickFailure, renderIssue, sourceOfLock } from './upstream.pure.ts';
import { markTicket } from './write.pure.ts';

const UPSTREAM_LABEL = 'fortify';
const LOCK_FILE = 'skills-lock.json';

interface Target {
  repo: string;
  mode: FailureMode;
  count: number;
}

function repoOf({ root, store, command }: Context): string | null {
  if (command.flags.repo !== undefined) return command.flags.repo;
  const lock = path.join(root, LOCK_FILE);
  return existsSync(lock) ? sourceOfLock(readFileSync(lock, 'utf8'), store.skill) : null;
}

function targetOf(context: Context): Target | Report {
  const { store, command } = context;
  const repo = repoOf(context);
  if (repo === null)
    return failed([
      `${LOCK_FILE} has no source for ${store.skill}: ask the Operator for the repo and pass --repo <owner/repo>`,
    ]);
  const rows = countCitations(store.modes, store.records);
  const picked = pickFailure(rows, command.flags.failure ?? null);
  if ('error' in picked) return failed([picked.error]);
  const mode = store.modes.find((candidate) => candidate.slug === picked.slug);
  const count = rows.find((row) => row.slug === picked.slug)?.count ?? 0;
  return mode === undefined ? failed([`no failure mode "${picked.slug}"`]) : { repo, mode, count };
}

function openTicketReport({ store, ports }: Context, repo: string): Report | null {
  const labels = ['--label', UPSTREAM_LABEL, '--label', `skill:${store.skill}`];
  const listed = ports.gh(['issue', 'list', '--repo', repo, ...labels, '--state', 'open', '--json', 'url']);
  if (listed.status !== 0) return failed([`gh issue list failed: ${listed.stderr.trim()}`]);
  const open = openTicketUrls(listed.stdout);
  return open.length === 0
    ? null
    : failed([`a ${UPSTREAM_LABEL} ticket is already open for ${store.skill}: ${open.join(' ')}`]);
}

function evidenceOf({ store }: Context, mode: FailureMode): string[] {
  return store.records.flatMap((record) =>
    record.citations
      .filter((citation) => citation.slug === mode.slug)
      .flatMap((citation) => citation.bullets.map((bullet) => `${record.file}: ${bullet}`)),
  );
}

function file({ root, store, ports }: Context, target: Target, issue: { title: string; body: string }): Report {
  const labels = [UPSTREAM_LABEL, `skill:${store.skill}`];
  for (const label of labels) ports.gh(['label', 'create', label, '--repo', target.repo]);
  const labelFlags = labels.flatMap((label) => ['--label', label]);
  const created = ports.gh([
    ...['issue', 'create', '--repo', target.repo, '--title', issue.title, '--body', issue.body],
    ...labelFlags,
  ]);
  if (created.status !== 0) return failed([`gh issue create failed: ${created.stderr.trim()}`]);
  const url = created.stdout.trim();
  const modeFile = path.join(root, storeOf(store.skill), FAILURE_MODES_FOLDER, `${target.mode.slug}.md`);
  writeFileSync(modeFile, markTicket(readFileSync(modeFile, 'utf8'), url, ports.today));
  return { output: `✔ filed ${url}`, exit: 0 };
}

export function fileUpstream(context: Context): Report {
  const target = targetOf(context);
  if ('output' in target) return target;
  const open = openTicketReport(context, target.repo);
  if (open !== null) return open;
  const { mode, count, repo } = target;
  const issue = renderIssue({ skill: context.store.skill, mode, count, evidence: evidenceOf(context, mode) });
  if (!context.command.approved)
    return failed([
      `not filed on ${repo}: the Operator has not approved. Show them this issue, then rerun with --approved`,
      `title: ${issue.title}`,
      issue.body,
    ]);
  return file(context, target, issue);
}
