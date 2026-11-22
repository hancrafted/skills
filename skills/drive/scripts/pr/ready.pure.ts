import { isIntegrationBranch, SCRATCH, topicSlugOf } from '../core/index.ts';

export function topicOf(branch: string): string | null {
  return isIntegrationBranch(branch) ? topicSlugOf(branch) : null;
}

export function reviewPath(topic: string): string {
  return `${SCRATCH}/${topic}/review.md`;
}

export function notIntegrationBranch(branch: string): string {
  return `${branch} is not an Integration branch (<type>/<slug>); run drive pr ready on the Integration PR, not a Task branch`;
}

export function readyProblem(topic: string, reviewExists: boolean): string | null {
  return reviewExists
    ? null
    : `${reviewPath(topic)} does not exist: run the review (references/review.md) and log its verdicts before marking the PR ready`;
}

export function baseAheadProblem(base: string, branch: string, ahead: number): string | null {
  return ahead > 0
    ? `origin/${base} has ${ahead} commit${ahead === 1 ? '' : 's'} origin/${branch} lacks: run drive worktree sync, then drive push`
    : null;
}

export const noBaseBranch = (number: string): string => `PR ${number} reports no base branch`;

export function quoteRefusal(topic: string, problems: readonly string[]): string | null {
  return problems.length === 0
    ? null
    : `${reviewPath(topic)} has contradiction quotes that do not check out (drive review quotes):\n${problems.map((problem) => `- ${problem}`).join('\n')}`;
}

export function intentDriftProblem(body: string): string | null {
  return /^## Intent drift[ \t]*$/m.test(body)
    ? null
    : 'the PR body has no `## Intent drift` section: add one (say "none" if the Workflow held its intent) before marking the PR ready';
}
