import path from 'node:path';
import { DECISIONS_PREFIX } from '../core/index.ts';

export const isDecisionBranch = (branch: string): boolean =>
  branch.startsWith(DECISIONS_PREFIX) && branch.length > DECISIONS_PREFIX.length;

export const matchingGlob = (file: string, globs: readonly string[]): string | null =>
  globs.find((glob) => path.posix.matchesGlob(file, glob)) ?? null;

export function guardViolations(branch: string, changed: readonly string[], globs: readonly string[]): string[] {
  if (isDecisionBranch(branch)) return [];
  return changed.flatMap((file) => {
    const glob = matchingGlob(file, globs);
    return glob === null
      ? []
      : [
          `${file} is a Decision doc (decisionDocs: ${glob}); it changes only on a ${DECISIONS_PREFIX}<topic> branch, this is '${branch}'`,
        ];
  });
}

export interface GuardOptions {
  against: string | null;
}

export function parseGuardArgs(args: readonly string[]): GuardOptions | { error: string } {
  const usage = { error: 'usage: drive guard [--against <ref>]' };
  if (args.length === 0) return { against: null };
  const [flag, ref] = args;
  return args.length === 2 && flag === '--against' && ref !== undefined && !ref.startsWith('--')
    ? { against: ref }
    : usage;
}
