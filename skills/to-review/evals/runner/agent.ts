// Launches one headless `claude -p` in a sandbox and streams its transcript to disk. Safe mode, no slash commands
// and an empty MCP config keep the person's CLAUDE.md, skills, plugins, hooks and MCP servers out of the run, so
// the only instructions an arm sees are its invocation and, for a skill arm, the skill copy beside the case.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

export interface AgentRun {
  /** The agent's cwd. */
  readonly cwd: string;
  readonly prompt: string;
  /** Where the stream-json transcript goes, one event per line. */
  readonly transcript: string;
  readonly model: string | undefined;
  readonly timeoutMs: number;
}

const FLAGS = [
  '--output-format',
  'stream-json',
  '--verbose',
  '--safe-mode',
  '--disable-slash-commands',
  '--strict-mcp-config',
  '--no-chrome',
  '--no-session-persistence',
  '--permission-mode',
  'bypassPermissions',
];

/** Resolves when the agent exits or is stopped at the timeout; a stopped run's transcript has no result. */
export async function runAgent({ cwd, prompt, transcript, model, timeoutMs }: AgentRun): Promise<void> {
  const args = ['-p', prompt, ...FLAGS, ...(model === undefined ? [] : ['--model', model])];
  // A nested session refuses to start while CLAUDECODE says it is inside one; this run is a separate process.
  const env = { ...process.env, CLAUDECODE: undefined };
  const child = spawn('claude', args, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'] });
  const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  try {
    await Promise.all([pipeline(child.stdout, createWriteStream(transcript)), exited]);
  } finally {
    clearTimeout(timer);
  }
}
