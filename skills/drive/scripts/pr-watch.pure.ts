export const DRIVE_MARKER = '<!-- drive -->';

interface Remark {
  id: string;
  body: string;
}

export interface InlineRemark extends Remark {
  path: string;
  line: number | null;
}

export interface PullRequestView {
  state: string;
  mergeCommit: { oid: string } | null;
  reviews: (Remark & { state?: string })[];
  comments: Remark[];
  reviewComments: InlineRemark[];
  mergeable?: string;
  checks?: Check[];
  body?: string;
}

export interface Check {
  name: string;
  status?: string;
  conclusion?: string;
  state?: string;
}

export type Verdict = { exit: 0 | 2 | 3 | 10 | 11 | 12 | 13; line: string } | null;

const isOperatorRemark = (remark: Remark): boolean => !remark.body.trimStart().startsWith(DRIVE_MARKER);

const allRemarks = (view: PullRequestView): (Remark & { state?: string; path?: string; line?: number | null })[] => [
  ...view.reviews,
  ...view.comments,
  ...view.reviewComments,
];

export function idsOf(view: PullRequestView): Set<string> {
  return new Set(allRemarks(view).map((remark) => remark.id));
}

function describeRemark(remark: Remark & { state?: string; path?: string; line?: number | null }): string {
  const body = remark.body.trim();
  const text = body === '' ? `(${remark.state ?? 'review'} without a body)` : body;
  if (remark.path === undefined) return text;
  return `${remark.path}${remark.line == null ? '' : `:${remark.line}`} ${text}`;
}

export function judge(view: PullRequestView, seen: ReadonlySet<string>): Verdict {
  if (view.state === 'MERGED') return { exit: 0, line: `merged ${view.mergeCommit?.oid ?? ''}`.trimEnd() };
  if (view.state === 'CLOSED') return { exit: 2, line: 'closed' };
  const fresh = allRemarks(view).filter((remark) => !seen.has(remark.id) && isOperatorRemark(remark));
  if (fresh.length === 0) return null;
  return { exit: 3, line: fresh.map(describeRemark).join('\n---\n') };
}

export function parseView(stdout: string): PullRequestView | { error: string } {
  try {
    const parsed = JSON.parse(stdout) as Partial<PullRequestView> & { statusCheckRollup?: unknown };
    const rollup = parsed.statusCheckRollup;
    if (typeof parsed.state !== 'string') return { error: 'gh pr view returned no state' };
    return {
      state: parsed.state,
      mergeCommit: parsed.mergeCommit ?? null,
      reviews: parsed.reviews ?? [],
      comments: parsed.comments ?? [],
      reviewComments: [],
      mergeable: parsed.mergeable,
      checks: rollup === undefined ? undefined : parseChecks(rollup),
      body: parsed.body,
    };
  } catch (error) {
    return {
      error: `gh pr view returned invalid JSON: ${(error as Error).message}`,
    };
  }
}

interface ApiReviewComment {
  id: number;
  body: string;
  path: string;
  line?: number | null;
  original_line?: number | null;
}

export function parseReviewComments(stdout: string): InlineRemark[] | { error: string } {
  try {
    const parsed = JSON.parse(stdout) as unknown[];
    const items = parsed.flat() as ApiReviewComment[];
    return items.map((item) => ({
      id: `rc${item.id}`,
      body: item.body,
      path: item.path,
      line: item.line ?? item.original_line ?? null,
    }));
  } catch (error) {
    return { error: `gh api returned invalid JSON: ${(error as Error).message}` };
  }
}

const FAILING_CHECK_CONCLUSIONS = new Set([
  'FAILURE',
  'TIMED_OUT',
  'CANCELLED',
  'STARTUP_FAILURE',
  'ACTION_REQUIRED',
  'ERROR',
]);

const isFailing = (check: Check): boolean =>
  FAILING_CHECK_CONCLUSIONS.has(check.conclusion ?? '') || FAILING_CHECK_CONCLUSIONS.has(check.state ?? '');

const failingChecks = (view: PullRequestView): Verdict => {
  const failing = (view.checks ?? []).filter(isFailing);
  return failing.length === 0
    ? null
    : { exit: 10, line: `failing checks: ${failing.map((check) => check.name).join(', ')}` };
};

export function judgeIntegration(view: PullRequestView): Verdict {
  if (view.state === 'MERGED') return { exit: 12, line: `merged ${view.mergeCommit?.oid ?? ''}`.trimEnd() };
  if (view.state === 'CLOSED') return { exit: 13, line: 'closed' };
  if (view.mergeable === 'CONFLICTING') return { exit: 11, line: 'merge conflict with the base branch' };
  return failingChecks(view);
}

export function closesIn(body: string): number[] {
  const numbers = [...body.matchAll(/\bcloses #(\d+)/gi)].map((found) => Number(found[1]));
  return [...new Set(numbers)];
}

export function ticketsLine(stillOpen: readonly number[]): string {
  return stillOpen.length === 0
    ? 'all tickets closed'
    : `tickets still open: ${stillOpen.map((ticket) => `#${ticket}`).join(', ')}`;
}

interface RollupItem {
  name?: string;
  context?: string;
  status?: string;
  conclusion?: string;
  state?: string;
}

export function parseChecks(rollup: unknown): Check[] {
  if (!Array.isArray(rollup)) return [];
  return (rollup as RollupItem[]).map((item) => ({
    name: item.name ?? item.context ?? 'check',
    status: item.status,
    conclusion: item.conclusion,
    state: item.state,
  }));
}
