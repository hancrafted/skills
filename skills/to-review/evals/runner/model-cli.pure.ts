// Which model CLI the checklist judge and the reader probe call, and how each CLI's printed reply becomes answers.
// A judge from another family than the executor (Claude) avoids self-preference, so Gemini wins when installed.
// `EVAL_JUDGE` overrides: auto (the default), gemini, claude, or off to grade mechanically only.

export type ModelCli = 'claude' | 'gemini';

export interface CliChoice {
  readonly cli: ModelCli;
  /** True when the judge's family differs from the executor's. */
  readonly crossFamily: boolean;
  /** The bias a reader of the results must weigh; null for a cross-family judge. */
  readonly risk: string | null;
}

const SELF_PREFERENCE =
  'The judge and reader are Claude, the family that wrote the page, so they may prefer its work (self-preference); weigh judge and probe results with that bias in mind.';

const CLAUDE: CliChoice = { cli: 'claude', crossFamily: false, risk: SELF_PREFERENCE };
const GEMINI: CliChoice = { cli: 'gemini', crossFamily: true, risk: null };

const CHOICES: Readonly<Record<string, (geminiInstalled: boolean) => CliChoice | null>> = {
  auto: (geminiInstalled) => (geminiInstalled ? GEMINI : CLAUDE),
  gemini: (geminiInstalled) => {
    if (!geminiInstalled) throw new Error('EVAL_JUDGE=gemini, but no gemini CLI is on PATH');
    return GEMINI;
  },
  claude: () => CLAUDE,
  off: () => null,
};

export function chooseModelCli(setting: string | undefined, geminiInstalled: boolean): CliChoice | null {
  const choose = CHOICES[setting ?? 'auto'];
  if (choose === undefined) throw new Error(`EVAL_JUDGE=${setting}; use ${Object.keys(CHOICES).join(', ')}`);
  return choose(geminiInstalled);
}

export interface Reply {
  /** The model that answered, as the CLI reports it. */
  readonly model: string;
  readonly costUsd: number | null;
  /** The answers, still unchecked JSON. */
  readonly value: unknown;
}

/** The first JSON object in a model's free text, fenced or not. */
function jsonIn(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) throw new Error(`gemini gave no JSON answer: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

interface ClaudeResult {
  readonly result?: string;
  readonly total_cost_usd?: number;
  readonly modelUsage?: Record<string, unknown>;
  readonly structured_output?: unknown;
}

interface GeminiResult {
  readonly response?: string;
  readonly stats?: { models?: Record<string, unknown> };
}

function claudeReply(stdout: string): Reply {
  const result = JSON.parse(stdout) as ClaudeResult;
  if (result.structured_output === undefined)
    throw new Error(`claude gave no structured answer: ${result.result ?? stdout.slice(0, 200)}`);
  const [model = 'unknown'] = Object.keys(result.modelUsage ?? {});
  return { model, costUsd: result.total_cost_usd ?? null, value: result.structured_output };
}

function geminiReply(stdout: string): Reply {
  const result = JSON.parse(stdout) as GeminiResult;
  const [model = 'unknown'] = Object.keys(result.stats?.models ?? {});
  return { model, costUsd: null, value: jsonIn(result.response ?? '') };
}

/** `claude -p --output-format json --json-schema` or `gemini -p --output-format json` stdout, as answers. */
export function parseReply(cli: ModelCli, stdout: string): Reply {
  return cli === 'claude' ? claudeReply(stdout) : geminiReply(stdout);
}
