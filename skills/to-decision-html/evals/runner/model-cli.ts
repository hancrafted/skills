// Asks the judge's or the reader's model one question through its CLI, inside a folder holding only the page's
// views, so the model reads the screenshots and text and nothing else. Claude runs in safe mode with Read as its one
// tool, confined to that folder; Gemini gets the files attached with its `@file` syntax.
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { chooseModelCli, parseReply, type CliChoice, type Reply } from './model-cli.pure.ts';

const run = promisify(execFile);

/** The judge CLI for this machine: EVAL_JUDGE's choice, else Gemini when installed, else Claude; null when off. */
export function judgeCli(): CliChoice | null {
  const geminiInstalled = spawnSync('which', ['gemini'], { stdio: 'ignore' }).status === 0;
  return chooseModelCli(process.env.EVAL_JUDGE, geminiInstalled);
}

export interface Question {
  /** The folder holding the views; the CLI's working directory. */
  readonly dir: string;
  readonly files: readonly string[];
  readonly prompt: string;
  readonly schema: object;
}

const TIMEOUT_MS = 10 * 60_000;

function argsFor(cli: CliChoice['cli'], { files, prompt, schema }: Question): string[] {
  const model = process.env.EVAL_JUDGE_MODEL;
  if (cli === 'gemini') {
    const attached = `${prompt}\n\nThe files: ${files.map((file) => `@${file}`).join(' ')}`;
    return ['-p', attached, '--output-format', 'json', ...(model === undefined ? [] : ['-m', model])];
  }
  return [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(schema),
    '--tools',
    'Read',
    '--safe-mode',
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--no-chrome',
    '--no-session-persistence',
    ...(model === undefined ? [] : ['--model', model]),
  ];
}

export async function ask({ cli }: CliChoice, question: Question): Promise<Reply> {
  // A nested Claude session refuses to start while CLAUDECODE says it is inside one; this is a separate process.
  const env = { ...process.env, CLAUDECODE: undefined };
  const { stdout } = await run(cli, argsFor(cli, question), {
    cwd: question.dir,
    env,
    timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  return parseReply(cli, stdout);
}
