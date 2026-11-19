import type { WorktreeConfig } from './config.pure.ts';

const BRANCHLESS = ['sync'] as const;
const COMMANDS = ['new', 'done', ...BRANCHLESS] as const;
type Command = (typeof COMMANDS)[number];

const isCommand = (word: string | undefined): word is Command => (COMMANDS as readonly string[]).includes(word ?? '');
const isBranchless = (command: Command): boolean => (BRANCHLESS as readonly string[]).includes(command);

export interface WorktreeArgs {
  command: Command;
  branch: string;
  base: string | null;
  kill: boolean;
  parent: string | null;
  issue: number | null;
}

interface Owner {
  parent: string | null;
  issue: number | null;
}

function readOwner(branch: string): Owner | { error: string } {
  const split = branch.indexOf('--');
  if (split === -1) return { parent: null, issue: null };
  const task = branch.slice(split + 2);
  if (task === '')
    return {
      error: `'${branch}' needs <parent>--<task>: the parent before the first --, the task after it`,
    };
  const ticket = /^(\d+)-./.exec(task);
  return {
    parent: branch.slice(0, split),
    issue: ticket === null ? null : Number(ticket[1]),
  };
}

export type Naming = Pick<WorktreeConfig, 'invoke' | 'baseBranch'>;

const usage = (invoke: string) =>
  `usage: ${invoke} new <branch> [--base <branch>]  |  ${invoke} done <branch> [--base <branch>] [--kill]  |  ${invoke} sync [--base <branch>]`;

function isBranch(value: string | undefined): value is string {
  return value !== undefined && value !== '' && !value.startsWith('--');
}

interface Flags {
  positional: string[];
  base: string | null;
  kill: boolean;
}

function readFlags(tokens: readonly string[]): Flags | { error: string } {
  const flags: Flags = { positional: [], base: null, kill: false };
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '--kill') flags.kill = true;
    else if (tokens[i] !== '--base') flags.positional.push(tokens[i]);
    else if (isBranch(tokens[i + 1])) flags.base = tokens[++i];
    else return { error: '--base needs a branch name' };
  }
  return flags;
}

function checkShape(command: Command, flags: Flags, invoke: string): string | null {
  const branches = flags.positional.filter((word) => isBranch(word));
  if (flags.positional.length !== branches.length || branches.length !== (isBranchless(command) ? 0 : 1))
    return usage(invoke);
  return checkFlags(command, flags);
}

function checkFlags(command: Command, flags: Flags): string | null {
  return flags.kill && command !== 'done' ? '--kill belongs to done' : null;
}

export function parseArgs(argv: readonly string[], invoke: string): WorktreeArgs | { error: string } {
  const [command, ...tokens] = argv;
  const flags = readFlags(tokens);
  if ('error' in flags) return flags;
  if (!isCommand(command))
    return {
      error: `unknown command '${command}'; expected new, done or sync`,
    };
  const error = checkShape(command, flags, invoke);
  if (error !== null) return { error };
  const branch = flags.positional[0] ?? '';
  const owner = readOwner(branch);
  if ('error' in owner) return owner;
  return {
    command,
    branch,
    base: flags.base,
    kill: flags.kill,
    ...owner,
  };
}

export function refuseNewBranch(
  args: WorktreeArgs,
  branchExists: (branch: string) => boolean,
  { invoke, baseBranch }: Naming,
): string | null {
  const { branch, parent, base } = args;
  if (parent === null) return null;
  const task = branch.slice(parent.length + 2);
  if (parent === baseBranch)
    return `a subagent branch cannot hang off ${baseBranch}; create its parent first: ${invoke} new <type>/<slug>, then ${invoke} new <type>/<slug>--${task} --base <type>/<slug>`;
  if (base !== parent) return `'${branch}' starts from its parent; run: ${invoke} new ${branch} --base ${parent}`;
  if (!branchExists(parent))
    return `parent branch '${parent}' does not exist; create it first: ${invoke} new ${parent}, then rerun this command`;
  return null;
}
