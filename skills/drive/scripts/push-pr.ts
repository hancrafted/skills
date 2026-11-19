import { capture, run } from './git.ts';
import { fail } from './project.ts';
import { branchPrState, type BranchPrState, closesProblem, openingBody } from './push-pr.pure.ts';

interface Heads {
  branch: string;
  base: string;
}

export function branchPr(branch: string, cwd: string): BranchPrState {
  const result = run('gh', ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,state'], { cwd });
  if (result.status !== 0) fail(`gh pr list --head ${branch} failed:\n${result.stderr}`);
  return branchPrState(JSON.parse(result.stdout) as { number: number; state: string }[]);
}

function ticketsOf(spec: number, cwd: string): number[] {
  const result = run(
    'gh',
    ['api', '--paginate', `repos/{owner}/{repo}/issues/${spec}/sub_issues`, '--jq', '.[].number'],
    {
      cwd,
    },
  );
  if (result.status !== 0) fail(`gh api issues/${spec}/sub_issues failed:\n${result.stderr}`);
  const tickets = result.stdout.split(/\s+/).filter(Boolean).map(Number);
  if (tickets.length === 0) fail(`#${spec} has no sub-issues; is it the epic of the spec?`);
  return tickets;
}

function createDraft(spec: number, tickets: readonly number[], heads: Heads & { cwd: string }): string {
  const { branch, base, cwd } = heads;
  const title = capture('gh', ['issue', 'view', String(spec), '--json', 'title', '--jq', '.title'], cwd);
  const args = ['pr', 'create', '--draft', '--base', base, '--head', branch, '--title', title];
  const created = run('gh', [...args, '--body', openingBody(spec, tickets)], { cwd });
  if (created.status !== 0) fail(`gh pr create failed:\n${created.stderr}`);
  return created.stdout.trim();
}

function checkCloses(url: string, tickets: readonly number[], cwd: string): void {
  const body = capture('gh', ['pr', 'view', url, '--json', 'body', '--jq', '.body'], cwd);
  const problem = closesProblem(url, body, tickets);
  if (problem !== null) fail(problem);
}

export function syncIntegrationPr(spec: number, heads: Heads & { state: BranchPrState }, cwd: string): void {
  const tickets = ticketsOf(spec, cwd);
  const list = tickets.map((ticket) => `#${ticket}`).join(', ');
  if (heads.state === 'open') {
    checkCloses(heads.branch, tickets, cwd);
    console.log(`✔ the open PR closes ${list}`);
    return;
  }
  const url = createDraft(spec, tickets, { ...heads, cwd });
  checkCloses(url, tickets, cwd);
  console.log(`✔ opened draft ${url} closing ${list}`);
}
