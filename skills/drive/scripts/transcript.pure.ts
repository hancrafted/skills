export type EventKind = 'operator' | 'question' | 'error' | 'interrupt' | 'tool' | 'skill';

export interface TranscriptEvent {
  t: string;
  kind: EventKind;
  text: string;
}

export interface Extracted {
  events: TranscriptEvent[];
  lines: number;
}

type Json = Record<string, unknown>;
const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const blocksOf = (content: unknown): Json[] => (Array.isArray(content) ? content.filter(isJson) : []);
const firstLines = (text: string, count: number): string => text.split('\n').slice(0, count).join(' | ').trim();
const clip = (text: string, limit = 240): string => (text.length > limit ? `${text.slice(0, limit)}…` : text);

const INTERRUPT = /\[Request interrupted by user/;
const REFUSAL = /refus|denied|not allowed|permission to use|must first/i;

const isOperatorMessage = (line: Json): boolean => {
  if (line.isMeta === true || line.isCompactSummary === true || line.isSidechain === true) return false;
  return !isJson(line.origin) || line.origin.kind === 'human';
};

function resultText(block: Json): string {
  const content = block.content;
  if (typeof content === 'string') return content;
  return blocksOf(content)
    .map((part) => asString(part.text))
    .join('\n');
}

function questionsOf(block: Json): string[] {
  const questions = isJson(block.input) && Array.isArray(block.input.questions) ? block.input.questions : [];
  return questions.filter(isJson).map((q) => asString(q.question));
}

const asQuestion = (t: string, text: string): TranscriptEvent => ({
  t,
  kind: 'question',
  text: clip(text),
});

function textQuestion(t: string, block: Json): TranscriptEvent[] {
  const last = asString(block.text).trim().split('\n').at(-1) ?? '';
  return last.endsWith('?') ? [asQuestion(t, last)] : [];
}

function toolCall(t: string, block: Json): TranscriptEvent[] {
  const input = isJson(block.input) ? block.input : {};
  if (block.name === 'Skill')
    return [
      {
        t,
        kind: 'skill',
        text: `${asString(input.skill)} ${asString(input.args)}`.trim(),
      },
    ];
  const detail = asString(input.command) || asString(input.file_path) || asString(input.description);
  return [
    {
      t,
      kind: 'tool',
      text: clip(`${asString(block.name)} ${firstLines(detail, 1)}`.trim()),
    },
  ];
}

interface Scope {
  tools: boolean;
  orchestrator: boolean;
}

function assistantBlock(t: string, block: Json, scope: Scope): TranscriptEvent[] {
  if (block.type === 'text') return scope.orchestrator ? textQuestion(t, block) : [];
  if (block.type !== 'tool_use') return [];
  if (block.name === 'AskUserQuestion')
    return scope.orchestrator ? questionsOf(block).map((text) => asQuestion(t, text)) : [];
  return scope.tools ? toolCall(t, block) : [];
}

const exitedNonZero = (block: Json): boolean =>
  [block.exit_code, block.exitCode].some((code) => typeof code === 'number' && code !== 0);

function toolResult(t: string, block: Json): TranscriptEvent[] {
  if (block.is_error !== true && !exitedNonZero(block)) return [];
  const text = resultText(block);
  const mark = block.is_error === true && REFUSAL.test(text) ? '  [refusal]' : '';
  return [{ t, kind: 'error', text: clip(firstLines(text, 4) + mark, 600) }];
}

function userBlock(t: string, block: Json): TranscriptEvent[] {
  if (block.type === 'tool_result') return toolResult(t, block);
  const text = asString(block.text);
  return block.type === 'text' && INTERRUPT.test(text) ? [{ t, kind: 'interrupt', text: clip(text) }] : [];
}

const LOCAL_OUTPUT = /^\s*<local-command-(stdout|caveat)>/;
const COMMAND_NAME = /<command-name>\s*\/?([^<]*?)\s*<\/command-name>/;
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;

const commandText = (raw: string, name: string): string =>
  `/${name} ${COMMAND_ARGS.exec(raw)?.[1]?.trim() ?? ''}`.trim();

export function operatorText(raw: string, tools: boolean): string | null {
  if (LOCAL_OUTPUT.test(raw)) return tools ? raw : null;
  const name = COMMAND_NAME.exec(raw)?.[1];
  return name === undefined ? raw : commandText(raw, name);
}

const operatorEvent = (t: string, raw: string, tools: boolean): TranscriptEvent[] => {
  const text = operatorText(raw, tools);
  return text === null || text.trim() === '' ? [] : [{ t, kind: 'operator', text: clip(text, 600) }];
};

function blockMessage(blocks: readonly Json[]): string {
  return blocks
    .flatMap((block) => {
      if (block.type === 'image') return ['[image]'];
      const text = asString(block.text);
      return block.type === 'text' && !INTERRUPT.test(text) ? [text] : [];
    })
    .join(' ');
}

function userEvents(line: Json, t: string, tools: boolean): TranscriptEvent[] {
  const content = isJson(line.message) ? line.message.content : undefined;
  if (typeof content !== 'string') {
    const blocks = blocksOf(content);
    const found = blocks.flatMap((block) => userBlock(t, block));
    if (blocks.some((block) => block.type === 'tool_result') || !isOperatorMessage(line)) return found;
    return [...found, ...operatorEvent(t, blockMessage(blocks), tools)];
  }
  if (INTERRUPT.test(content)) return [{ t, kind: 'interrupt', text: clip(content) }];
  return isOperatorMessage(line) ? operatorEvent(t, content, tools) : [];
}

function lineEvents(raw: string, tools: boolean): TranscriptEvent[] {
  let line: unknown;
  try {
    line = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isJson(line) || !isJson(line.message) || typeof line.timestamp !== 'string') return [];
  const { timestamp: t, message } = line;
  if (line.type === 'user') return userEvents(line, t, tools);
  if (line.type !== 'assistant') return [];
  const scope = { tools, orchestrator: line.isSidechain !== true };
  return blocksOf(message.content).flatMap((block) => assistantBlock(t, block, scope));
}

export function extractEvents(text: string, options: { skip?: number; tools?: boolean } = {}): Extracted {
  const all = text.split('\n').filter((line) => line.trim() !== '');
  const events = all.slice(options.skip ?? 0).flatMap((raw) => lineEvents(raw, options.tools === true));
  return { events, lines: all.length };
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function renderEvents(label: string, events: readonly TranscriptEvent[]): string[] {
  return [...events]
    .sort((a, b) => a.t.localeCompare(b.t))
    .map((event) => `${localTime(event.t)}  ${label}  ${event.kind.padEnd(9)} ${event.text.replace(/\n/g, ' ')}`);
}
