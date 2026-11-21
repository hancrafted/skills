export interface WatchTiming {
  pollMilliseconds: number;
}

export const WATCH_TIMING: WatchTiming = { pollMilliseconds: 30_000 };

export const USAGE = [
  'usage: drive pr watch <number> [--poll-milliseconds <n>] [--integration]',
  '       drive pr ready <number>',
  'watch exits 0 merged, 2 closed unmerged, 3 new review comment (the Decision PR).',
  'watch --integration exits 10 failing check, 11 merge conflict, 12 merged (lists the tickets still open), 13 closed unmerged.',
  'ready refuses without .scratch/<topic>/review.md, when its ## Contradictions quotes do not check out, or while origin/<base> has commits origin/<Integration branch> lacks (run drive worktree sync, then drive push).',
].join('\n');

export type PrArgs =
  | { verb: 'watch'; number: string; integration: boolean; timing: WatchTiming }
  | { verb: 'ready'; number: string }
  | { error: string };

function readWatchFlags(flags: readonly string[]): { integration: boolean; timing: WatchTiming } | null {
  let integration = false;
  let timing = WATCH_TIMING;
  for (let at = 0; at < flags.length; at++) {
    if (flags[at] === '--integration') integration = true;
    else if (flags[at] === '--poll-milliseconds') {
      const pollMilliseconds = Number(flags[++at]);
      if (!Number.isInteger(pollMilliseconds) || pollMilliseconds < 1) return null;
      timing = { pollMilliseconds };
    } else return null;
  }
  return { integration, timing };
}

export function parsePrArgs(argv: readonly string[]): PrArgs {
  const [verb, number, ...flags] = argv;
  if (number === undefined || !/^\d+$/.test(number)) return { error: USAGE };
  if (verb === 'ready') return flags.length === 0 ? { verb, number } : { error: USAGE };
  if (verb !== 'watch') return { error: USAGE };
  const read = readWatchFlags(flags);
  return read === null ? { error: USAGE } : { verb, number, ...read };
}
