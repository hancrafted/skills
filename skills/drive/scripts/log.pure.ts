import { baseOfBranch, topicSlugOf } from './branch-topic.pure.ts';

export const SCRATCH = '.scratch';
export const LOG_FILE = 'drive.log.jsonl';

export interface CommandEntry {
  t: string;
  cmd: string;
  branch: string | null;
  base: string | null;
  exit: number | null;
  result: string;
}

export interface SubagentEntry {
  t: string;
  event: 'subagent-start' | 'subagent-stop';
  session: string;
  transcript: string;
  parent?: string;
  agent: string | null;
  branch: string | null;
}

export type LogEntry = CommandEntry | SubagentEntry;

const BRANCH_COMMANDS = new Set(['new', 'done']);

export const branchOfArgs = (argv: readonly string[]): string | null => {
  const branch = argv[2];
  return argv[0] === 'worktree' &&
    BRANCH_COMMANDS.has(argv[1] ?? '') &&
    branch !== undefined &&
    !branch.startsWith('--')
    ? branch
    : null;
};

export const topicOfCommand = (argv: readonly string[], cwdBranch: string | null): string | null =>
  topicSlugOf(branchOfArgs(argv)) ?? topicSlugOf(baseOfArgs(argv)) ?? topicSlugOf(cwdBranch);

export const logPath = (topic: string): string => `${SCRATCH}/${topic}/${LOG_FILE}`;

export const serializeEntry = (entry: LogEntry): string => `${JSON.stringify(entry)}\n`;

export function baseOfArgs(args: readonly string[]): string | null {
  const at = args.indexOf('--base');
  return at === -1 ? null : (args[at + 1] ?? null);
}

const RESULT_LIMIT = 300;

export const commandEntry = (
  facts: {
    argv: readonly string[];
    branch: string | null;
    base: string | null;
    exit: number;
    lastError: string;
  },
  now: Date,
): CommandEntry => ({
  t: now.toISOString(),
  cmd: facts.argv.join(' '),
  branch: branchOfArgs(facts.argv) ?? facts.branch,
  base: baseOfArgs(facts.argv) ?? baseOfBranch(branchOfArgs(facts.argv) ?? facts.branch) ?? facts.base,
  exit: facts.exit,
  result: facts.exit === 0 ? 'ok' : facts.lastError.slice(0, RESULT_LIMIT),
});

export function parseLog(text: string): LogEntry[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line): LogEntry[] => {
      try {
        const parsed = JSON.parse(line) as LogEntry;
        return typeof parsed === 'object' && parsed !== null ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

export const isSubagentEntry = (entry: LogEntry): entry is SubagentEntry => 'event' in entry;
