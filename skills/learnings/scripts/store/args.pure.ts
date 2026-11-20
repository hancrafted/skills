export const VERBS = ['record', 'list', 'similar', 'check', 'file-upstream'] as const;
export type Verb = (typeof VERBS)[number];

const VALUE_FLAGS = [
  'skill',
  'topic',
  'date',
  'failure',
  'evidence',
  'correction',
  'regressed',
  'title',
  'enforcer',
  'repo',
] as const;

export const USAGE = [
  'usage: learnings <verb> --skill <name> ...',
  '  record --skill <name> --topic <topic> --failure <slug> (--evidence|--correction|--regressed "<text>") [--title "<title>" --enforcer "<kind>: <name>"] [--date <YYYY-MM-DD>]',
  '  list --skill <name>',
  '  similar --skill <name> "<failure>"',
  '  check [--skill <name>]',
  '  file-upstream --skill <name> [--failure <slug>] [--repo <owner/repo>] [--approved]',
].join('\n');

export interface Command {
  verb: Verb;
  skill: string | null;
  flags: Record<string, string>;
  approved: boolean;
  rest: string[];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_FLAGS = ['skill', 'failure', 'topic'] as const;

function badSlug(flags: Readonly<Record<string, string>>): string | null {
  for (const name of SLUG_FLAGS) {
    const value = flags[name];
    if (value !== undefined && !SLUG.test(value)) {
      return `--${name} "${value}" is not a slug: use lowercase letters, digits and single hyphens`;
    }
  }
  return null;
}

const isVerb = (word: string): word is Verb => VERBS.some((verb) => verb === word);
const isValueFlag = (name: string): boolean => VALUE_FLAGS.some((flag) => flag === name);

interface ParsedWords {
  flags: Record<string, string>;
  rest: string[];
  approved: boolean;
}

function parseWords(words: readonly string[]): ParsedWords | { error: string } {
  const parsed: ParsedWords = { flags: {}, rest: [], approved: false };
  for (let at = 0; at < words.length; at += 1) {
    const word = words[at] ?? '';
    const name = word.slice('--'.length);
    const value = words[at + 1];
    if (!word.startsWith('--')) parsed.rest.push(word);
    else if (name === 'approved') parsed.approved = true;
    else if (!isValueFlag(name)) return { error: `unknown flag ${word}` };
    else if (value === undefined) return { error: `${word} needs a value` };
    else {
      parsed.flags[name] = value;
      at += 1;
    }
  }
  return parsed;
}

function parseSafeWords(words: readonly string[]): ParsedWords | { error: string } {
  const parsed = parseWords(words);
  if ('error' in parsed) return parsed;
  const unsafe = badSlug(parsed.flags);
  return unsafe === null ? parsed : { error: unsafe };
}

export function parseCommand(argv: readonly string[]): Command | { error: string } {
  const [verb, ...words] = argv;
  if (verb === undefined) return { error: 'no verb' };
  if (!isVerb(verb)) return { error: `unknown verb "${verb}"` };
  const parsed = parseSafeWords(words);
  if ('error' in parsed) return parsed;
  const { skill = null, ...flags } = parsed.flags;
  if (skill === null && verb !== 'check') return { error: `${verb} needs --skill <name>` };
  return { verb, skill, flags, approved: parsed.approved, rest: parsed.rest };
}
