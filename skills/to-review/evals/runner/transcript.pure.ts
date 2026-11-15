// Reads a headless `claude -p --output-format stream-json` transcript, one JSON event per line: the tool calls the
// agent made (subagents included) and the run's facts from its init and result events.

/** One tool call as the agent sent it; tools.json is a list of these. */
export interface ToolCall {
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
}

export interface RunFacts {
  /** The folder the agent ran in, as the CLI resolved it. */
  readonly cwd: string | null;
  readonly model: string | null;
  readonly durationSeconds: number;
  /** Input, output and cache tokens together. */
  readonly tokens: number;
  readonly costUsd: number;
  /** Why the run did not finish cleanly; null when it did. */
  readonly error: string | null;
}

type Event = Record<string, unknown>;
interface Block {
  readonly type?: string;
  readonly name?: string;
  readonly input?: Record<string, unknown>;
}

function events(lines: readonly string[]): Event[] {
  return lines.flatMap((text) => {
    try {
      const event: unknown = JSON.parse(text);
      return event !== null && typeof event === 'object' ? [event as Event] : [];
    } catch {
      return [];
    }
  });
}

export function toolCalls(lines: readonly string[]): ToolCall[] {
  return events(lines)
    .filter((event) => event.type === 'assistant')
    .flatMap((event) => ((event.message as { content?: Block[] } | undefined)?.content ?? []) as Block[])
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({ name: String(block.name), input: block.input ?? {} }));
}

const sum = (usage: Record<string, unknown>): number =>
  ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']
    .map((key) => Number(usage[key] ?? 0))
    .reduce((total, value) => total + value, 0);

function errorOf(result: Event | undefined): string | null {
  if (result === undefined) return 'the transcript has no result; the agent was stopped or crashed';
  return result.is_error === true ? `the agent ended with ${String(result.subtype)}` : null;
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

export function runFacts(lines: readonly string[]): RunFacts {
  const all = events(lines);
  const init = all.find((event) => event.type === 'system' && event.subtype === 'init') ?? {};
  const result = all.filter((event) => event.type === 'result').at(-1);
  const { duration_ms = 0, total_cost_usd = 0, usage = {} } = result ?? {};
  return {
    cwd: text(init.cwd),
    model: text(init.model),
    durationSeconds: Number(duration_ms) / 1000,
    tokens: sum(usage as Record<string, unknown>),
    costUsd: Number(total_cost_usd),
    error: errorOf(result),
  };
}
