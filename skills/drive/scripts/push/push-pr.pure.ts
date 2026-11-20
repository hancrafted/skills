export type BranchPrState = 'none' | 'open' | 'merged';

export function branchPrState(pulls: readonly { number: number; state: string }[]): BranchPrState {
  if (pulls.some((pull) => pull.state === 'OPEN')) return 'open';
  return pulls.some((pull) => pull.state === 'MERGED') ? 'merged' : 'none';
}

export function refuseMerged(branch: string, state: BranchPrState): string | null {
  return state === 'merged'
    ? `the PR of ${branch} has merged; branch anew from the base branch (drive worktree new) instead of pushing more commits here`
    : null;
}

export function openingBody(spec: number, tickets: readonly number[]): string {
  return [`Spec: #${spec}`, '', ...tickets.map((ticket) => `Closes #${ticket}`)].join('\n');
}

export function missingCloses(body: string, tickets: readonly number[]): number[] {
  const closed = new Set([...body.matchAll(/^Closes #(\d+)\s*$/gim)].map((found) => Number(found[1])));
  return tickets.filter((ticket) => !closed.has(ticket));
}

export function closesProblem(where: string, body: string, tickets: readonly number[]): string | null {
  const missing = missingCloses(body, tickets);
  return missing.length === 0 ? null : `${where} lacks Closes for ${missing.map((ticket) => `#${ticket}`).join(', ')}`;
}

export function refuseSpecOffGithub(skipNote: string | null): string | null {
  return skipNote === null ? null : `--spec needs a GitHub remote to open or check the Integration PR; ${skipNote}`;
}

export function isGithubRemote(url: string): boolean {
  return /^(?:https?:\/\/(?:[^/@]+@)?|ssh:\/\/(?:[^/@]+@)?|[^/@]+@)github\.com[/:]/i.test(url.trim());
}

export function skipPrLookup(remoteUrl: string, remote: string): string | null {
  return isGithubRemote(remoteUrl) ? null : `! ${remote} is not on GitHub (${remoteUrl}); skipped the merged-PR check`;
}
