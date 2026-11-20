import { fail, run } from '../core/index.ts';
import { parsePrArgs, type WatchTiming } from './args.pure.ts';
import { runReady } from './ready.ts';
import {
  closesIn,
  idsOf,
  judge,
  judgeIntegration,
  parseReviewComments,
  parseView,
  ticketsLine,
  type PullRequestView,
  type Verdict,
} from './watch.pure.ts';

const FAILED_POLLS_TOLERATED = 3;

export interface Watch {
  view: () => PullRequestView | { error: string };
  sleep: (milliseconds: number) => Promise<void>;
  timing: WatchTiming;
  decide?: (view: PullRequestView) => Verdict;
}

export async function watchPullRequest({
  view,
  sleep,
  timing,
  decide,
}: Watch): Promise<NonNullable<Verdict> | { error: string }> {
  let seen: Set<string> | null = null;
  let failedPolls = 0;
  for (;;) {
    const current = view();
    if ('error' in current) {
      if (++failedPolls > FAILED_POLLS_TOLERATED) return current;
    } else {
      failedPolls = 0;
      const verdict = (decide ?? ((view) => judge(view, seen ?? idsOf(view))))(current);
      if (verdict !== null) return verdict;
      seen ??= idsOf(current);
    }
    await sleep(timing.pollMilliseconds);
  }
}

const FIELDS = 'state,mergeCommit,reviews,comments';
const INTEGRATION_FIELDS = 'state,mergeCommit,mergeable,statusCheckRollup,body';

function ghIntegrationView(number: string): PullRequestView | { error: string } {
  const result = run('gh', ['pr', 'view', number, '--json', INTEGRATION_FIELDS]);
  if (result.status !== 0) return { error: `gh pr view ${number} failed:\n${result.stderr}` };
  return parseView(result.stdout);
}

function openTickets(body: string): number[] | { error: string } {
  const open: number[] = [];
  for (const ticket of closesIn(body)) {
    const result = run('gh', ['issue', 'view', String(ticket), '--json', 'state', '--jq', '.state']);
    if (result.status !== 0) return { error: `gh issue view ${ticket} failed:\n${result.stderr}` };
    if (result.stdout.trim() === 'OPEN') open.push(ticket);
  }
  return open;
}

function ghView(number: string): PullRequestView | { error: string } {
  const result = run('gh', ['pr', 'view', number, '--json', FIELDS]);
  if (result.status !== 0) return { error: `gh pr view ${number} failed:\n${result.stderr}` };
  const view = parseView(result.stdout);
  if ('error' in view) return view;
  const inline = run('gh', ['api', '--paginate', '--slurp', `repos/{owner}/{repo}/pulls/${number}/comments`]);
  if (inline.status !== 0) return { error: `gh api pulls/${number}/comments failed:\n${inline.stderr}` };
  const reviewComments = parseReviewComments(inline.stdout);
  return 'error' in reviewComments ? reviewComments : { ...view, reviewComments };
}

const sleepFor = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function reportMerge(body: string): void {
  const open = openTickets(body);
  if ('error' in open) fail(open.error);
  console.log(ticketsLine(open));
}

async function watchIntegration(number: string, timing: WatchTiming) {
  let body = '';
  const outcome = await watchPullRequest({
    view: () => {
      const view = ghIntegrationView(number);
      if (!('error' in view)) body = view.body ?? body;
      return view;
    },
    sleep: sleepFor,
    timing,
    decide: judgeIntegration,
  });
  if ('error' in outcome) fail(outcome.error);
  console.log(outcome.line);
  if (outcome.exit === 12) reportMerge(body);
  process.exit(outcome.exit);
}

export async function runPr(argv: readonly string[]): Promise<void> {
  const options = parsePrArgs(argv);
  if ('error' in options) fail(options.error);
  if (options.verb === 'ready') return runReady(options.number);
  if (options.integration) return watchIntegration(options.number, options.timing);
  const outcome = await watchPullRequest({
    view: () => ghView(options.number),
    sleep: sleepFor,
    timing: options.timing,
  });
  if ('error' in outcome) fail(outcome.error);
  console.log(outcome.line);
  process.exit(outcome.exit);
}
