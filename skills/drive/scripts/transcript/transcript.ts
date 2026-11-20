import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fail, isSubagentEntry, logPath, mainRootOf, parseLog, SCRATCH } from '../core/index.ts';
import { extractEvents, renderEvents } from './transcript.pure.ts';

const USAGE = 'usage: drive transcript <session-id> | --topic <topic> [--tools] [--since-last]';

interface Options {
  session: string | null;
  topic: string | null;
  tools: boolean;
  sinceLast: boolean;
}

const FLAGS: Record<string, (options: Options, rest: string[]) => void> = {
  '--tools': (options) => {
    options.tools = true;
  },
  '--since-last': (options) => {
    options.sinceLast = true;
  },
  '--topic': (options, rest) => {
    options.topic = rest.shift() ?? null;
  },
};

const isPositional = (arg: string, options: Options): boolean => !arg.startsWith('--') && options.session === null;

function parseArgs(args: readonly string[]): Options | null {
  const options: Options = {
    session: null,
    topic: null,
    tools: false,
    sinceLast: false,
  };
  const rest = [...args];
  for (let arg = rest.shift(); arg !== undefined; arg = rest.shift()) {
    const flag = FLAGS[arg];
    if (flag !== undefined) flag(options, rest);
    else if (isPositional(arg, options)) options.session = arg;
    else return null;
  }
  return (options.session === null) === (options.topic === null) ? null : options;
}

const projectsDir = (): string => path.join(homedir(), '.claude', 'projects');

export const projectSlug = (root: string): string => root.replace(/[/.]/g, '-');

function findSessionFile(root: string, session: string): string | null {
  const preferred = path.join(projectsDir(), projectSlug(root), `${session}.jsonl`);
  if (existsSync(preferred)) return preferred;
  try {
    for (const dir of readdirSync(projectsDir())) {
      const candidate = path.join(projectsDir(), dir, `${session}.jsonl`);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

const subagentFiles = (sessionFile: string): string[] => {
  const dir = path.join(sessionFile.replace(/\.jsonl$/, ''), 'subagents');
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.jsonl'))
      .sort()
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
};

type Cursors = Record<string, number>;
const cursorFile = (root: string, key: string): string =>
  path.join(root, SCRATCH, '.transcript-cursors', `${key}.json`);

function readCursors(file: string): Cursors {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Cursors;
  } catch {
    return {};
  }
}

function sessionsOfTopic(root: string, topic: string): string[] {
  const log = path.join(root, logPath(topic));
  if (!existsSync(log)) fail(`no drive log for topic '${topic}' at ${logPath(topic)}`);
  const transcripts = parseLog(readFileSync(log, 'utf8'))
    .filter(isSubagentEntry)
    .map((entry) => entry.parent ?? entry.transcript);
  const sessions = [...new Set(transcripts)];
  if (sessions.length === 0)
    fail(`no sessions linked in ${logPath(topic)}: the SubagentStart hook has logged none; pass a session id instead`);
  return sessions;
}

function transcriptFiles(root: string, options: Options): string[] {
  if (options.topic !== null) return sessionsOfTopic(root, options.topic);
  const session = options.session as string;
  return [findSessionFile(root, session) ?? fail(`no transcript for session '${session}'`)];
}

const labelOf = (file: string, sessionFile: string): string =>
  file === sessionFile
    ? 'orch'
    : path
        .basename(file, '.jsonl')
        .replace(/^agent-/, '')
        .slice(0, 8);

function readAll(sessionFiles: readonly string[], options: Options, cursors: Cursors) {
  const next: Cursors = {};
  const output: string[] = [];
  for (const sessionFile of sessionFiles) {
    for (const file of [sessionFile, ...subagentFiles(sessionFile)].filter((candidate) => existsSync(candidate))) {
      const skip = cursors[file] ?? 0;
      const { events, lines } = extractEvents(readFileSync(file, 'utf8'), {
        skip,
        tools: options.tools,
      });
      next[file] = lines;
      output.push(...renderEvents(labelOf(file, sessionFile), events));
    }
  }
  return { next, output: output.sort() };
}

export function runTranscript(args: readonly string[]): void {
  const options = parseArgs(args) ?? fail(USAGE);
  const root = mainRootOf(process.cwd()) ?? process.cwd();
  const key = options.topic ?? (options.session as string);
  const cursors = options.sinceLast ? readCursors(cursorFile(root, key)) : {};
  const { next, output } = readAll(transcriptFiles(root, options), options, cursors);
  if (output.length > 0) console.log(output.join('\n'));
  if (!options.sinceLast) return;
  mkdirSync(path.dirname(cursorFile(root, key)), { recursive: true });
  writeFileSync(cursorFile(root, key), JSON.stringify(next));
}
