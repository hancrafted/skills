import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { run } from './git.ts';
import { renderSimilar, similarTitles } from './learnings-similar.pure.ts';
import {
  countCitations,
  FAILURE_MODES_FOLDER,
  type FailureMode,
  LEARNINGS_STORE,
  type LearningsRecord,
  LEGACY_LEARNINGS_FILE,
  parseFailureMode,
  parseRecord,
  RECORDS_FOLDER,
  renderRows,
  type Store,
  storeProblems,
} from './learnings.pure.ts';
import { fail } from './project.ts';

const USAGE = 'usage: drive learnings [list | similar "<failure>" | check]';

const markdownFiles = (folder: string): string[] => {
  try {
    return readdirSync(folder)
      .filter((name) => name.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }
};

export interface LoadedStore extends Store {
  errors: string[];
}

export function loadStore(root: string): LoadedStore {
  const store = path.join(root, LEARNINGS_STORE);
  const errors: string[] = [];
  const modes: FailureMode[] = [];
  const records: LearningsRecord[] = [];
  for (const name of markdownFiles(path.join(store, FAILURE_MODES_FOLDER))) {
    const parsed = parseFailureMode(
      name.slice(0, -'.md'.length),
      readFileSync(path.join(store, FAILURE_MODES_FOLDER, name), 'utf8'),
    );
    if ('error' in parsed) errors.push(parsed.error);
    else modes.push(parsed);
  }
  for (const name of markdownFiles(path.join(store, RECORDS_FOLDER))) {
    const parsed = parseRecord(name, readFileSync(path.join(store, RECORDS_FOLDER, name), 'utf8'));
    if ('error' in parsed) errors.push(parsed.error);
    else records.push(parsed);
  }
  return { modes, records, legacyFileExists: existsSync(path.join(root, LEGACY_LEARNINGS_FILE)), errors };
}

interface Report {
  output: string;
  exit: 0 | 1;
}

const failed = (problems: readonly string[]): Report => ({
  output: problems.map((problem) => `✖ ${problem}`).join('\n'),
  exit: 1,
});

function checkReport(store: LoadedStore): Report {
  const problems = [...store.errors, ...storeProblems(store)];
  if (problems.length > 0) return failed(problems);
  return {
    output: `✔ ${LEARNINGS_STORE}: ${store.modes.length} failure modes, ${store.records.length} records`,
    exit: 0,
  };
}

function similarReport(store: LoadedStore, text: string): Report {
  const matches = similarTitles(text, store.modes);
  return {
    output: matches.length > 0 ? renderSimilar(matches) : `no failure mode shares a word with "${text}": create one`,
    exit: 0,
  };
}

function queryReport(store: LoadedStore, verb: string, rest: readonly string[]): Report {
  if (verb === 'list' && rest.length === 0)
    return { output: renderRows(countCitations(store.modes, store.records)), exit: 0 };
  if (verb === 'similar' && rest.length > 0) return similarReport(store, rest.join(' '));
  return { output: USAGE, exit: 1 };
}

export function learningsReport(root: string, argv: readonly string[]): Report {
  const [verb = 'list', ...rest] = argv;
  const store = loadStore(root);
  if (verb === 'check') return checkReport(store);
  if (store.errors.length > 0) return failed(store.errors);
  return queryReport(store, verb, rest);
}

export function runLearnings(argv: readonly string[]): void {
  const root = run('git', ['rev-parse', '--show-toplevel']).stdout.trim();
  if (root === '') fail('drive learnings runs inside a git repository');
  const { output, exit } = learningsReport(root, argv);
  if (exit === 0) console.log(output);
  else console.error(output);
  process.exit(exit);
}
