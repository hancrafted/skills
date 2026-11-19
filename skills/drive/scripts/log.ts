import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CONFIG_PATH, parseConfig } from './config.pure.ts';
import { run } from './git.ts';
import { commandEntry, type LogEntry, logPath, serializeEntry, topicOfCommand } from './log.pure.ts';

export function branchOf(cwd: string): string | null {
  const result = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  const branch = result.status === 0 ? result.stdout.trim() : '';
  return branch === '' || branch === 'HEAD' ? null : branch;
}

export function mainRootOf(cwd: string): string | null {
  const result = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd });
  return result.status === 0 ? path.dirname(result.stdout.trim()) : null;
}

export function configuredWorktree(cwd: string): { baseBranch: string; dir: string } | null {
  try {
    const root = run('git', ['rev-parse', '--show-toplevel'], {
      cwd,
    }).stdout.trim();
    const parsed = parseConfig(readFileSync(path.join(root, CONFIG_PATH), 'utf8'), '');
    return 'error' in parsed ? null : parsed.worktree;
  } catch {
    return null;
  }
}

const configuredBase = (cwd: string): string | null => configuredWorktree(cwd)?.baseBranch ?? null;

export function appendLog(cwd: string, topic: string | null, entry: LogEntry): void {
  try {
    const root = mainRootOf(cwd);
    if (topic === null || root === null) return;
    const file = path.join(root, logPath(topic));
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, serializeEntry(entry));
  } catch {
    return;
  }
}

export function logCommandAtExit(argv: readonly string[]): void {
  let lastError = '';
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    lastError = args.map(String).join(' ');
    original(...args);
  };
  process.on('exit', (code) => {
    const cwd = process.cwd();
    const branch = branchOf(cwd);
    appendLog(
      cwd,
      topicOfCommand(argv, branch),
      commandEntry({ argv, branch, base: configuredBase(cwd), exit: code, lastError }, new Date()),
    );
  });
}
