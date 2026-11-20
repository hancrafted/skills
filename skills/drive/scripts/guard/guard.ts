import { DECISIONS_PREFIX, fail, git, loadConfig } from '../core/index.ts';
import { guardViolations, parseGuardArgs } from './guard.pure.ts';

function stdout(args: readonly string[], cwd: string): string {
  const result = git(cwd, args);
  if (result.status !== 0) fail(`git ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout;
}

function currentBranch(root: string): string {
  const current = git(root, ['symbolic-ref', '--short', '-q', 'HEAD']);
  return current.status === 0 ? current.stdout.trim() : '(detached HEAD)';
}

function changedFiles(root: string, against: string | null): string[] {
  const diff =
    against === null
      ? ['diff', '--cached', '--name-only', '--no-renames', '-z']
      : ['diff', '--name-only', '--no-renames', '-z', `${against}...HEAD`];
  return stdout(diff, root).split('\0').filter(Boolean);
}

export function runGuard(args: readonly string[], scriptsRoot: string): void {
  const options = parseGuardArgs(args);
  if ('error' in options) fail(options.error);
  const root = stdout(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  const { decisionDocs } = loadConfig(root, scriptsRoot);
  const mergeStagesWhatTheOtherSideChanged =
    options.against === null && git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0;
  if (mergeStagesWhatTheOtherSideChanged) return;
  const changed = changedFiles(root, options.against);
  const branch = currentBranch(root);
  const violations = guardViolations(branch, changed, decisionDocs);
  if (violations.length === 0) return;
  for (const message of violations) console.error(`✖ ${message}`);
  console.error(
    `  Move the change to a ${DECISIONS_PREFIX}<topic> branch; a Subagent lists proposed terms in its report instead.`,
  );
  process.exit(1);
}
