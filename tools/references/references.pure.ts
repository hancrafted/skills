import path from 'node:path';
import { parse, parseDocument } from 'yaml';

export interface RepoPin {
  readonly name: string;
  readonly url: string;
  readonly subfolder: string | undefined;
  readonly commit: string;
}

export interface CachePath {
  readonly name: string;
  readonly path: string;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;
const CACHE_PATH = /\.references\/([A-Za-z0-9._-]+)\/([^\s`'")\]>]+)/g;
const TRAILING_SLASHES = /\/+$/;
const TRAILING_PUNCTUATION = /[.,;:/]+$/;

function frontMatterOf(text: string): RegExpMatchArray {
  const match = FRONT_MATTER.exec(text);
  if (!match) throw new Error('reference index has no front matter');
  return match;
}

export function parseIndex(text: string): RepoPin[] {
  const data = parse(frontMatterOf(text)[1]) as { repos?: Record<string, Record<string, unknown>> } | null;
  return Object.entries(data?.repos ?? {}).map(([name, fields]) => {
    for (const key of ['url', 'commit']) {
      if (typeof fields?.[key] !== 'string') throw new Error(`repo ${name} has no ${key} in the front matter`);
    }
    const subfolder = fields.subfolder;
    return {
      name,
      url: fields.url as string,
      subfolder: typeof subfolder === 'string' ? subfolder.replace(TRAILING_SLASHES, '') : undefined,
      commit: fields.commit as string,
    };
  });
}

export function replaceCommits(text: string, commits: Readonly<Record<string, string>>): string {
  const match = frontMatterOf(text);
  const document = parseDocument(match[1]);
  for (const [name, commit] of Object.entries(commits)) document.setIn(['repos', name, 'commit'], commit);
  return `---\n${document.toString({ lineWidth: 0 }).trimEnd()}\n---\n${text.slice(match[0].length)}`;
}

export function indexPathsOf(text: string): CachePath[] {
  const body = text.slice(frontMatterOf(text)[0].length);
  const seen = new Map<string, CachePath>();
  for (const match of body.matchAll(CACHE_PATH)) {
    const path = match[2].replace(TRAILING_PUNCTUATION, '');
    seen.set(`${match[1]}/${path}`, { name: match[1], path });
  }
  return [...seen.values()];
}

export function topLevelChanges(before: readonly string[], after: readonly string[]) {
  return {
    added: after.filter((entry) => !before.includes(entry)),
    removed: before.filter((entry) => !after.includes(entry)),
  };
}

export const isUnder = (relativePath: string, folder: string) =>
  path.posix.normalize(relativePath).startsWith(`${folder}/`);
